# System architecture

## Permanent source of truth
Git repository + versioned campaign save. Hosting is replaceable infrastructure and must never be the source of campaign truth.

## Runtime stack
- Phaser: world scenes, real-time action, physics, cameras, input, animation, collision.
- TypeScript: simulation/state contracts and compile-time checks.
- Vite: build/dev tooling.
- Browser local storage: autosave convenience.
- JSON export: durable player-controlled backup.

## Scene model
- `OpeningScene`: context before danger.
- `HarrowScene`: stealth/combat/escape.
- `SeaScene`: real ship navigation in world space.
- `GullrockScene`: first post-Harrow playable port.
- `PauseScene`: journal/objectives/crew/ship/inventory/save.

## State model
Campaign state is explicitly split into player, crew, ship, inventory, journal, and world state. New systems should extend structured domains instead of creating unrelated globals.

## Interaction rule
Every control exposed to the player must perform a real action. Boarding, docking, talking, reading, shopping, and inspection use one contextual interaction model. Placeholder controls are not release features.

## Save migrations
Current schema is v3. Floot-era v1/v2 data is migrated conservatively where possible, preserving money, bounty, Fruit progress, world time, ship condition, and whether the Harrow escape already occurred.

## Future simulation tiers
1. Active nearby simulation.
2. Important off-screen actors and events.
3. Lightweight distant world simulation.

## Freeform intent
Architecturally reserved but hidden until a resolver can translate typed intent into actual in-world attempts or a clear unsupported result.
