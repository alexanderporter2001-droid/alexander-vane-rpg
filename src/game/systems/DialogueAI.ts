import type { CampaignSave } from '../state/types';
import { resolveDialogueIntent, type DialogueSpeakerId } from './DialogueIntent';
import { selectConversationParticipants } from './ConversationContext';
import {
  applyDialogueKnowledge,
  dialogueImpression,
  dialogueMemories,
  dialogueTurnCount,
  recordDialogueTurn,
  saveDialogueImpression,
  saveDialogueMemory,
  type DialogueKnowledgeId,
  type DialogueMemoryImportance,
} from './DialogueMemory';

export interface DialogueTurn {
  role: 'player' | 'npc';
  text: string;
}

export type DialogueAction =
  | { type: 'none'; target: 'none' }
  | { type: 'set_course'; target: 'harrow' | 'gullrock' }
  | { type: 'set_helm'; target: 'sera' | 'alexander' }
  | { type: 'learn_fact'; target: DialogueKnowledgeId };

export interface DialogueAIResult {
  reply: string;
  source: 'ai' | 'local';
  model?: string;
  action: DialogueAction;
  learnedFact?: DialogueKnowledgeId;
}

const DIALOGUE_ENDPOINT = 'https://alexander-vane-rpg.vercel.app/api/dialogue';

function zeroCostRoutine(
  speaker: DialogueSpeakerId,
  message: string,
): DialogueAIResult | null {
  if (speaker !== 'sera') return null;
  const text = message.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();

  const mentionsCourse = /\b(course|route|destination|head|sail|go)\b/.test(text);
  const clearOrder = /\b(set|change|plot|take us|head|sail|go)\b/.test(text);

  if (mentionsCourse && clearOrder && /\bharrow\b/.test(text)) {
    return {
      reply: '“Harrow. Got it. I’ll set the course.”',
      source: 'local',
      action: { type: 'set_course', target: 'harrow' },
    };
  }

  if (mentionsCourse && clearOrder && /\bgullrock\b/.test(text)) {
    return {
      reply: '“Gullrock. I’ll put us on that course.”',
      source: 'local',
      action: { type: 'set_course', target: 'gullrock' },
    };
  }

  const helmMentioned = /\b(helm|wheel|steer|steering)\b/.test(text);
  if (helmMentioned && /\b(you take|take the|keep the|handle the|stay on)\b/.test(text)) {
    return {
      reply: '“I’ve got the helm.”',
      source: 'local',
      action: { type: 'set_helm', target: 'sera' },
    };
  }

  if (helmMentioned && /\b(i'll take|i will take|let me take|i'm taking|i am taking)\b/.test(text)) {
    return {
      reply: '“All yours.”',
      source: 'local',
      action: { type: 'set_helm', target: 'alexander' },
    };
  }

  return null;
}

function destination(save: CampaignSave): string {
  return typeof save.world.flags.shipDestination === 'string'
    ? save.world.flags.shipDestination
    : '';
}

