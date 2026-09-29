import fs from 'node:fs';

const mobile = fs.readFileSync(new URL('../src/game/systems/MobileControls.ts', import.meta.url), 'utf8');
const dialogue = fs.readFileSync(new URL('../src/game/systems/DialoguePanel.ts', import.meta.url), 'utf8');
const toast = fs.readFileSync(new URL('../src/game/systems/Toast.ts', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const harrow = fs.readFileSync(new URL('../src/game/scenes/HarrowScene.ts', import.meta.url), 'utf8');
const gullrock = fs.readFileSync(new URL('../src/game/scenes/GullrockScene.ts', import.meta.url), 'utf8');
const sea = fs.readFileSync(new URL('../src/game/scenes/SeaScene.ts', import.meta.url), 'utf8');

const checks = [
  ['touch detection uses maxTouchPoints', mobile.includes('navigator.maxTouchPoints > 0')],
  ['touch detection supports coarse pointers', mobile.includes("(pointer: coarse)")],
  ['mobile controls are native DOM', mobile.includes("document.createElement('div')") && mobile.includes("document.createElement('button')")],
  ['joystick uses native pointer capture', mobile.includes('setPointerCapture')],
  ['native controls sit above canvas', style.includes('.mobile-controls') && style.includes('z-index:1000')],
  ['native controls accept pointer input', style.includes('pointer-events:auto') && style.includes('touch-action:none')],
  ['dialogue uses native DOM overlay', dialogue.includes("document.createElement('section')") && dialogue.includes('dialogue-overlay')],
  ['dialogue body can scroll', style.includes('.dialogue-body') && style.includes('overflow-y:auto')],
  ['dialogue respects safe areas', style.includes('env(safe-area-inset-bottom)')],
  ['status toast is native DOM', toast.includes("document.createElement('div')") && style.includes('.game-toast')],
  ['touch attack supports hold repeat', mobile.includes('390') && mobile.includes('setInterval(action, repeatMs)')],
  ['context action replaces order utility', mobile.includes('!this.interactLabel')],
  ['mobile attack aim assist exists', harrow.includes('mobileAttackFacing')],
  ['dash remembers last facing', harrow.includes('this.lastFacing.clone()')],
  ['downed enemies rotate visibly', harrow.includes("setAngle(90)") && harrow.includes("'DOWN'")],
  ['Harrow uses mobile controls', harrow.includes('new MobileControls')],
  ['Sea uses mobile controls', sea.includes('new MobileControls')],
  ['Gullrock uses mobile controls', gullrock.includes('new MobileControls')],
  ['first Marine starts on land', harrow.includes("[470, 610, 'melee']")],
  ['AI movement checks character-safe walkability', harrow.includes('isCharacterWalkable(nextX, nextY)')],
  ['Sera is labeled in Harrow', harrow.includes('SERA QUILL · Navigator')],
  ['Rowan is labeled in Harrow', harrow.includes('ROWAN VALE · Fighter')],
  ['crew labels exist in Gullrock', gullrock.includes('crewLabels')],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
