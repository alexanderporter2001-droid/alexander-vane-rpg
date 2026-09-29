import type { CampaignSave, CrewState } from '../state/types';

export interface ConversationParticipant {
  id: string;
  name: string;
  role: string;
  notes: string[];
  capabilities: string[];
  relevance: string;
}

function scoreParticipant(member: CrewState, message: string): { score: number; reason: string } {
  const text = message.toLowerCase();
  const role = member.role.toLowerCase();
  const caps = member.capabilities.map((capability) => capability.toLowerCase());
  let score = 0;
  const reasons: string[] = [];

  const add = (condition: boolean, value: number, reason: string) => {
    if (!condition) return;
    score += value;
    reasons.push(reason);
  };

  add(/\b(route|course|island|weather|current|wind|sail|sea|helm|map)\b/.test(text) && caps.some((cap) => cap.includes('navigat') || cap === 'helm'), 5, 'navigation expertise');
  add(/\b(hurt|injury|medicine|doctor|heal|blood|wound|health)\b/.test(text) && caps.some((cap) => cap.includes('medic') || cap.includes('triage') || cap.includes('medicine')), 5, 'medical expertise');
  add(/\b(fight|enemy|attack|defend|strong|weapon|combat|duel)\b/.test(text) && (caps.some((cap) => cap.includes('combat')) || role.includes('fighter')), 4, 'combat expertise');
  add(/\b(plan|strategy|crew|captain|trust|loyal|betray|risk|decision)\b/.test(text), 2, 'crew-level decision');
  add(/\b(price|buy|sell|deal|merchant|supplies|berries)\b/.test(text) && caps.some((cap) => cap.includes('trade') || cap.includes('cook') || cap.includes('quarter')), 3, 'relevant specialty');
  add(/\b(insult|threat|kill|coward|weak)\b/.test(text), 2, 'direct social threat');

  return { score, reason: reasons.join(', ') };
}

export function selectConversationParticipants(
  save: CampaignSave,
  primarySpeakerId: string,
  message: string,
  nearbyCrewIds: string[],
): ConversationParticipant[] {
  const nearby = new Set(nearbyCrewIds);
  return save.crew
    .filter((member) => member.id !== primarySpeakerId && member.hp > 0 && nearby.has(member.id))
    .map((member) => ({ member, ...scoreParticipant(member, message) }))
    .filter((entry) => entry.score >= 3)
    .sort((a, b) => b.score - a.score || a.member.id.localeCompare(b.member.id))
    .slice(0, 2)
    .map(({ member, reason }) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      notes: member.notes.slice(0, 5),
      capabilities: member.capabilities.slice(0, 6),
      relevance: reason,
    }));
}
