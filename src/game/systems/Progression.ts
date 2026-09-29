import type { CampaignSave, CrewState } from '../state/types';

export function fruitStats(save: CampaignSave): { range: number; force: number; staminaCost: number } {
  const mastery = Math.max(0, Math.min(1, save.player.fruit.mastery));
  return {
    range: save.player.fruit.range * (1 + mastery * 0.35),
    force: save.player.fruit.force * (1 + mastery * 0.45),
    staminaCost: Math.max(7, 12 - mastery * 4),
  };
}

export function recordFruitUse(save: CampaignSave, affected: number): void {
  const gain = Math.max(1, affected) * 0.0005;
  const before = save.player.fruit.mastery;
  save.player.fruit.mastery = Math.min(1, before + gain);
  save.player.progression.fruitTechniquePoints += Math.max(1, affected);
  if (before < 0.2 && save.player.fruit.mastery >= 0.2 && !save.player.progression.techniques.includes('wide-pull')) {
    save.player.progression.techniques.push('wide-pull');
  }
}

export function recordCombatExperience(save: CampaignSave, amount: number): void {
  save.player.progression.combatExperience += Math.max(0, amount);
  save.player.progression.physicalConditioning = Math.min(1, save.player.progression.physicalConditioning + Math.max(0, amount) * 0.00004);
}

export function recordCrewExperience(member: CrewState, amount: number): void {
  member.progression.experience += Math.max(0, amount);
  member.progression.specialty = Math.min(1, member.progression.specialty + Math.max(0, amount) * 0.00005);
}
