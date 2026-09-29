import fs from 'node:fs';

const mobile = fs.readFileSync(new URL('../src/game/systems/MobileControls.ts', import.meta.url), 'utf8');
const toast = fs.readFileSync(new URL('../src/game/systems/Toast.ts', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const harrow = fs.readFileSync(new URL('../src/game/scenes/HarrowScene.ts', import.meta.url), 'utf8');
const gullrock = fs.readFileSync(new URL('../src/game/scenes/GullrockScene.ts', import.meta.url), 'utf8');
const sea = fs.readFileSync(new URL('../src/game/scenes/SeaScene.ts', import.meta.url), 'utf8');
const crewHud = fs.readFileSync(new URL('../src/game/systems/CrewStatusHud.ts', import.meta.url), 'utf8');

const checks = [
  ['touch detection uses maxTouchPoints', mobile.includes('navigator.maxTouchPoints > 0')],
  ['touch detection supports coarse pointers', mobile.includes("(pointer: coarse)")],
  ['mobile controls are native DOM', mobile.includes("document.createElement('div')") && mobile.includes("document.createElement('button')")],
  ['joystick floats to touch origin', mobile.includes('stickCenterX') && mobile.includes('localX') && mobile.includes("classList.add('is-active')")],
  ['joystick uses pointer capture', mobile.includes('setPointerCapture')],
  ['toast uses native overlay', toast.includes("document.createElement('div')") && toast.includes('game-toast')],
  ['toast sits below crew HUD', style.includes('.game-toast') && style.includes('top:max(184px') && style.includes('top:max(176px')],
  ['combat layout separates primary buttons', style.includes('.mobile-attack') && style.includes('.mobile-dash') && style.includes('.mobile-pull')],
  ['holding attack repeats safely', mobile.includes('setInterval(action, repeatMs)') && mobile.includes('390')],
  ['interact replaces order utility', mobile.includes('!this.interactLabel')],
  ['Harrow remembers facing direction', harrow.includes('lastFacing') && harrow.includes('getAttackFacing')],
  ['mobile melee assists nearby targets', harrow.includes('entry.distance <= 100') && harrow.includes('toward.dot(movingFacing)')],
  ['defeated Marines are marked down', harrow.includes("'DOWN'") && harrow.includes("setData('downed', true)")],
  ['hit flash preserves downed tint', harrow.includes("target.getData('downed')") && harrow.includes('setTint(0x555b5f)')],
  ['downed crew are visibly marked', harrow.includes('markCrewDown')],
  ['first Marine starts on land', harrow.includes("[470, 610, 'melee']")],
  ['AI movement checks character-safe walkability', harrow.includes('isCharacterWalkable(nextX, nextY)')],
  ['crew labels remain in Harrow', harrow.includes('SERA QUILL') && harrow.includes('ROWAN VALE')],
  ['crew labels remain in Gullrock', gullrock.includes('SERA QUILL') && gullrock.includes('ROWAN VALE')],
  ['Sea uses mobile controls', sea.includes('new MobileControls')],
  ['crew health HUD renders bars and DOWN state', crewHud.includes('fillRoundedRect') && crewHud.includes("'DOWN'")],
  ['crew health HUD is used in combat', harrow.includes('new CrewStatusHud') && harrow.includes('this.crewHud.update')],
  ['crew health HUD is used at Gullrock', gullrock.includes('new CrewStatusHud') && gullrock.includes('this.crewHud.update')],
  ['crew health HUD is used at sea', sea.includes('new CrewStatusHud') && sea.includes('this.crewHud.update')],
  ['Sera can own the helm', sea.includes("NavigationMode = 'manual' | 'sera'") && sea.includes('toggleNavigationMode')],
  ['delegated sailing keeps real world movement', sea.includes('updateSeraNavigation(dt)') && sea.includes('applyShipVelocity(dt)')],
  ['Alexander can walk the deck while Sera sails', sea.includes('updateDeckMovement(dt)') && sea.includes('WAYWARD GULL · DECK')],
  ['Sera route avoids the known reef', sea.includes('safeWaypoint') && sea.includes('getAutopilotPoint')],
  ['mobile utility order remains available outside combat', mobile.includes("this.order.style.display = !this.interactLabel ? 'flex' : 'none'")],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
