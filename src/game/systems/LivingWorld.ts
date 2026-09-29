import type { CampaignSave, EncounterDisposition, EncounterRank, WorldEncounterState, WorldIslandState } from '../state/types';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function unit(seed: number, salt: number): number {
  let x = (seed + Math.imul(salt, 0x9e3779b1)) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967295;
}
export function ensureIsland(save: CampaignSave, id: string, name: string): WorldIslandState {
  const existing = save.world.islands[id];
  if (existing) return existing;
  const seed = hash(id);
  const sizeRoll = unit(seed, 1);
  const island: WorldIslandState = {
    id, name, seed,
    size: sizeRoll < 0.35 ? 'small' : sizeRoll < 0.78 ? 'medium' : 'large',
    discovered: true,
    population: Math.round(120 + unit(seed, 2) * 4200),
    marinePresence: unit(seed, 3),
    piratePresence: unit(seed, 4),
    prosperity: unit(seed, 5),
    danger: unit(seed, 6),
    factions: [],
    activeSituations: [],
    resolvedSituations: [],
    lastSimulatedDay: save.world.day,
  };
  save.world.islands[id] = island;
  return island;
}
export function simulateIslandToDay(island: WorldIslandState, day: number): void {
  while (island.lastSimulatedDay < day) {
    island.lastSimulatedDay += 1;
    const drift = unit(island.seed, island.lastSimulatedDay) - 0.5;
    island.prosperity = Math.max(0, Math.min(1, island.prosperity + drift * 0.025));
    island.danger = Math.max(0, Math.min(1, island.danger - drift * 0.02));
  }
}
export function encounterRank(seed: number, heat: number): EncounterRank {
  const roll = unit(seed, 19) - Math.min(0.18, heat * 0.01);
  if (roll > 0.985) return 'elite';
  if (roll > 0.92) return 'officer';
  if (roll > 0.72) return 'veteran';
  return 'rookie';
}
export function createEncounter(save: CampaignSave, locationId: string, atSea: boolean, salt: string): WorldEncounterState {
  const island = save.world.islands[locationId];
  const seed = hash(`${locationId}:${save.world.day}:${salt}`);
  const marineBias = island?.marinePresence ?? 0.35;
  const pirateBias = island?.piratePresence ?? 0.35;
  const kindRoll = unit(seed, 8);
  const kind: WorldEncounterState['kind'] = kindRoll < marineBias * 0.45 ? 'marine' : kindRoll < marineBias * 0.45 + pirateBias * 0.5 ? 'pirate' : kindRoll < 0.82 ? 'merchant' : 'bounty-hunter';
  const disposition: EncounterDisposition = kind === 'merchant' ? 'neutral' : unit(seed, 10) < 0.35 ? 'hostile' : unit(seed, 11) < 0.5 ? 'wary' : 'neutral';
  const encounter: WorldEncounterState = { id: `enc-${seed}`, kind, rank: encounterRank(seed, save.world.threatHeat), disposition, locationId, atSea, persistentGroupId: null, createdDay: save.world.day, resolved: false };
  save.world.encounters.push(encounter);
  return encounter;
}
// Admirals and equivalent canon figures are deliberately excluded from random generation.
// They enter the simulation only through authored/canon presence or a sufficiently important world response.
