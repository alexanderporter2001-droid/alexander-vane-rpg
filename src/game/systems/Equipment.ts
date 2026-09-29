import type { CampaignSave, EquipmentLoadout, EquipmentSlot } from '../state/types';

export interface EquipmentEffects {
  meleeDamageBonus: number;
  damageReduction: number;
  seaAwarenessBonus: number;
}

export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  price: number;
  description: string;
  compatibleTags: string[];
  effects: Partial<EquipmentEffects>;
}

export const EQUIPMENT: Record<string, EquipmentDefinition> = {
  'balanced-cutlass': {
    id: 'balanced-cutlass',
    name: 'Balanced Cutlass',
    slot: 'weapon',
    price: 9_500,
    description: 'A dependable coastal blade with a better balance than dockside scrap.',
    compatibleTags: ['swords'],
    effects: { meleeDamageBonus: 4 },
  },
  'reinforced-chain-wraps': {
    id: 'reinforced-chain-wraps',
    name: 'Reinforced Chain Wraps',
    slot: 'weapon',
    price: 8_400,
    description: 'Leather-and-steel hand wraps built to keep chain weapons from tearing up the user.',
    compatibleTags: ['chain-weapons'],
    effects: { meleeDamageBonus: 5 },
  },
  'padded-deck-guard': {
    id: 'padded-deck-guard',
    name: 'Padded Deck Guard',
    slot: 'armor',
    price: 6_000,
    description: 'Flexible layered protection made for people who still need to move quickly on a wet deck.',
    compatibleTags: ['light-armor', 'medium-armor'],
    effects: { damageReduction: 2 },
  },
  'weatherproof-coat': {
    id: 'weatherproof-coat',
    name: 'Weatherproof Longcoat',
    slot: 'armor',
    price: 4_800,
    description: 'A reinforced longcoat that keeps spray out and softens minor impacts.',
    compatibleTags: ['light-armor', 'medium-armor'],
    effects: { damageReduction: 1 },
  },
  'brass-spyglass': {
    id: 'brass-spyglass',
    name: 'Brass Navigator Spyglass',
    slot: 'tool',
    price: 6_500,
    description: 'Clear coastal glass that gives an experienced navigator more warning before a harbor or hazard.',
    compatibleTags: ['navigator'],
    effects: { seaAwarenessBonus: 90 },
  },
};

export const GULLROCK_GEAR_STOCK = [
  'balanced-cutlass',
  'reinforced-chain-wraps',
  'padded-deck-guard',
  'weatherproof-coat',
  'brass-spyglass',
] as const;

export function emptyEquipmentLoadout(): EquipmentLoadout {
  return { weapon: null, armor: null, tool: null, accessory: null };
}

export function equipmentDefinition(id: string | null | undefined): EquipmentDefinition | null {
  if (!id) return null;
  return EQUIPMENT[id] ?? null;
}

export function isCompatible(definition: EquipmentDefinition, tags: string[]): boolean {
  if (definition.compatibleTags.length === 0) return true;
  return definition.compatibleTags.some((tag) => tags.includes(tag));
}

export function equippedEffects(loadout: EquipmentLoadout): EquipmentEffects {
  const total: EquipmentEffects = {
    meleeDamageBonus: 0,
    damageReduction: 0,
      seaAwarenessBonus: 0,
  };

  for (const itemId of Object.values(loadout)) {
    const item = equipmentDefinition(itemId);
    if (!item) continue;
    total.meleeDamageBonus += item.effects.meleeDamageBonus ?? 0;
    total.damageReduction += item.effects.damageReduction ?? 0;
    total.seaAwarenessBonus += item.effects.seaAwarenessBonus ?? 0;
  }

  return total;
}

export function equippedCount(save: CampaignSave, itemId: string): number {
  let count = Object.values(save.player.equipment).filter((id) => id === itemId).length;
  for (const member of save.crew) {
    count += Object.values(member.equipment).filter((id) => id === itemId).length;
  }
  return count;
}

export function availableEquipmentCount(save: CampaignSave, itemId: string): number {
  return Math.max(0, (save.equipmentInventory[itemId] ?? 0) - equippedCount(save, itemId));
}

export function equipItem(
  save: CampaignSave,
  wearerId: 'alexander' | string,
  itemId: string,
): { ok: true; replaced: string | null } | { ok: false; reason: string } {
  const definition = EQUIPMENT[itemId];
  if (!definition) return { ok: false, reason: 'Unknown equipment.' };
  if (availableEquipmentCount(save, itemId) <= 0) return { ok: false, reason: 'No unequipped copy is available.' };

  if (wearerId === 'alexander') {
    if (!isCompatible(definition, save.player.equipmentTags)) {
      return { ok: false, reason: 'Alexander cannot use that item.' };
    }
    const replaced = save.player.equipment[definition.slot];
    save.player.equipment[definition.slot] = itemId;
    return { ok: true, replaced };
  }

  const member = save.crew.find((candidate) => candidate.id === wearerId);
  if (!member) return { ok: false, reason: 'Crew member not found.' };
  if (!isCompatible(definition, member.equipmentTags)) {
    return { ok: false, reason: `${member.name} is not compatible with that item.` };
  }

  const replaced = member.equipment[definition.slot];
  member.equipment[definition.slot] = itemId;
  return { ok: true, replaced };
}

export function unequipSlot(
  save: CampaignSave,
  wearerId: 'alexander' | string,
  slot: EquipmentSlot,
): string | null {
  if (wearerId === 'alexander') {
    const previous = save.player.equipment[slot];
    save.player.equipment[slot] = null;
    return previous;
  }

  const member = save.crew.find((candidate) => candidate.id === wearerId);
  if (!member) return null;
  const previous = member.equipment[slot];
  member.equipment[slot] = null;
  return previous;
}
