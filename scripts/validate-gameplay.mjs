import fs from 'node:fs';

const mobile = fs.readFileSync(new URL('../src/game/systems/MobileControls.ts', import.meta.url), 'utf8');
const toast = fs.readFileSync(new URL('../src/game/systems/Toast.ts', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const harrow = fs.readFileSync(new URL('../src/game/scenes/HarrowScene.ts', import.meta.url), 'utf8');
const gullrock = fs.readFileSync(new URL('../src/game/scenes/GullrockScene.ts', import.meta.url), 'utf8');
const sea = fs.readFileSync(new URL('../src/game/scenes/SeaScene.ts', import.meta.url), 'utf8');
const boot = fs.readFileSync(new URL('../src/game/scenes/BootScene.ts', import.meta.url), 'utf8');
const crewHud = fs.readFileSync(new URL('../src/game/systems/CrewStatusHud.ts', import.meta.url), 'utf8');
const dialogue = fs.readFileSync(new URL('../src/game/systems/DialoguePanel.ts', import.meta.url), 'utf8');
const intent = fs.readFileSync(new URL('../src/game/systems/DialogueIntent.ts', import.meta.url), 'utf8');
const aiDialogue = fs.readFileSync(new URL('../src/game/systems/DialogueAI.ts', import.meta.url), 'utf8');
const dialogueApi = fs.readFileSync(new URL('../api/dialogue.js', import.meta.url), 'utf8');
const interactions = fs.readFileSync(new URL('../src/game/systems/InteractionSystem.ts', import.meta.url), 'utf8');

const checks = [
  ['touch detection uses maxTouchPoints', mobile.includes('navigator.maxTouchPoints > 0')],
  ['touch detection supports coarse pointers', mobile.includes("(pointer: coarse)")],
  ['mobile controls are native DOM', mobile.includes("document.createElement('div')") && mobile.includes("document.createElement('button')")],
  ['joystick floats to touch origin', mobile.includes('stickCenterX') && mobile.includes('localX') && mobile.includes("classList.add('is-active')")],
  ['joystick uses pointer capture', mobile.includes('setPointerCapture')],
  ['toast uses native overlay', toast.includes("document.createElement('div')") && toast.includes('game-toast')],
  ['crew health is native browser UI', crewHud.includes("document.createElement('div')") && crewHud.includes('crew-status-hud')],
  ['crew health has numeric bars and DOWN state', crewHud.includes('crew-status-fill') && crewHud.includes("'DOWN'")],
  ['crew health is phone-lowered', style.includes('.crew-status-hud') && style.includes('top:max(126px')],
  ['toast sits below visible crew health', style.includes('.game-toast') && style.includes('top:max(220px')],
  ['combat layout separates primary buttons', style.includes('.mobile-attack') && style.includes('.mobile-dash') && style.includes('.mobile-pull')],
  ['holding attack repeats safely', mobile.includes('setInterval(action, repeatMs)') && mobile.includes('390')],
  ['Harrow remembers facing direction', harrow.includes('lastFacing') && harrow.includes('getAttackFacing')],
  ['mobile melee assists nearby targets', harrow.includes('entry.distance <= 100') && harrow.includes('toward.dot(movingFacing)')],
  ['defeated Marines are marked down', harrow.includes("'DOWN'") && harrow.includes("setData('downed', true)")],
  ['AI movement checks character-safe walkability', harrow.includes('isCharacterWalkable(nextX, nextY)')],
  ['crew health HUD is used in combat', harrow.includes('new CrewStatusHud') && harrow.includes('this.crewHud.update')],
  ['crew health HUD is used at Gullrock', gullrock.includes('new CrewStatusHud') && gullrock.includes('this.crewHud.update')],
  ['crew health HUD is used at sea', sea.includes('new CrewStatusHud') && sea.includes('this.crewHud.update')],
  ['Sera can own the helm', sea.includes("NavigationMode = 'manual' | 'sera'") && sea.includes('toggleNavigationMode')],
  ['delegated sailing keeps real world movement', sea.includes('updateSeraNavigation(dt)') && sea.includes('applyShipVelocity(dt)')],
  ['Alexander can walk the deck while Sera sails', sea.includes('updateDeckMovement(dt)') && sea.includes('WAYWARD GULL · DECK')],
  ['Sera route avoids the known reef', sea.includes('safeWaypoint') && sea.includes('getAutopilotPoint')],
  ['crew can be talked to on the deck', sea.includes('deckTalkTarget') && sea.includes('openCrewConversation')],
  ['dialogue has typed freeform input', dialogue.includes("document.createElement('textarea')") && dialogue.includes('onSubmit')],
  ['typed dialogue resizes with phone keyboard', style.includes('100dvh') && style.includes('.dialogue-input')],
  ['intent resolver knows Sera and Rowan', intent.includes("speaker === 'sera'") && intent.includes("speaker === 'rowan'")],
  ['intent resolver protects unknown Haki knowledge', intent.includes('!save.player.knowledge.hakiKnown')],
  ['moving crew can own interactions', interactions.includes("typeof item.x === 'function'") && interactions.includes("typeof item.y === 'function'")],
  ['Gullrock crew have direct talk interactions', gullrock.includes("id: 'sera'") && gullrock.includes("id: 'rowan'") && gullrock.includes('crewConversation')],
  ['Gullrock NPCs accept AI typed dialogue', gullrock.includes('resolveDialogueAI') && gullrock.includes('freeform: intentSpeaker')],
  ['Gullrock service NPCs use character sprites', boot.includes("'npc-tavern'") && boot.includes("'npc-harbor'") && boot.includes("'npc-provisioner'") && boot.includes("'npc-shipwright'")],
  ['Gullrock no longer uses service NPC circles', !gullrock.includes("this.add.circle(405, 500") && !gullrock.includes("this.add.circle(575, 560")],
  ['Gullrock has environmental market detail', gullrock.includes('Market stalls') && gullrock.includes('Non-interactive locals')],
  ['land cameras use a deadzone', harrow.includes('setDeadzone') && gullrock.includes('setDeadzone')],
  ['crew health panel is reduced in size', style.includes('width:184px') && style.includes('height:5px')],
  ['Gullrock service NPCs have names', gullrock.includes('Dren Pike — Harbor Master') && gullrock.includes('Marta Vell — Tavern Keeper') && gullrock.includes('Toma Reed — Provisioner') && gullrock.includes('Brann Cale — Shipwright')],
  ['background Gullrock locals have names', gullrock.includes('Elias — Sailor') && gullrock.includes('Nico — Dockhand') && gullrock.includes('Maris — Coastal Trader') && gullrock.includes('Perrin — Porter')],
  ['ports have offshore approach points', sea.includes('approachX') && sea.includes('approachY') && sea.includes('dockX') && sea.includes('dockY')],
  ['Sera stops offshore before docking', sea.includes('enterArrivalApproach') && sea.includes('holding offshore')],
  ['deck view is hidden for final harbor approach', sea.includes('const deckMode = delegated && !this.arrivalReady')],
  ['docking has its own sequence', sea.includes('beginDockingSequence') && sea.includes('duration: 1600')],
  ['ships are blocked from entering island land', sea.includes('isInsideIslandLand(nextX, nextY, port)')],
  ['harbor approach markers are rendered', sea.includes('drawHarborApproach')],
  ['named NPCs can introduce themselves', intent.includes('Dren Pike') && intent.includes('Marta Vell') && intent.includes('Toma Reed') && intent.includes('Brann Cale')],
  ['dialogue panel waits for async AI replies', dialogue.includes('Promise<string | null>') && dialogue.includes('dialogue-line-thinking')],
  ['AI dialogue has a local intent fallback', aiDialogue.includes('resolveDialogueIntent') && aiDialogue.includes("source: 'local'")],
  ['AI dialogue keeps compact per-NPC memories', aiDialogue.includes('dialogueMemory-') && aiDialogue.includes('slice(-6)')],
  ['dialogue backend uses the OpenAI Responses API', dialogueApi.includes('https://api.openai.com/v1/responses')],
  ['dialogue backend keeps API key server-side', dialogueApi.includes('process.env.OPENAI_API_KEY') && !aiDialogue.includes('OPENAI_API_KEY')],
  ['dialogue backend separates crew and world models', dialogueApi.includes('gpt-6-sol') && dialogueApi.includes('gpt-6-luna')],
  ['dialogue backend restricts browser origins', dialogueApi.includes('ALLOWED_ORIGINS') && dialogueApi.includes('Origin not allowed')],
  ['Sera dialogue can propose a real course change', sea.includes("result.action?.type === 'set_course'") && sea.includes('this.navTarget = port')],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
