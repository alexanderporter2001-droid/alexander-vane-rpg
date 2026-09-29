import { createDefaultCampaign, GAME_VERSION, SAVE_VERSION } from './defaultCampaign';
import { emptyEquipmentLoadout } from '../systems/Equipment';
import type { CampaignSave, CrewState, EquipmentLoadout } from './types';

const KEY = 'alexander_vane_rpg_save';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizedLoadout(raw: unknown): EquipmentLoadout {
  const source = isObject(raw) ? raw : {};
  const clean = (value: unknown) => typeof value === 'string' ? value : null;
  return {
    weapon: clean(source.weapon),
    armor: clean(source.armor),
    tool: clean(source.tool),
    accessory: clean(source.accessory),
  };
}

function legacyCrewTags(id: string): string[] {
  if (id === 'sera') return ['navigator', 'light-armor', 'tools', 'light-weapons'];
  if (id === 'rowan') return ['fighter', 'chain-weapons', 'medium-armor', 'tools'];
  return ['light-armor', 'tools'];
}

function legacyCrewCapabilities(id: string): string[] {
  if (id === 'sera') return ['navigation', 'helm'];
  if (id === 'rowan') return ['frontline-combat'];
  return [];
}

function normalizeCrew(raw: unknown, fallback?: CrewState): CrewState | null {
  if (!isObject(raw)) return fallback ?? null;
  const id = typeof raw.id === 'string' ? raw.id : fallback?.id;
  const name = typeof raw.name === 'string' ? raw.name : fallback?.name;
  const role = typeof raw.role === 'string' ? raw.role : fallback?.role;
  if (!id || !name || !role) return null;

  return {
    id,
    name,
    role,
    hp: typeof raw.hp === 'number' ? Math.max(0, raw.hp) : fallback?.hp ?? 1,
    maxHp: typeof raw.maxHp === 'number' ? Math.max(1, raw.maxHp) : fallback?.maxHp ?? 1,
    position: isObject(raw.position) && typeof raw.position.x === 'number' && typeof raw.position.y === 'number'
      ? { x: raw.position.x, y: raw.position.y }
      : fallback?.position ?? { x: 0, y: 0 },
    loyalty: typeof raw.loyalty === 'number' ? raw.loyalty : fallback?.loyalty ?? 0.5,
    morale: typeof raw.morale === 'number' ? raw.morale : fallback?.morale ?? 0.5,
    notes: Array.isArray(raw.notes) ? raw.notes.filter((value): value is string => typeof value === 'string') : fallback?.notes ?? [],
    equipmentTags: Array.isArray(raw.equipmentTags)
      ? raw.equipmentTags.filter((value): value is string => typeof value === 'string')
      : fallback?.equipmentTags ?? legacyCrewTags(id),
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.filter((value): value is string => typeof value === 'string')
      : fallback?.capabilities ?? legacyCrewCapabilities(id),
    equipment: normalizedLoadout(raw.equipment ?? fallback?.equipment ?? emptyEquipmentLoadout()),
  };
}

function normalizeCurrent(raw: Record<string, any>): CampaignSave {
  const fresh = createDefaultCampaign();
  const oldPlayer = isObject(raw.player) ? raw.player as Record<string, any> : {};
  const oldWorld = isObject(raw.world) ? raw.world as Record<string, any> : {};
  const oldShip = isObject(raw.ship) ? raw.ship as Record<string, any> : {};

  fresh.player = {
    ...fresh.player,
    ...oldPlayer,
    position: isObject(oldPlayer.position) && typeof oldPlayer.position.x === 'number' && typeof oldPlayer.position.y === 'number'
      ? { x: oldPlayer.position.x, y: oldPlayer.position.y }
      : fresh.player.position,
    fruit: isObject(oldPlayer.fruit)
      ? { ...fresh.player.fruit, ...oldPlayer.fruit }
      : fresh.player.fruit,
    knowledge: isObject(oldPlayer.knowledge)
      ? { ...fresh.player.knowledge, ...oldPlayer.knowledge }
      : fresh.player.knowledge,
    equipmentTags: Array.isArray(oldPlayer.equipmentTags)
      ? oldPlayer.equipmentTags.filter((value: unknown): value is string => typeof value === 'string')
      : fresh.player.equipmentTags,
    equipment: normalizedLoadout(oldPlayer.equipment ?? fresh.player.equipment),
  };

  const oldCrew = Array.isArray(raw.crew) ? raw.crew : [];
  const normalizedCrew = oldCrew
    .map((member: unknown) => {
      const id = isObject(member) && typeof member.id === 'string' ? member.id : '';
      const fallback = fresh.crew.find((candidate) => candidate.id === id);
      return normalizeCrew(member, fallback);
    })
    .filter((member: CrewState | null): member is CrewState => Boolean(member));
  fresh.crew = normalizedCrew.length ? normalizedCrew : fresh.crew;

  fresh.ship = { ...fresh.ship, ...oldShip };
  fresh.inventory = isObject(raw.inventory)
    ? Object.fromEntries(Object.entries(raw.inventory).filter(([, value]) => typeof value === 'number')) as Record<string, number>
    : fresh.inventory;
  fresh.equipmentInventory = isObject(raw.equipmentInventory)
    ? Object.fromEntries(Object.entries(raw.equipmentInventory).filter(([, value]) => typeof value === 'number')) as Record<string, number>
    : {};

  if (Array.isArray(raw.journal)) fresh.journal = raw.journal;
  fresh.world = {
    ...fresh.world,
    ...oldWorld,
    flags: isObject(oldWorld.flags)
      ? {
          ...fresh.world.flags,
          ...Object.fromEntries(
            Object.entries(oldWorld.flags).filter(([, value]) =>
              typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number'
            ),
          ),
        }
      : fresh.world.flags,
    canonLedger: Array.isArray(oldWorld.canonLedger) ? oldWorld.canonLedger : fresh.world.canonLedger,
  };

  fresh.saveVersion = SAVE_VERSION;
  fresh.gameVersion = GAME_VERSION;
  fresh.updatedAt = new Date().toISOString();
  return fresh;
}

