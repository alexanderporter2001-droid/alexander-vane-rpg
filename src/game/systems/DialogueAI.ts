import type { CampaignSave } from '../state/types';
import { resolveDialogueIntent, type DialogueSpeakerId } from './DialogueIntent';

export interface DialogueTurn {
  role: 'player' | 'npc';
  text: string;
}

export interface DialogueAIResult {
  reply: string;
  source: 'ai' | 'local';
  model?: string;
  action?: {
    type: 'none' | 'set_course';
    target: 'none' | 'harrow' | 'gullrock';
  };
}

const DIALOGUE_ENDPOINT = 'https://alexander-vane-rpg.vercel.app/api/dialogue';
const MEMORY_PREFIX = 'dialogueMemory-';

function memoriesFor(save: CampaignSave, speaker: DialogueSpeakerId): string[] {
  const raw = save.world.flags[`${MEMORY_PREFIX}${speaker}`];
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(-6);
  } catch {
    return [];
  }
}

function saveMemory(save: CampaignSave, speaker: DialogueSpeakerId, memory: string): void {
  const clean = memory.trim().slice(0, 180);
  if (!clean) return;

  const memories = memoriesFor(save, speaker);
  if (!memories.some((entry) => entry.toLowerCase() === clean.toLowerCase())) {
    memories.push(clean);
  }
  save.world.flags[`${MEMORY_PREFIX}${speaker}`] = JSON.stringify(memories.slice(-6));
}

function destination(save: CampaignSave): string {
  return typeof save.world.flags.shipDestination === 'string'
    ? save.world.flags.shipDestination
    : '';
}

function buildContext(speaker: DialogueSpeakerId, save: CampaignSave) {
  const crewSpeaker = speaker === 'sera' || speaker === 'rowan';
  const member = crewSpeaker ? save.crew.find((candidate) => candidate.id === speaker) : undefined;

  return {
    location: save.world.locationId,
    day: save.world.day,
    minuteOfDay: save.world.minuteOfDay,
    destination: destination(save),
    ship: {
      name: save.ship.name,
      hull: save.ship.hull,
      maxHull: save.ship.maxHull,
      supplies: save.ship.supplies,
    },
    speakerState: member ? {
      hp: member.hp,
      maxHp: member.maxHp,
      loyalty: member.loyalty,
      morale: member.morale,
    } : null,
    crewStatus: crewSpeaker
      ? save.crew.map((crew) => ({
          name: crew.name,
          role: crew.role,
          hp: crew.hp,
          maxHp: crew.maxHp,
        }))
      : [],
    knownEvents: crewSpeaker
      ? save.journal.filter((entry) => entry.known).slice(-8).map((entry) => `${entry.title}: ${entry.body}`)
      : [],
    memories: memoriesFor(save, speaker),
    fruitKnownToCrew: crewSpeaker && save.player.fruit.eaten,
  };
}

export async function resolveDialogueAI(
  speaker: DialogueSpeakerId,
  message: string,
  save: CampaignSave,
  history: DialogueTurn[] = [],
): Promise<DialogueAIResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await fetch(DIALOGUE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speakerId: speaker,
        message,
        history: history.slice(-10),
        context: buildContext(speaker, save),
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({})) as {
      reply?: string;
      memory?: string;
      model?: string;
      action?: {
        type?: 'none' | 'set_course';
        target?: 'none' | 'harrow' | 'gullrock';
      };
      code?: string;
    };

    if (!response.ok) {
      throw new Error(data.code || `http_${response.status}`);
    }

    const reply = data.reply?.trim();
    if (!reply) throw new Error('Dialogue API returned no reply');

    if (data.memory) saveMemory(save, speaker, data.memory);

    const action = data.action?.type === 'set_course' && (data.action.target === 'harrow' || data.action.target === 'gullrock')
      ? { type: 'set_course' as const, target: data.action.target }
      : { type: 'none' as const, target: 'none' as const };

    return {
      reply,
      source: 'ai',
      model: data.model,
      action,
    };
  } catch (error) {
    console.warn('AI dialogue unavailable; using local intent fallback.', error);
    const local = resolveDialogueIntent(speaker, message, save);
    const diagnostic = error instanceof Error
      ? error.message.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)
      : 'connection_error';
    return {
      reply: `${local.reply}\n\n[AI unavailable · local fallback · ${diagnostic || 'connection_error'}]`,
      source: 'local',
      action: { type: 'none', target: 'none' },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
