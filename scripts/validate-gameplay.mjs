import fs from 'node:fs';

const mobile = fs.readFileSync(new URL('../src/game/systems/MobileControls.ts', import.meta.url), 'utf8');
const harrow = fs.readFileSync(new URL('../src/game/scenes/HarrowScene.ts', import.meta.url), 'utf8');
const gullrock = fs.readFileSync(new URL('../src/game/scenes/GullrockScene.ts', import.meta.url), 'utf8');
const sea = fs.readFileSync(new URL('../src/game/scenes/SeaScene.ts', import.meta.url), 'utf8');

const checks = [
  ['touch detection uses maxTouchPoints', mobile.includes('navigator.maxTouchPoints > 0')],
  ['touch detection supports coarse pointers', mobile.includes("(pointer: coarse)")],
  ['joystick has expanded touch zone', mobile.includes('190, 190')],
  ['action buttons have expanded hit zones', mobile.includes('diameter + 30')],
  ['Harrow uses reliable mobile detection', harrow.includes('shouldUseMobileControls()')],
  ['Sea uses reliable mobile detection', sea.includes('shouldUseMobileControls()')],
  ['Gullrock uses reliable mobile detection', gullrock.includes('shouldUseMobileControls()')],
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
