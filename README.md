# Alexander Vane — Living Pirate RPG

A private, persistent, consequence-driven pirate RPG built around Alexander Vane and the Wayward Gull.

This repository replaces the Floot prototype as the permanent source of truth. Hosting is replaceable; campaign continuity and versioned saves are not.

## Current foundation — v0.3.0

The current vertical slice is designed as a complete local loop rather than a collection of disconnected demos:

1. Context-first Harrow Island opening.
2. On-foot movement with water/edge collision.
3. Marines begin unaware and detect by distance.
4. Readable melee/rifle attacks and physical projectiles.
5. Real-time pull ability affecting Marines and environmental props.
6. Autonomous Sera/Rowan support plus broad captain orders.
7. Contextual boarding of the Wayward Gull.
8. Real sailing using persistent world coordinates, heading, speed, reefs, and a reachable destination.
9. Docking at Gullrock Port and continuing on foot.
10. Pause-only objectives/journal, save/export, crew/ship/inventory views.

The old fake freeform-intent control is intentionally absent. It returns only when typed intent can resolve into real dialogue, orders, or world actions.

## Development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run validate:save
npm run check
npm run build
```

See `docs/` for continuity, architecture, and release standards.