function migrate(raw: unknown): CampaignSave {
  const fresh = createDefaultCampaign();
  if (!isObject(raw)) return fresh;

  const old = raw as Record<string, any>;
  if (old.saveVersion === 3 || old.saveVersion === 4) {
    return normalizeCurrent(old);
  }

  const oldPlayer = isObject(old.player) ? old.player as Record<string, any> : {};
  const oldWorld = isObject(old.world) ? old.world as Record<string, any> : {};
  const oldShip = isObject(old.ship) ? old.ship as Record<string, any> : {};

  if (typeof oldPlayer.money === 'number') fresh.player.berries = oldPlayer.money;
  if (typeof oldPlayer.berries === 'number') fresh.player.berries = oldPlayer.berries;
  if (typeof oldPlayer.bounty === 'number') fresh.player.bounty = oldPlayer.bounty;
  if (typeof oldPlayer.hp === 'number') fresh.player.hp = Math.max(0, oldPlayer.hp);

  if (isObject(oldPlayer.fruit)) {
    const f = oldPlayer.fruit as Record<string, any>;
    if (typeof f.mastery === 'number') fresh.player.fruit.mastery = Math.max(0, Math.min(1, f.mastery));
    if (typeof f.range === 'number') fresh.player.fruit.range = f.range;
    if (typeof f.maxForce === 'number') fresh.player.fruit.force = f.maxForce;
    if (typeof f.force === 'number') fresh.player.fruit.force = f.force;
  }

  if (typeof oldWorld.day === 'number') fresh.world.day = oldWorld.day;
  if (typeof oldWorld.minuteOfDay === 'number') fresh.world.minuteOfDay = oldWorld.minuteOfDay;
  if (oldWorld.harrowEscape === 'escaped' || oldWorld.scene === 'sea') {
    fresh.world.flags.harrowEscaped = true;
    fresh.world.flags.openingSeen = true;
    fresh.world.scene = 'sea';
  }

  if (typeof oldShip.hull === 'number') fresh.ship.hull = oldShip.hull;
  if (typeof oldShip.supplies === 'number') fresh.ship.supplies = oldShip.supplies;

  return fresh;
}

export class SaveManager {
  private static state: CampaignSave | null = null;

  static hasStoredSave(): boolean {
    return localStorage.getItem(KEY) !== null;
  }

  static get(): CampaignSave {
    if (!this.state) this.state = this.load();
    return this.state;
  }

  static load(): CampaignSave {
    try {
      const text = localStorage.getItem(KEY);
      this.state = text ? migrate(JSON.parse(text)) : createDefaultCampaign();
    } catch {
      this.state = createDefaultCampaign();
    }
    return this.state;
  }

  static startNew(): CampaignSave {
    this.state = createDefaultCampaign();
    this.save();
    return this.state;
  }

  static save(): void {
    const state = this.get();
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  static reset(): void {
    this.startNew();
  }

  static exportText(): string {
    this.save();
    return JSON.stringify(this.get(), null, 2);
  }

  static importText(text: string): CampaignSave {
    const parsed = JSON.parse(text) as unknown;
    this.state = migrate(parsed);
    this.save();
    return this.state;
  }
}
