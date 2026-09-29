import type { CampaignSave, CrewState } from '../state/types';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface FruitCombatStats {
  range: number;
  force: number;
  staminaCost: number;
  control: number;
  cooldownMultiplier: number;
}

export interface PlayerCombatStats {
  meleeDamageBonus: number;
  moveSpeedMultiplier: number;
  staminaRecoveryBonus: number;
  dashCost: number;
}

export interface CrewCombatStats {
  damageBonus: number;
  moveSpeedMultiplier: number;
  cooldownMultiplier: number;
}

export function fruitStats(save: CampaignSave): FruitCombatStats {
  const mastery = clamp01(save.player.fruit.mastery);
  const techniques = save.player.progression.techniques;
  const widePull = techniques.includes('wide-pull') ? 0.08 : 0;
  const anchorPull = techniques.includes('anchor-pull') ? 0.12 : 0;
  const snapPull = techniques.includes('snap-pull') ? 0.08 : 0;

  return {
    range: save.player.fruit.range * (1 + mastery * 0.35 + widePull),
    force: save.player.fruit.force * (1 + mastery * 0.45 + anchorPull),
    staminaCost: Math.max(6, 12 - mastery * 4 - (snapPull ? 1 : 0)),
    control: 0.45 + mastery * 0.45 + snapPull,
    cooldownMultiplier: Math.max(0.72, 1 - mastery * 0.2 - snapPull),
  };
}

export function playerCombatStats(save: CampaignSave): PlayerCombatStats {
  const conditioning = clamp01(save.player.progression.physicalConditioning);
  const experience = Math.max(0, save.player.progression.combatExperience);
  const learned = Math.min(1, Math.sqrt(experience) / 45);

  return {
    meleeDamageBonus: Math.floor(conditioning * 6 + learned * 5),
    moveSpeedMultiplier: 1 + conditioning * 0.1 + learned * 0.04,
    staminaRecoveryBonus: conditioning * 9 + learned * 4,
    dashCost: Math.max(13, 18 - conditioning * 4 - learned),
  };
}

export function crewCombatStats(member: CrewState): CrewCombatStats {
  const specialty = clamp01(member.progression.specialty);
  const learned = Math.min(1, Math.sqrt(Math.max(0, member.progression.experience)) / 40);

  return {
    damageBonus: Math.floor(specialty * 8 + learned * 5),
    moveSpeedMultiplier: 1 + specialty * 0.08 + learned * 0.04,
    cooldownMultiplier: Math.max(0.72, 1 - specialty * 0.18 - learned * 0.1),
  };
}

export function recordFruitUse(save: CampaignSave, affected: number): void {
  const targets = Math.max(1, affected);
  const before = clamp01(save.player.fruit.mastery);
  const diminishing = 1 - before * 0.6;
  save.player.fruit.mastery = Math.min(1, before + targets * 0.0005 * diminishing);
  save.player.progression.fruitTechniquePoints += targets;

  const unlocked = save.player.progression.techniques;
  const unlock = (id: string) => {
    if (!unlocked.includes(id)) unlocked.push(id);
  };
  if (save.player.fruit.mastery >= 0.2) unlock('wide-pull');
  if (save.player.fruit.mastery >= 0.45) unlock('anchor-pull');
  if (save.player.fruit.mastery >= 0.7) unlock('snap-pull');
}

export function recordCombatExperience(save: CampaignSave, amount: number): void {
  const gained = Math.max(0, amount);
  save.player.progression.combatExperience += gained;
  save.player.progression.physicalConditioning = Math.min(
    1,
    save.player.progression.physicalConditioning + gained * 0.00035,
  );

  const experience = save.player.progression.combatExperience;
  if (experience >= 140 && !save.player.progression.techniques.includes('combat-footwork')) {
    save.player.progression.techniques.push('combat-footwork');
  }
  if (experience >= 420 && !save.player.progression.techniques.includes('measured-strikes')) {
    save.player.progression.techniques.push('measured-strikes');
  }
}

export function recordCrewExperience(member: CrewState, amount: number): void {
  const gained = Math.max(0, amount);
  member.progression.experience += gained;
  member.progression.specialty = Math.min(1, member.progression.specialty + gained * 0.00045);

  if (member.progression.experience >= 180 && !member.progression.techniques.includes('seasoned')) {
    member.progression.techniques.push('seasoned');
  }
}
