import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const section = (text, start, end) => {
  const from = text.indexOf(start);
  const to = from >= 0 ? text.indexOf(end, from) : -1;
  return from >= 0 ? text.slice(from, to >= 0 ? to : undefined) : '';
};

const mobile = read('../src/game/systems/MobileControls.ts');
const style = read('../src/style.css');
const harrow = read('../src/game/scenes/HarrowScene.ts');
const gullrock = read('../src/game/scenes/GullrockScene.ts');
const sea = read('../src/game/scenes/SeaScene.ts');
const boot = read('../src/game/scenes/BootScene.ts');
const crewHud = read('../src/game/systems/CrewStatusHud.ts');
const dialogue = read('../src/game/systems/DialoguePanel.ts');
const aiDialogue = read('../src/game/systems/DialogueAI.ts');
const dialogueApi = read('../api/dialogue.js');
const equipment = read('../src/game/systems/Equipment.ts');
const pause = read('../src/game/scenes/PauseScene.ts');
const progression = read('../src/game/systems/Progression.ts');
const livingWorld = read('../src/game/systems/LivingWorld.ts');
const canonTimeline = read('../src/game/systems/CanonTimeline.ts');
const recruitment = read('../src/game/systems/Recruitment.ts');
const worldClock = read('../src/game/systems/WorldClock.ts');
const enemyArchetypes = read('../src/game/systems/EnemyArchetypes.ts');
const naval = read('../src/game/systems/NavalEncounters.ts');
const conversation = read('../src/game/systems/ConversationContext.ts');
const defaults = read('../src/game/state/defaultCampaign.ts');
const saveManager = read('../src/game/state/SaveManager.ts');

const harrowHud = section(harrow, 'private updateHud()', 'private getMove');
const gullrockHud = section(gullrock, 'private updateHud()', 'private isWalkable');
const seaHud = section(sea, 'private updateHud()', 'private cardinal');
const randomRank = section(livingWorld, 'export function randomEncounterRank', 'export function rankForEncounter');

