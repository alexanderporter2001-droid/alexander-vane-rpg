import type {
  CampaignSave,
  EncounterDisposition,
  EncounterIntent,
  EncounterRank,
  KnownGroupState,
  RecruitCandidateState,
  WorldEncounterState,
  WorldIslandState,
} from '../state/types';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function unit(seed: number, salt: number): number {
  let x = (seed + Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

const firstNames = ['Mira', 'Tarin', 'Kael', 'Nessa', 'Ivo', 'Lena', 'Bram', 'Celia', 'Rook', 'Tessa', 'Daro', 'Vela'] as const;
const lastNames = ['Vale', 'Quill', 'Marr', 'Rusk', 'Venn', 'Cale', 'Dane', 'Pike', 'Reed', 'Morrow', 'Hale', 'Sorn'] as const;
const islandA = ['Brine', 'Gull', 'Cinder', 'Morrow', 'Storm', 'Glass', 'Drift', 'Red', 'Wind', 'Crown', 'Hollow', 'Sun'] as const;
const islandB = ['reach', 'rock', 'haven', 'fall', 'key', 'rest', 'watch', 'shoal', 'bay', 'mere', 'point', 'cay'] as const;
const geography = ['high cliffs', 'mangrove shallows', 'black-sand coves', 'wind-cut hills', 'dense cedar forest', 'limestone caves', 'wide tidal flats', 'steep volcanic ridges'] as const;
const resources = ['timber', 'iron sand', 'medicinal herbs', 'fish', 'stone', 'fruit orchards', 'ship timber', 'salt'] as const;
const opportunities = ['dock work', 'bounty leads', 'merchant contracts', 'underground fights', 'treasure rumors', 'local investigations', 'escort work', 'ship repairs', 'recruitment leads'] as const;
const situations = ['missing-cargo', 'local-feud', 'pirate-shore-leave', 'marine-inspection', 'wreck-rumor', 'merchant-dispute', 'road-bandits', 'strange-tide'] as const;

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  return items[Math.min(items.length - 1, Math.floor(unit(seed, salt) * items.length))]!;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hydrateIsland(island: WorldIslandState): WorldIslandState {
  const seed = island.seed;
  island.region ??= 'east-blue';
  island.geography ??= [pick(geography, seed, 31), pick(geography, seed, 32)];
  island.settlements ??= island.size === 'large'
    ? [island.name + ' Harbor', 'Upper settlement', 'Outlying village']
    : island.size === 'medium'
      ? [island.name + ' Harbor', 'Inland settlement']
      : [island.name + ' Landing'];
  island.resources ??= [pick(resources, seed, 33), pick(resources, seed, 34)];
  island.opportunities ??= [pick(opportunities, seed, 35), pick(opportunities, seed, 36)];
  island.notableTraits ??= [pick(geography, seed, 37)];
  island.governmentImportance ??= clamp01(island.marinePresence * 0.55 + island.prosperity * 0.2);
  return island;
}

export function ensureGeneratedIsland(save: CampaignSave, id: string, nameHint?: string): WorldIslandState {
  const existing = save.world.islands[id];
  if (existing) return hydrateIsland(existing);

  const seed = hash(id);
  const sizeRoll = unit(seed, 1);
  const name = nameHint ?? (pick(islandA, seed, 2) + pick(islandB, seed, 3));
  const island: WorldIslandState = {
    id,
    seed,
    name,
    size: sizeRoll < 0.35 ? 'small' : sizeRoll < 0.8 ? 'medium' : 'large',
    discovered: false,
    population: Math.floor(100 + unit(seed, 4) * (sizeRoll > 0.8 ? 5200 : 2600)),
    marinePresence: unit(seed, 5),
    piratePresence: unit(seed, 6),
    prosperity: 0.18 + unit(seed, 7) * 0.72,
    danger: 0.1 + unit(seed, 8) * 0.82,
    factions: [],
    activeSituations: [pick(situations, seed, 9)],
    resolvedSituations: [],
    lastSimulatedDay: save.world.day,
  };

  if (island.marinePresence > 0.55) island.factions.push(name + ' Marine detachment');
  if (island.piratePresence > 0.45) island.factions.push('Independent pirate crews');
  island.factions.push(name + ' locals');
  save.world.islands[id] = hydrateIsland(island);
  seedRecruitCandidate(save, island);
  return island;
}

export function ensureIsland(save: CampaignSave, id: string, name: string): WorldIslandState {
  return ensureGeneratedIsland(save, id, name);
}

export function randomEncounterRank(
  seed: number,
  heat: number,
  importance = 0,
): Exclude<EncounterRank, 'admiral' | 'civilian'> {
  const pressure = Math.min(0.16, Math.max(0, heat) * 0.018 + clamp01(importance) * 0.06);
  const roll = unit(seed, 19);
  if (roll > 0.992 - pressure * 0.08) return 'elite';
  if (roll > 0.945 - pressure * 0.2) return 'officer';
  if (roll > 0.74 - pressure) return 'veteran';
  return 'rookie';
}

export function rankForEncounter(save: CampaignSave, seed: number, locationId = save.world.locationId): EncounterRank {
  const importance = save.world.islands[locationId]?.governmentImportance ?? 0;
  return randomEncounterRank(seed, save.world.threatHeat, importance);
}

function encounterIntent(
  kind: WorldEncounterState['kind'],
  disposition: EncounterDisposition,
  recognized: boolean,
  seed: number,
): EncounterIntent {
  if (disposition === 'afraid') return 'flee';
  if (kind === 'merchant') return disposition === 'hostile' ? 'flee' : 'trade';
  if (kind === 'traveler') return 'pass-by';
  if (kind === 'marine') {
    if (recognized && disposition === 'hostile') return unit(seed, 51) < 0.25 ? 'attack' : 'pursue';
    if (recognized) return 'inspect';
    return disposition === 'hostile' ? 'inspect' : 'warn';
  }
  if (kind === 'pirate') {
    if (disposition === 'friendly') return 'trade';
    if (disposition === 'neutral') return unit(seed, 52) < 0.45 ? 'negotiate' : 'pass-by';
    if (disposition === 'wary') return 'warn';
    return unit(seed, 53) < 0.22 ? 'board' : 'attack';
  }
  if (kind === 'bounty-hunter') return recognized ? (disposition === 'hostile' ? 'pursue' : 'negotiate') : 'pass-by';
  return disposition === 'hostile' ? 'attack' : 'pass-by';
}

function dispositionFor(
  save: CampaignSave,
  kind: WorldEncounterState['kind'],
  seed: number,
  recognized: boolean,
  persistentGroupId: string | null,
): EncounterDisposition {
  const known = persistentGroupId ? save.world.knownGroups[persistentGroupId] : undefined;
  if (known?.relationship !== undefined) {
    if (known.relationship >= 0.55) return 'friendly';
    if (known.relationship <= -0.6) return 'hostile';
  }

  const roll = unit(seed, 22);
  if (kind === 'merchant' || kind === 'traveler') return roll < 0.08 ? 'wary' : 'neutral';
  if (kind === 'marine') {
    const ordered = save.world.threatHeat >= 4;
    if (recognized && ordered) return 'hostile';
    if (recognized) return roll < 0.36 ? 'hostile' : 'wary';
    return roll < 0.12 ? 'wary' : 'neutral';
  }
  if (kind === 'pirate') {
    if (roll < 0.12) return 'friendly';
    if (roll < 0.53) return 'neutral';
    if (roll < 0.8) return 'wary';
    return 'hostile';
  }
  if (kind === 'bounty-hunter') return recognized ? (roll < 0.72 ? 'hostile' : 'wary') : 'neutral';
  return roll < 0.34 ? 'hostile' : roll < 0.65 ? 'wary' : 'neutral';
}

export function createEncounter(
  save: CampaignSave,
  locationId: string,
  atSea: boolean,
  salt: string | number = 0,
): WorldEncounterState {
  const island = save.world.islands[locationId];
  const seed = hash(locationId + ':' + save.world.day + ':' + salt + ':' + save.world.encounters.length);
  const marineBias = island?.marinePresence ?? 0.25;
  const pirateBias = island?.piratePresence ?? 0.32;
  const kindRoll = unit(seed, 1);
  const kind: WorldEncounterState['kind'] =
    kindRoll < marineBias * 0.4 ? 'marine'
      : kindRoll < marineBias * 0.4 + pirateBias * 0.48 ? 'pirate'
        : kindRoll < 0.76 ? 'merchant'
          : kindRoll < 0.86 ? 'traveler'
            : kindRoll < 0.95 ? 'bounty-hunter'
              : 'criminal';

  const recognizedBase = save.player.bounty >= 10_000_000 ? 0.42 : save.player.bounty >= 5_000_000 ? 0.19 : 0.08;
  const recognitionChance = clamp01(recognizedBase + save.world.threatHeat * 0.035 + (island?.marinePresence ?? 0) * 0.08);
  const recognized = unit(seed, 20) < recognitionChance;
  const persistentGroupId = null;
  const disposition = dispositionFor(save, kind, seed, recognized, persistentGroupId);
  const rank = kind === 'merchant' || kind === 'traveler'
    ? 'civilian'
    : randomEncounterRank(seed, save.world.threatHeat, island?.governmentImportance ?? 0);

  const encounter: WorldEncounterState = {
    id: 'enc-' + seed.toString(36),
    kind,
    rank,
    disposition,
    locationId,
    atSea,
    persistentGroupId,
    createdDay: save.world.day,
    resolved: false,
    intent: encounterIntent(kind, disposition, recognized, seed),
    source: 'ambient',
    recognizedAlexander: recognized,
    strength: 0.25 + unit(seed, 27) * 0.75,
    canonCharacterId: null,
  };
  save.world.encounters.push(encounter);
  return encounter;
}

export function createMajorResponse(
  save: CampaignSave,
  locationId: string,
  rank: 'officer' | 'elite' | 'admiral',
  canonCharacterId: string,
): WorldEncounterState {
  if (!canonCharacterId.trim()) throw new Error('Major canon response requires an explicit timeline-valid character id.');
  const seed = hash('response:' + locationId + ':' + save.world.day + ':' + canonCharacterId);
  const encounter: WorldEncounterState = {
    id: 'response-' + seed.toString(36),
    kind: 'marine',
    rank,
    disposition: 'hostile',
    locationId,
    atSea: true,
    persistentGroupId: 'world-government',
    createdDay: save.world.day,
    resolved: false,
    intent: 'pursue',
    source: 'escalation',
    recognizedAlexander: true,
    strength: rank === 'admiral' ? 1 : rank === 'elite' ? 0.88 : 0.7,
    canonCharacterId,
  };
  save.world.encounters.push(encounter);
  return encounter;
}

export function ensureKnownGroup(save: CampaignSave, group: KnownGroupState): KnownGroupState {
  const existing = save.world.knownGroups[group.id];
  if (existing) return existing;
  save.world.knownGroups[group.id] = group;
  return group;
}

export function seedRecruitCandidate(save: CampaignSave, island: WorldIslandState): RecruitCandidateState | null {
  if (Object.values(save.world.recruitCandidates).some((candidate) => candidate.locationId === island.id)) return null;
  const seed = island.seed;
  if (unit(seed, 40) > 0.52) return null;

  const roles = ['Doctor', 'Cook', 'Lookout', 'Shipwright', 'Marksman', 'Musician', 'Deck fighter'] as const;
  const role = pick(roles, seed, 43);
  const candidate: RecruitCandidateState = {
    id: 'recruit-' + seed.toString(36),
    name: pick(firstNames, seed, 41) + ' ' + pick(lastNames, seed, 42),
    role,
    locationId: island.id,
    available: true,
    trust: 0,
    requiredTrust: 0.45 + unit(seed, 44) * 0.3,
    reasonToJoin: 'Has a personal reason to leave this island, but will not join a stranger without cause.',
    equipmentTags: ['light-armor', 'tools'],
    capabilities: [role.toLowerCase().replace(/\s+/g, '-')],
    personality: 'Independent and cautious about committing to a crew.',
    goals: ['Resolve the situation keeping them here', 'Find a reason to trust a captain'],
    fightingStyle: role === 'Deck fighter' ? 'close-range brawler' : 'self-defense and role-specific support',
    visualArchetype: role === 'Deck fighter' ? 'crew-fighter' : 'crew-specialist',
    specialty: 0.1 + unit(seed, 45) * 0.18,
  };
  save.world.recruitCandidates[candidate.id] = candidate;
  return candidate;
}

export function simulateWorld(save: CampaignSave): void {
  let elapsedWorldDays = 0;
  for (const island of Object.values(save.world.islands)) {
    hydrateIsland(island);
    while (island.lastSimulatedDay < save.world.day) {
      island.lastSimulatedDay += 1;
      elapsedWorldDays = Math.max(elapsedWorldDays, 1);
      const drift = unit(island.seed, island.lastSimulatedDay);
      island.prosperity = clamp01(island.prosperity + (drift - 0.5) * 0.025);
      island.danger = clamp01(island.danger + (0.5 - drift) * 0.022);
      island.piratePresence = clamp01(island.piratePresence + (unit(island.seed, 200 + island.lastSimulatedDay) - 0.5) * 0.018);
      island.marinePresence = clamp01(island.marinePresence + (unit(island.seed, 400 + island.lastSimulatedDay) - 0.5) * 0.012);

      if (unit(island.seed, 600 + island.lastSimulatedDay) > 0.92 && island.activeSituations.length) {
        const resolved = island.activeSituations.shift();
        if (resolved) island.resolvedSituations.push(resolved);
        island.activeSituations.push(pick(situations, island.seed, 700 + island.lastSimulatedDay));
      }
    }
  }

  if (elapsedWorldDays > 0) save.world.threatHeat = Math.max(0, save.world.threatHeat - 0.08);
}