function relevantJournalEvents(save: CampaignSave, message: string, limit = 4): string[] {
  const terms = new Set(
    message
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length >= 4),
  );

  return save.journal
    .filter((entry) => entry.known)
    .map((entry, index) => {
      const text = `${entry.title} ${entry.body}`.toLowerCase();
      let overlap = 0;
      for (const term of terms) {
        if (text.includes(term)) overlap += 1;
      }
      return {
        text: `${entry.title}: ${entry.body}`,
        score: overlap * 4 + index / Math.max(1, save.journal.length),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.text);
}

function buildContext(speaker: DialogueSpeakerId, save: CampaignSave, message: string, nearbyCrewIds: string[]) {
  const member = save.crew.find((candidate) => candidate.id === speaker);
  const crewSpeaker = Boolean(member);

  return {
    location: save.world.locationId,
    day: save.world.day,
    minuteOfDay: save.world.minuteOfDay,
    destination: destination(save),
    sailingDelegated: save.world.flags.sailingDelegated !== false,
    ship: {
      name: save.ship.name,
      hull: save.ship.hull,
      maxHull: save.ship.maxHull,
      supplies: save.ship.supplies,
    },
    crewIdentity: member ? {
      id: member.id,
      name: member.name,
      role: member.role,
      notes: member.notes.slice(0, 8),
      capabilities: member.capabilities.slice(0, 8),
    } : null,
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
    conversationParticipants: selectConversationParticipants(save, speaker, message, nearbyCrewIds),
    knownEvents: crewSpeaker ? relevantJournalEvents(save, message, 4) : [],
    knowledgeState: {
      vossRumor: save.world.flags.gullrockVossRumorKnown === true,
      marinePatrol: save.world.flags.gullrockMarinePatrolKnown === true,
      northRoad: save.world.flags.gullrockNorthRoadRumorKnown === true,
      eastWind: save.world.flags.gullrockEastWindKnown === true,
    },
    memories: dialogueMemories(save, speaker, message, 5),
    priorImpression: dialogueImpression(save, speaker),
    interactionCount: dialogueTurnCount(save, speaker),
    fruitKnownToCrew: crewSpeaker && save.player.fruit.eaten,
  };
}

function parseAction(data: {
  action?: {
    type?: 'none' | 'set_course' | 'set_helm' | 'learn_fact';
    target?: string;
  };
}): DialogueAction {
  const action = data.action;

  if (action?.type === 'set_course' && (action.target === 'harrow' || action.target === 'gullrock')) {
    return { type: 'set_course', target: action.target };
  }

  if (action?.type === 'set_helm' && (action.target === 'sera' || action.target === 'alexander')) {
    return { type: 'set_helm', target: action.target };
  }

  if (
    action?.type === 'learn_fact' &&
    (
      action.target === 'gullrock-voss-rumor' ||
      action.target === 'gullrock-marine-patrol' ||
      action.target === 'gullrock-north-road' ||
      action.target === 'gullrock-east-wind'
    )
  ) {
    return { type: 'learn_fact', target: action.target };
  }

  return { type: 'none', target: 'none' };
}

export async function resolveDialogueAI(
  speaker: DialogueSpeakerId,
  message: string,
  save: CampaignSave,
  history: DialogueTurn[] = [],
  nearbyCrewIds: string[] = [],
): Promise<DialogueAIResult> {
  recordDialogueTurn(save, speaker);

  const routine = zeroCostRoutine(speaker, message);
  if (routine) return routine;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await fetch(DIALOGUE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speakerId: speaker,
        message,
        history: history.slice(-6),
        context: buildContext(speaker, save, message, nearbyCrewIds),
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({})) as {
      reply?: string;
      memory?: string;
      memoryImportance?: DialogueMemoryImportance;
      impression?: string;
      model?: string;
      action?: {
        type?: 'none' | 'set_course' | 'set_helm' | 'learn_fact';
        target?: string;
      };
      code?: string;
    };

    if (!response.ok) {
      throw new Error(data.code || `http_${response.status}`);
    }

    const reply = data.reply?.trim();
    if (!reply) throw new Error('Dialogue API returned no reply');

    if (data.memory) {
      const importance: DialogueMemoryImportance =
        data.memoryImportance === 'core' || data.memoryImportance === 'minor'
          ? data.memoryImportance
          : 'notable';
      saveDialogueMemory(save, speaker, data.memory, importance);
    }

    if (data.impression) {
      saveDialogueImpression(save, speaker, data.impression);
    }

    const action = parseAction(data);
    let learnedFact: DialogueKnowledgeId | undefined;
    if (action.type === 'learn_fact') {
      applyDialogueKnowledge(save, action.target);
      learnedFact = action.target;
    }

    return {
      reply,
      source: 'ai',
      model: data.model,
      action,
      learnedFact,
    };
  } catch (error) {
    console.warn('AI dialogue unavailable; using local intent fallback.', error);
    const local = resolveDialogueIntent(speaker, message, save);
    const diagnostic = error instanceof Error
      ? error.message.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)
      : 'connection_error';

    const statusLine = diagnostic === 'credits_exhausted'
      ? '[AI CREDITS EMPTY — local dialogue fallback active]'
      : diagnostic === 'api_key_invalid'
        ? '[AI KEY INVALID/EXPIRED — local dialogue fallback active]'
        : `[AI unavailable · local fallback · ${diagnostic || 'connection_error'}]`;

    return {
      reply: `${local.reply}\n\n${statusLine}`,
      source: 'local',
      action: { type: 'none', target: 'none' },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
