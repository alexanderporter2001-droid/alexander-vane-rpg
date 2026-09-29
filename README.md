# Alexander Vane — Living Pirate RPG

A private, persistent, consequence-driven pirate RPG built around Alexander Vane and the Wayward Gull.

This repository replaces the Floot prototype as the permanent source of truth. Hosting is replaceable; campaign continuity and versioned saves are not.

## Current foundation — v0.3.3

The current vertical slice is built as a complete local loop rather than disconnected demos:

1. Proper title screen with Continue, New Campaign, and Import Save.
2. Context-first Harrow Island opening.
3. On-foot movement with water/edge collision.
4. Marines begin unaware and detect by distance.
5. Readable melee/rifle attacks and physical projectiles.
6. Real-time pull ability affecting Marines and environmental props.
7. Autonomous Sera/Rowan support plus broad captain orders.
8. Contextual boarding of the Wayward Gull.
9. Real sailing using persistent world coordinates, heading, speed, reefs, and reachable destinations.
10. Docking at Gullrock Port and continuing on foot.
11. Pause-only journal/objectives, campaign overview, save/export/import.
12. Global permadeath routing so an ended campaign cannot silently resume.
13. Gullrock has persistent dialogue choices, paid services, ship repair, crew meals, local information, and world-time consequences.
14. Mobile controls use reliable touch detection and expanded hit areas; Harrow AI respects shoreline boundaries; Sera and Rowan are labeled in-world.

The old fake freeform-intent control is intentionally absent. It returns only when typed intent can resolve into real dialogue, orders, or world actions.

## Development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run validate:save
npm run validate:gameplay
npm run check
npm run build
```

See `docs/` for continuity, architecture, and release standards.
