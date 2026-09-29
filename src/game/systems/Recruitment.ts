import { emptyEquipmentLoadout } from './Equipment';
import type { CampaignSave, CrewState, RecruitCandidateState } from '../state/types';

export function registerRecruitCandidate(save: CampaignSave, candidate: RecruitCandidateState): void {
  if (save.crew.some((member) => member.id === candidate.id)) return;
  save.world.recruitCandidates[candidate.id] = candidate;
}
export function canRecruit(save: CampaignSave, id: string): { ok: boolean; reason: string } {
  if (save.crew.length >= 15) return { ok: false, reason: 'The Wayward Gull crew is already at the deep-simulation cap.' };
  const candidate = save.world.recruitCandidates[id];
  if (!candidate || !candidate.available) return { ok: false, reason: 'They are not currently available to join.' };
  if (candidate.trust < candidate.requiredTrust) return { ok: false, reason: 'They do not trust Alexander enough to join.' };
  return { ok: true, reason: candidate.reasonToJoin };
}
export function recruit(save: CampaignSave, id: string): CrewState | null {
  const check = canRecruit(save, id);
  if (!check.ok) return null;
  const candidate = save.world.recruitCandidates[id];
  if (!candidate) return null;
  const member: CrewState = {
    id: candidate.id, name: candidate.name, role: candidate.role,
    hp: 90, maxHp: 90, position: { ...save.player.position },
    loyalty: Math.max(0.35, candidate.trust), morale: 0.65,
    notes: [candidate.reasonToJoin],
    equipmentTags: [...candidate.equipmentTags],
    capabilities: [...candidate.capabilities],
    equipment: emptyEquipmentLoadout(),
    progression: { experience: 0, specialty: 0.08, techniques: [] },
    recruitedDay: save.world.day,
  };
  save.crew.push(member);
  candidate.available = false;
  return member;
}
