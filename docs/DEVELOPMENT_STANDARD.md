# Release acceptance standard

The player should report design preferences and gameplay observations, not basic completeness failures a developer pass should have caught.

Before presenting a playable release, verify:

- Opening context is understandable and does not begin in unavoidable damage.
- No permanent objective box obstructs play; objectives live in pause/journal.
- Walking, dashing, water, voids, docks, buildings, ship ramps, and map edges obey collision.
- Attacks have readable anticipation, impact, and recovery.
- Ranged attacks use modeled projectiles or equally explicit hit logic.
- Crew and enemy AI handle pursuit, retreat, target switching, injury, and death coherently.
- Enemy adaptation requires actual knowledge rather than omniscient counters.
- Pull respects range, mass, environment, and valid geometry.
- Exposed interactions always do something real.
- Boarding and docking cannot trigger accidentally.
- Sailing uses persistent world coordinates and physically reachable destinations.
- A complete route from Harrow to sea to Gullrock to disembark and back to sea works.
- Autosave and manual export preserve campaign state.
- Save migrations preserve prior campaign continuity.
- Death is not silently undone by convenience respawn logic.
- Mobile is tested first: safe-area spacing, multi-touch, readable text, no control overlap.

A technical scaffold is a prototype, not a release.