const checks = [
  ['mobile controls remain native and touch aware', mobile.includes('navigator.maxTouchPoints > 0') && mobile.includes("document.createElement('button')")],
  ['captain HP remains on all exploration HUDs', harrowHud.includes("'HP '") && gullrockHud.includes('HP ') && seaHud.includes("'HP '")],
  ['Harrow HUD no longer permanently shows money or world time', !harrowHud.includes('Berries') && !harrowHud.includes('formatWorldTime')],
  ['sea HUD no longer permanently shows berries hull supplies or world time', !seaHud.includes('Berries') && !seaHud.includes('Hull') && !seaHud.includes('Supplies') && !seaHud.includes("formatWorldTime(save),")],
  ['Gullrock crew health stays hidden in ordinary exploration', gullrock.includes('this.crewHud.setVisible(false)')],
  ['crew health HUD is generic rather than Sera/Rowan keyed', crewHud.includes('for (const member of crew)') && !crewHud.includes("['sera', 'rowan']")],
  ['Harrow crew health is contextual to active combat', harrow.includes('this.crewHud.setVisible(alerted > 0)')],
  ['journal owns DOM overlays while open', style.includes('body.journal-open .mobile-controls') && style.includes('body.journal-open .dialogue-overlay') && style.includes('body.journal-open .game-toast')],
  ['journal removes exclusive mode before resume', pause.includes("document.body.classList.remove('journal-open')")],
  ['journal overview contains moved status information', pause.includes('Berries') && pause.includes('WAYWARD GULL') && pause.includes('CREW') && pause.includes('formatWorldTime')],
  ['character art has role-specific silhouettes', boot.includes("'captain'") && boot.includes("'navigator'") && boot.includes("'fighter'") && boot.includes("'medic'") && boot.includes("'specialist'")],
  ['early Marine burst has longer reaction grace', harrow.includes('damageGraceUntil = this.time.now + 420') && harrow.includes('hitStunUntil')],
  ['rifle attacks telegraph and do not fire too rapidly', harrow.includes('this.time.now + 1750') && harrow.includes('delayedCall(420')],
  ['player progression changes real combat properties', progression.includes('meleeDamageBonus') && progression.includes('moveSpeedMultiplier') && progression.includes('staminaRecoveryBonus') && harrow.includes('playerCombatStats')],
  ['progression does not rely on max-HP inflation', !progression.includes('maxHp')],
  ['fruit mastery changes range force efficiency and cadence', progression.includes('range: save.player.fruit.range') && progression.includes('force: save.player.fruit.force') && progression.includes('staminaCost') && progression.includes('cooldownMultiplier')],
  ['fruit mastery unlocks techniques', progression.includes("'wide-pull'") && progression.includes("'anchor-pull'") && progression.includes("'snap-pull'")],
  ['crew progression affects combat', progression.includes('crewCombatStats') && harrow.includes('recordCrewExperience')],
  ['crew behavior is keyed by saved crew identity', harrow.includes('this.crew = save.crew.map') && gullrock.includes('this.crew = save.crew.map')],
  ['generated islands persist deterministic identity and features', livingWorld.includes('ensureGeneratedIsland') && livingWorld.includes('geography') && livingWorld.includes('resources') && livingWorld.includes('opportunities')],
  ['world simulation advances persistent islands over days', worldClock.includes('simulateWorld(save)') && livingWorld.includes('while (island.lastSimulatedDay < save.world.day)')],
  ['ambient Admiral RNG is impossible', randomRank.length > 0 && !randomRank.includes("return 'admiral'")],
  ['major Marine responses require an explicit canon character', livingWorld.includes('createMajorResponse') && livingWorld.includes('canonCharacterId') && livingWorld.includes('requires an explicit timeline-valid character id')],
  ['Marine recognition and orders affect encounter posture', livingWorld.includes('recognizedAlexander') && livingWorld.includes('threatHeat') && livingWorld.includes("kind === 'marine'")],
  ['pirates can be friendly neutral wary or hostile', livingWorld.includes("if (kind === 'pirate')") && livingWorld.includes("return 'friendly'") && livingWorld.includes("return 'neutral'") && livingWorld.includes("return 'wary'")],
  ['encounters express intentions beyond immediate attacks', livingWorld.includes("'trade'") && livingWorld.includes("'warn'") && livingWorld.includes("'inspect'") && livingWorld.includes("'flee'")],
  ['known groups persist relationship history', livingWorld.includes('ensureKnownGroup') && sea.includes('persistentGroupId') && sea.includes('group.relationship')],
  ['enemy archetypes vary tactics rather than stats only', enemyArchetypes.includes("'grapple'") && enemyArchetypes.includes("'kite'") && enemyArchetypes.includes("'control-space'") && enemyArchetypes.includes("'future-haki-capable'")],
  ['enemy archetype table contains no random Admiral archetype', !enemyArchetypes.includes("ranks: ['admiral']")],
  ['sailing creates visible contextual encounters', sea.includes('updateSeaEncounter') && sea.includes('Sea encounter:') && sea.includes('encounterShip')],
  ['hostile naval encounters support pursuit and ranged hull damage', sea.includes('chaseSpeed') && sea.includes('Incoming ship fire hits the Gull')],
  ['boarding is playable deck combat with crew injury and permadeath consequences', sea.includes('beginBoardingCombat') && sea.includes('updateBoardingCombat') && sea.includes('deckAttack') && sea.includes('deckPull') && sea.includes("'overboard-'") && sea.includes("'GameOverScene'")],
  ['boarding restores stamina using persistent combat progression', sea.includes('18 + combat.staminaRecoveryBonus')],
  ['campaign-start Admiral registry is explicit', canonTimeline.includes("'sakazuki'") && canonTimeline.includes("'borsalino'") && canonTimeline.includes("'kuzan'") && livingWorld.includes('isTimelineValidAdmiral')],
  ['non-hostile ships can be hailed instead of auto-attacked', sea.includes('openEncounterInteraction') && sea.includes('Hail ship') && sea.includes('Passing Pirate Captain')],
  ['naval command foundation supports distance boarding and defense orders', naval.includes("'keep-distance'") && naval.includes("'close-distance'") && naval.includes("'board-enemy'") && naval.includes("'repel-boarders'") && naval.includes('canBoard')],
  ['Sera can still helm while Alexander moves on deck', sea.includes("NavigationMode = 'manual' | 'sera'") && sea.includes('updateDeckMovement(dt)')],
  ['all recruited crew can render on the deck', sea.includes('for (const member of save.crew)') && sea.includes('this.deckCrew.set(member.id')],
  ['playable recruit exists in the world as a person', defaults.includes("'mira-sorn'") && gullrock.includes('Mira Sorn — Field Medic') && gullrock.includes('helpMira') && gullrock.includes('inviteMira')],
  ['recruitment has trust gates and generic crew promotion', recruitment.includes('requiredTrust') && recruitment.includes('save.crew.push(member)') && recruitment.includes('candidate.visualArchetype')],
  ['crew cap remains targeted to deep simulation size', recruitment.includes('save.crew.length >= 15')],
  ['existing saves receive new defaults without reset', saveManager.includes('...fresh.world.recruitCandidates') && saveManager.includes('old.saveVersion === 3') && saveManager.includes('old.saveVersion === 4') && saveManager.includes('old.saveVersion === 5')],
  ['multi-character participation is proximity and topic gated locally', conversation.includes('nearbyCrewIds') && conversation.includes('scoreParticipant') && conversation.includes('.slice(0, 2)')],
  ['dialogue sends one request containing gated participant context', aiDialogue.includes('conversationParticipants: selectConversationParticipants') && aiDialogue.includes('fetch(DIALOGUE_ENDPOINT')],
  ['backend refuses random off-screen interjections', dialogueApi.includes('Only those supplied participants may interject') && dialogueApi.includes('Never invent an off-screen participant')],
  ['Luna remains ordinary dialogue and Sol stays complexity gated', dialogueApi.includes('gpt-6-luna') && dialogueApi.includes('gpt-6-sol') && dialogueApi.includes('complexity >= 4 ? deepModel : economyModel')],
  ['routine Sera orders remain zero-cost local logic', aiDialogue.includes('zeroCostRoutine') && aiDialogue.includes("type: 'set_course'") && aiDialogue.includes("type: 'set_helm'")],
  ['AI credit exhaustion warning is preserved exactly', aiDialogue.includes('[AI CREDITS EMPTY — local dialogue fallback active]')],
  ['invalid-key warning is preserved exactly', aiDialogue.includes('[AI KEY INVALID/EXPIRED — local dialogue fallback active]')],
  ['dialogue panel still performs a single async submission per player turn', dialogue.includes('onSubmit') && dialogue.includes('await options.freeform?.onSubmit')],
  ['equipment remains persistent and compatibility gated', equipment.includes('equipmentInventory') && equipment.includes('isCompatible')],
  ['Nico physical dock work remains intact', gullrock.includes('workCargoPoint') && gullrock.includes('2_400') && gullrock.includes('CARGO 1')],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failures += 1;
}

if (failures > 0) {
  console.error('\nGameplay validation failed: ' + failures + ' assertion(s).');
  process.exit(1);
}

console.log('\nGameplay validation passed: ' + checks.length + ' assertions.');
