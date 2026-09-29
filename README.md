# Alexander Vane — Living Pirate RPG

A private, persistent, consequence-driven pirate RPG built around Alexander Vane and the Wayward Gull.

This repository replaces the Floot prototype as the permanent source of truth. Hosting is replaceable; campaign continuity and versioned saves are not.

## Current foundation — v0.3.14

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
19. Sera and Rowan have persistent visible HP bars across Harrow, Gullrock, and sea travel, including an explicit DOWN state at zero HP.\n20. Crew health is now a native browser overlay positioned for phone browser chrome instead of being buried at the canvas edge.\n21. Sera and Rowan are directly talkable on Gullrock and on the Wayward Gull deck. Typed player sentences are parsed locally by intent/topic/context, while irreversible purchases and repairs still require explicit confirmation.\n22. Gullrock service NPCs are character sprites rather than circles, and the port includes market stalls, dock clutter, background locals, roofs, windows, lamps, shoreline detail, and a denser inhabited layout.
23. Land cameras now use a central dead-zone so ordinary movement does not drag the whole screen around.
24. Gullrock NPCs have personal names in addition to occupations, including Dren Pike, Marta Vell, Toma Reed, and Brann Cale; background locals are named too.
25. Crew health is more compact while preserving exact HP, colored bars, and DOWN states.
26. Island arrival now stops the Wayward Gull at an offshore harbor approach, switches out of deck view, and uses a separate exterior docking animation instead of letting the deck visually pass over island terrain.
27. Ships are prevented from driving directly through island land geometry on the sea map.

28. Typed NPC dialogue now uses a secure Vercel server function backed by the OpenAI Responses API; the browser never receives the OpenAI API key.
29. Core crew dialogue (Sera and Rowan) routes to the deeper crew model while service NPCs use the lower-cost world model. Model IDs can be changed with server environment variables without rebuilding the game.
30. Conversations preserve recent turns plus compact per-NPC memories. The server enforces NPC-specific profiles and knowledge boundaries, including the current hidden-Haki rule.
31. Sera can turn a clear typed course order into a validated in-game destination change instead of merely acknowledging it in dialogue. If the AI service is unavailable, the existing local intent resolver remains the fallback.
32. Dialogue reliability pass: crew/world calls use no hidden reasoning budget, Sol can retry on Luna when needed, the backend exposes a safe configured/not-configured health check, and local fallback replies show a short diagnostic code instead of failing silently.
33. Important NPCs now maintain prioritized long-term memories plus a private evolving impression of Alexander, so future conversations can reflect promises, meaningful orders, relationship-changing moments, and repeated familiarity without exposing a friendship meter.
34. Elias, Nico, Maris, and Perrin are now full Gullrock conversation targets with distinct personalities and bounded local knowledge rather than decorative background labels.
35. Typed dialogue can now produce validated world effects beyond speech: Sera can change course or hand over the helm, and NPCs can mark specifically approved local information as learned so it persists in the journal and world state.
36. Dialogue-generated actions are constrained server-side per NPC; a local cannot grant themselves Sera's helm/course permissions or invent arbitrary state changes. Spending berries and other irreversible services still require explicit player confirmation.
37. Cost routing is now economy-first: Luna handles ordinary dialogue even for core crew, while Sol is selected only for genuinely complex crew conversations such as leadership, trust, strategy, moral judgment, or deeper relationship discussion.
38. Obvious ship orders such as setting a known course or handing the helm to Sera/Alexander are resolved locally at zero API cost when the wording is unambiguous.
39. Per-turn context is aggressively trimmed: only the most relevant persistent memories and journal events plus the last few dialogue turns are sent, while the response budget is capped for concise NPC speech.
40. Billing/quota exhaustion is surfaced distinctly in the conversation as “[AI CREDITS EMPTY — local dialogue fallback active]”; invalid/expired API keys use a separate warning so billing problems are not confused with connectivity errors.
41. Berries are visible during combat, sailing, Gullrock exploration, and the captain journal so the economy is never hidden during ordinary play.
42. Equipment now has persistent ownership, weapon/armor/tool/accessory slots, compatibility tags, and crew loadouts. The GEAR journal tab lets the player assign or remove owned gear from Alexander or any compatible crew member.
43. Maris now operates a finite-stock Gullrock gear trade with equipment that has real effects: melee bonuses, damage reduction, and navigator sea-awareness bonuses.
44. Nico offers a zero-AI paid dock-loading shift. The player physically walks between three visible cargo markers and earns 2,400 berries on completion; the work can be repeated on a later in-world day.
45. Crew AI quality is no longer keyed only to Sera and Rowan. Any future saved crew identity enters the same economy-first Luna / complex-conversation Sol routing, persistent memory, and relationship-impression pipeline.
46. Save schema v4 adds equipment and extensible crew capability fields with an explicit v3→v4 migration so existing campaigns remain usable.
47. Save schema v5 adds persistent island, encounter, known-group, recruit-candidate, threat-heat, player progression, and crew progression state while preserving v3/v4 campaigns.
48. Pull mastery now has gameplay effects: increasing mastery improves effective pull range/force, reduces stamina cost, and can unlock techniques instead of being a display-only percentage.
49. Early Harrow combat has a short damage-overlap grace window and lower Marine burst damage so permadeath remains dangerous without deleting a campaign from stacked hits before the player can react.
50. Passive crew-health overlays are removed from ordinary Gullrock/sea exploration and become contextual during active Harrow combat; full crew status remains in the Captain's Journal.
51. Opening the Captain's Journal now gives it exclusive screen control and hides gameplay controls, crew HUD, and dialogue overlays until play resumes.
52. Procedural crew sprites have stronger silhouette differences for navigator/fighter roles without replacing the lightweight art pipeline.
53. Deterministic living-world foundations can create and persist islands, simulate them forward by world day, and create location-aware Marine/pirate/merchant/bounty-hunter encounters without AI calls.
54. Encounter ranks are rarity-weighted; Admiral/canon-equivalent figures are explicitly excluded from random generation and are reserved for authored canon presence or consequential world responses.
55. Recruitment foundations support persistent candidates, trust/availability gates, a 15-member deep-simulation cap, and promotion into the same generic crew state/equipment/progression pipeline used by existing crew.
56. AI remains primarily a dialogue/character layer; world generation, progression, encounter selection, recruitment rules, and simulation are deterministic code.

Typed freeform dialogue now has a live AI path with structured output, relevance-selected context, prioritized persistent memories, private relationship impressions, economy-first model routing, zero-cost handling for obvious routine ship orders, and a local offline fallback. Economy and equipment remain normal deterministic game systems with zero API cost. AI responses may propose only explicitly supported game actions; the simulation validates and applies them.

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
