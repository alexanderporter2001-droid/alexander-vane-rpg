# Alexander Vane — Living Pirate RPG

A private, persistent, consequence-driven pirate RPG built around Alexander Vane and the Wayward Gull.

This repository replaces the Floot prototype as the permanent source of truth. Hosting is replaceable; campaign continuity and versioned saves are not.

## Current foundation — v0.3.7

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
14. Mobile controls are native browser controls layered above the game canvas, with iPhone safe-area support and independent pointer handling. Harrow AI respects shoreline boundaries; Sera and Rowan are labeled in-world.
15. Dialogue is a native responsive overlay with scrollable text and choices so small phone screens cannot hide conversation content behind the HUD.
16. Mobile movement now uses a floating joystick that centers under the thumb, combat buttons are spaced for portrait play, melee keeps facing/assists nearby targets, transient messages sit below the HUD, and defeated characters visibly fall with DOWN markers.
17. Status messages no longer overlap the HUD; touch combat has hold-to-attack, last-facing memory, nearby-enemy aim assistance, a simplified right-thumb layout, and obvious DOWN states for defeated characters.
18. Sera can take the helm and navigate the real sea route while Alexander walks around a close-up Wayward Gull deck. Alexander can retake the helm at any time, and Sera routes around the known reef rather than driving straight through it.
19. Sera and Rowan have persistent visible HP bars across Harrow, Gullrock, and sea travel, including an explicit DOWN state at zero HP.\n20. Crew health is now a native browser overlay positioned for phone browser chrome instead of being buried at the canvas edge.\n21. Sera and Rowan are directly talkable on Gullrock and on the Wayward Gull deck. Typed player sentences are parsed locally by intent/topic/context, while irreversible purchases and repairs still require explicit confirmation.\n22. Gullrock service NPCs are character sprites rather than circles, and the port now includes market stalls, dock clutter, background locals, roofs, windows, lamps, shoreline detail, and a denser inhabited layout.

Typed freeform dialogue is now real: the text box resolves supported intent, topic, speaker knowledge, and crew/world state locally. Arbitrary freeform world actions remain absent until they can resolve into actual mechanics rather than being logged as fake text.

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
