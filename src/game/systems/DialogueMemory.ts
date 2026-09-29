import type { CampaignSave } from '../state/types';
import type { DialogueSpeakerId } from './DialogueIntent';

export type DialogueMemoryImportance = 'minor' | 'notable' | 'core';
export type DialogueKnowledgeId =
  | 'gullrock-voss-rumor'
  | 'gullrock-marine-patrol'
  | 'gullrock-north-road'
  | 'gullrock-east-wind';

interface DialogueMemoryRecord {
  text: string;
  importance: DialogueMemoryImportance;
  day: number;
}

const MEMORY_PREFIX = 'dialogueMemory-';
const IMPRESSION_PREFIX = 'dialogueImpression-';
const TURN_PREFIX = 'dialogueTurns-';

function parseMemories(raw: unknown): DialogueMemoryRecord[] {
  if (typeof raw !== 'string') return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const records: DialogueMemoryRecord[] = [];
    for (const entry of parsed) {
      if (typeof entry === 'string') {
        const text = entry.trim().slice(0, 180);
        if (text) records.push({ text, importance: 'notable', day: 1 });
        continue;
      }

      if (!entry || typeof entry !== 'object') continue;
      const source = entry as Record<string, unknown>;
      const text = typeof source.text === 'string' ? source.text.trim().slice(0, 180) : '';
      const importance = source.importance === 'core' || source.importance === 'notable' || source.importance === 'minor'
        ? source.importance
        : 'notable';
      const day = typeof source.day === 'number' && Number.isFinite(source.day)
        ? Math.max(1, Math.floor(source.day))
        : 1;
      if (text) records.push({ text, importance, day });
    }
    return records;
  } catch {
    return [];
  }
}

function trimMemories(records: DialogueMemoryRecord[]): DialogueMemoryRecord[] {
  if (records.length <= 12) return records;

  const copy = [...records];
  while (copy.length > 12) {
    const minor = copy.findIndex((entry) => entry.importance === 'minor');
    if (minor >= 0) {
      copy.splice(minor, 1);
      continue;
    }

    const notable = copy.findIndex((entry) => entry.importance === 'notable');
    if (notable >= 0) {
      copy.splice(notable, 1);
      continue;
    }

    copy.shift();
  }
  return copy;
}

function searchTerms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length >= 4),
  );
}

export function dialogueMemories(
  save: CampaignSave,
  speaker: DialogueSpeakerId,
  query = '',
  limit = 5,
): string[] {
  const queryTerms = searchTerms(query);
  const records = parseMemories(save.world.flags[`${MEMORY_PREFIX}${speaker}`]);

  return records
    .map((entry, index) => {
      const entryTerms = searchTerms(entry.text);
      let overlap = 0;
      for (const term of queryTerms) {
        if (entryTerms.has(term)) overlap += 1;
      }

      const importanceScore = entry.importance === 'core' ? 8 : entry.importance === 'notable' ? 3 : 0;
      const recencyScore = index / Math.max(1, records.length);
      return { entry, score: importanceScore + overlap * 4 + recencyScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => `Day ${entry.day} · ${entry.importance}: ${entry.text}`);
}

export function saveDialogueMemory(
  save: CampaignSave,
  speaker: DialogueSpeakerId,
  text: string,
  importance: DialogueMemoryImportance,
): void {
  const clean = text.trim().slice(0, 180);
  if (!clean) return;

  const key = `${MEMORY_PREFIX}${speaker}`;
  const records = parseMemories(save.world.flags[key]);
  const duplicate = records.some((entry) => entry.text.toLowerCase() === clean.toLowerCase());
  if (!duplicate) {
    records.push({ text: clean, importance, day: save.world.day });
  }
  save.world.flags[key] = JSON.stringify(trimMemories(records));
}

export function dialogueImpression(save: CampaignSave, speaker: DialogueSpeakerId): string {
  const raw = save.world.flags[`${IMPRESSION_PREFIX}${speaker}`];
  return typeof raw === 'string' ? raw.slice(0, 260) : '';
}

export function saveDialogueImpression(
  save: CampaignSave,
  speaker: DialogueSpeakerId,
  impression: string,
): void {
  const clean = impression.trim().slice(0, 260);
  if (!clean) return;
  save.world.flags[`${IMPRESSION_PREFIX}${speaker}`] = clean;
}

export function dialogueTurnCount(save: CampaignSave, speaker: DialogueSpeakerId): number {
  const raw = save.world.flags[`${TURN_PREFIX}${speaker}`];
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export function recordDialogueTurn(save: CampaignSave, speaker: DialogueSpeakerId): void {
  save.world.flags[`${TURN_PREFIX}${speaker}`] = dialogueTurnCount(save, speaker) + 1;
}

function addJournalEntry(
  save: CampaignSave,
  id: string,
  title: string,
  body: string,
): void {
  if (save.journal.some((entry) => entry.id === id)) return;
  save.journal.push({ id, title, body, known: true });
}

export function applyDialogueKnowledge(save: CampaignSave, knowledge: DialogueKnowledgeId): boolean {
  if (knowledge === 'gullrock-voss-rumor') {
    const alreadyKnown = save.world.flags.gullrockVossRumorKnown === true;
    save.world.flags.gullrockVossRumorKnown = true;
    addJournalEntry(
      save,
      'gullrock-voss-rumor',
      'Bounty Hunters Asking About Voss',
      'At Gullrock, you learned that bounty hunters have been asking about Derrick “Iron Nail” Voss. The rumor carried Voss’s face, not yours.',
    );
    return !alreadyKnown;
  }

  if (knowledge === 'gullrock-marine-patrol') {
    const alreadyKnown = save.world.flags.gullrockMarinePatrolKnown === true;
    save.world.flags.gullrockMarinePatrolKnown = true;
    addJournalEntry(
      save,
      'gullrock-marine-patrol',
      'Gullrock Marine Pattern',
      'The outer quay gets irregular Marine inspections, with midday being the most common time.',
    );
    return !alreadyKnown;
  }

  if (knowledge === 'gullrock-north-road') {
    const alreadyKnown = save.world.flags.gullrockNorthRoadRumorKnown === true;
    save.world.flags.gullrockNorthRoadRumorKnown = true;
    addJournalEntry(
      save,
      'gullrock-north-road',
      'North Road Trouble',
      'People in Gullrock are talking about thieves working the north road outside the port.',
    );
    return !alreadyKnown;
  }

  const alreadyKnown = save.world.flags.gullrockEastWindKnown === true;
  save.world.flags.gullrockEastWindKnown = true;
  addJournalEntry(
    save,
    'gullrock-east-wind',
    'Wind East of Gullrock',
    'After sunset, the wind east of Gullrock strengthens from the north and can push small ships south.',
  );
  return !alreadyKnown;
}
