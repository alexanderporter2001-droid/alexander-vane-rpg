import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/game/state/defaultCampaign.ts', import.meta.url), 'utf8');
const save = fs.readFileSync(new URL('../src/game/state/SaveManager.ts', import.meta.url), 'utf8');

const checks = [
  ['schema version 4', source.includes('SAVE_VERSION = 4')],
  ['308,600 starting berries', source.includes('berries: 308_600')],
  ['Haki begins unknown', source.includes('hakiKnown: false')],
  ['Fruit name begins unknown', source.includes('fruitNameKnown: false')],
  ['Sera exists', source.includes("id: 'sera'")],
  ['Rowan exists', source.includes("id: 'rowan'")],
  ['v1/v2 money migration exists', save.includes('oldPlayer.money')],
  ['old maxForce migration exists', save.includes('f.maxForce')],
  ['Harrow escape migration exists', save.includes("oldWorld.harrowEscape === 'escaped'")],
  ['current game version is 0.3.13', source.includes("GAME_VERSION = '0.3.13'")],
  ['ship-disabled state is defined', source.includes('waywardGullDisabled: false')],
  ['Sera sailing delegation defaults on', source.includes('sailingDelegated: true')],
  ['Gullrock is the first delegated destination', source.includes("shipDestination: 'gullrock'")],
  ['equipment inventory exists', source.includes('equipmentInventory: {}')],
  ['legacy save migration handles v3 and v4', save.includes('old.saveVersion === 3 || old.saveVersion === 4')],
  ['crew equipment is normalized during migration', save.includes('normalizedLoadout') && save.includes('equipmentTags') && save.includes('capabilities')],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
