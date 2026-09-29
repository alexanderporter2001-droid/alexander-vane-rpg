import type { CampaignSave } from '../state/types';
import { resolveDialogueIntent, type DialogueSpeakerId } from './DialogueIntent';
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
    sailingDelegated: save.world.flags.sailingDelegated !== false,
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
      ? save.journal.filter((entry) => entry.known).slice(-10).map((entry) => `${entry.title}: ${entry.body}`)
      : [],
    knowledgeState: {
      vossRumor: save.world.flags.gullrockVossRumorKnown === true,
      marinePatrol: save.world.flags.gullrockMarinePatrolKnown === true,
      northRoad: save.world.flags.gullrockNorthRoadRumorKnown === true,
      eastWind: save.world.flags.gullrockEastWindKnown === true,
    },
    memories: dialogueMemories(save, speaker),
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
): Promise<DialogueAIResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 18_000);
  recordDialogueTurn(save, speaker);

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
    return {
      reply: `${local.reply}\n\n[AI unavailable · local fallback · ${diagnostic || 'connection_error'}]`,
      source: 'local',
      action: { type: 'none', target: 'none' },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
