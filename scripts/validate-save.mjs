import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/game/state/defaultCampaign.ts', import.meta.url), 'utf8');
const save = fs.readFileSync(new URL('../src/game/state/SaveManager.ts', import.meta.url), 'utf8');

const checks = [
  ['schema version 3', source.includes('SAVE_VERSION = 3')],
  ['308,600 starting berries', source.includes('berries: 308_600')],
  ['Haki begins unknown', source.includes('hakiKnown: false')],
  ['Fruit name begins unknown', source.includes('fruitNameKnown: false')],
  ['Sera exists', source.includes("id: 'sera'")],
  ['Rowan exists', source.includes("id: 'rowan'")],
  ['v1/v2 money migration exists', save.includes('oldPlayer.money')],
  ['old maxForce migration exists', save.includes('f.maxForce')],
  ['Harrow escape migration exists', save.includes("oldWorld.harrowEscape === 'escaped'")],
  ['current game version is 0.3.6', source.includes("GAME_VERSION = '0.3.6'")],
  ['ship-disabled state is defined', source.includes('waywardGullDisabled: false')],
  ['Sera sailing delegation defaults on', source.includes('sailingDelegated: true')],
  ['Gullrock is the first delegated destination', source.includes("shipDestination: 'gullrock'")],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
