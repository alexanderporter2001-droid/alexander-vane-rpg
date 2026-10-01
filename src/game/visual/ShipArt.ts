import Phaser from 'phaser';

function wood(g:Phaser.GameObjects.Graphics,poly:Phaser.Geom.Point[],base:number,seed=0):void{
  g.fillStyle(0x140b07,.45).fillPoints(poly.map(p=>new Phaser.Geom.Point(p.x+5,p.y+7)),true);
  g.fillStyle(base,1).fillPoints(poly,true);
  // short, irregular grain strokes instead of a uniform grid.
  g.lineStyle(1,0xf0bd76,.18);
  for(let i=0;i<34;i++){const y=-220+((i*47+seed*13)%450);const x=-155+((i*73+seed*19)%285);const len=18+((i*17)%48);g.beginPath().moveTo(x,y).lineTo(x+len,y-3-((i%3)*2)).strokePath();}
  g.lineStyle(1,0x321a10,.35);
  for(let i=0;i<25;i++){const x=-145+((i*61+seed)%290),y=-205+((i*83+seed)%420);g.strokeEllipse(x,y,8+(i%4)*3,3+(i%2));}
}
function crate(scene:Phaser.Scene,x:number,y:number,s=.9):Phaser.GameObjects.Container{
  const c=scene.add.container(x,y);const g=scene.add.graphics();
  g.fillStyle(0x1b100a,.4).fillPoints([new Phaser.Geom.Point(-18,19),new Phaser.Geom.Point(17,19),new Phaser.Geom.Point(22,24),new Phaser.Geom.Point(-13,25)],true);
  g.fillStyle(0x704421,1).fillPoints([new Phaser.Geom.Point(-19,-13),new Phaser.Geom.Point(13,-16),new Phaser.Geom.Point(18,15),new Phaser.Geom.Point(-16,18)],true);
  g.fillStyle(0x9a6533,1).fillPoints([new Phaser.Geom.Point(-19,-13),new Phaser.Geom.Point(2,-22),new Phaser.Geom.Point(19,-16),new Phaser.Geom.Point(13,-7)],true);
  g.fillStyle(0x4e2d18,1).fillPoints([new Phaser.Geom.Point(13,-16),new Phaser.Geom.Point(19,-12),new Phaser.Geom.Point(18,15),new Phaser.Geom.Point(13,12)],true);
  g.lineStyle(3,0xc28a4d,.85).lineBetween(-16,-9,15,12).lineBetween(12,-12,-14,14);
  g.lineStyle(1,0xe1ae68,.3).lineBetween(-11,-4,9,-7).lineBetween(-10,5,10,2);
  c.add(g);c.setScale(s);return c;
}
function barrel(scene:Phaser.Scene,x:number,y:number,s=1):Phaser.GameObjects.Container{
  const c=scene.add.container(x,y);const g=scene.add.graphics();
  g.fillStyle(0x130b08,.35).fillEllipse(3,22,38,12);
  g.fillStyle(0x57351e,1).fillEllipse(0,0,34,49);g.fillStyle(0x8a5730,.75).fillEllipse(-5,-2,13,42);
  g.lineStyle(2,0x2a2522,1).strokeEllipse(0,0,34,49);for(const yy of [-13,0,13])g.lineBetween(-16,yy,16,yy);
  g.lineStyle(1,0xc18b52,.35).lineBetween(-7,-20,-9,20).lineBetween(6,-21,8,20);
  c.add(g);c.setScale(s);return c;
}
function rope(scene:Phaser.Scene,x:number,y:number):Phaser.GameObjects.Graphics{
  const g=scene.add.graphics();g.lineStyle(3,0xc9a06a,.9);
  g.beginPath().moveTo(x-18,y+7).lineTo(x-30,y-12).lineTo(x-8,y-24).lineTo(x+8,y-14).lineTo(x+27,y-2).lineTo(x+14,y+18).lineTo(x-5,y+13).lineTo(x-19,y+9).lineTo(x-12,y-7).lineTo(x+2,y-7).strokePath();
  g.beginPath().moveTo(x+8,y+12).lineTo(x+22,y+20).lineTo(x+27,y+30).lineTo(x+38,y+28).strokePath();return g;
}
function lantern(scene:Phaser.Scene,x:number,y:number):Phaser.GameObjects.Container{
  const c=scene.add.container(x,y);const glow=scene.add.circle(0,2,38,0xffb847,.12).setBlendMode(Phaser.BlendModes.ADD);const g=scene.add.graphics();
  g.fillStyle(0x151313,1).fillRoundedRect(-8,-13,16,27,4);g.fillStyle(0xffcf68,1).fillPoints([new Phaser.Geom.Point(-4,-7),new Phaser.Geom.Point(4,-7),new Phaser.Geom.Point(5,7),new Phaser.Geom.Point(-5,7)],true);g.lineStyle(2,0x66503a,1).strokeRoundedRect(-8,-13,16,27,4);g.lineStyle(2,0x34251a,1).strokeCircle(0,-14,7);c.add([glow,g]);return c;
}

export function createDeckArt(scene:Phaser.Scene):Phaser.GameObjects.Container{
  const root=scene.add.container(0,0);const floor=scene.add.graphics();
  const outer=[new Phaser.Geom.Point(-176,-260),new Phaser.Geom.Point(130,-274),new Phaser.Geom.Point(192,-215),new Phaser.Geom.Point(220,174),new Phaser.Geom.Point(95,276),new Phaser.Geom.Point(-103,288),new Phaser.Geom.Point(-190,202),new Phaser.Geom.Point(-207,-185)];
  const inner=[new Phaser.Geom.Point(-157,-239),new Phaser.Geom.Point(118,-252),new Phaser.Geom.Point(172,-201),new Phaser.Geom.Point(197,163),new Phaser.Geom.Point(82,253),new Phaser.Geom.Point(-91,265),new Phaser.Geom.Point(-168,190),new Phaser.Geom.Point(-184,-176)];
  floor.fillStyle(0x0a1720,.35).fillEllipse(3,26,475,635);floor.fillStyle(0x21120c,1).fillPoints(outer,true);wood(floor,inner,0x7b4c27,4);
  // plank courses: staggered, angled and repaired rather than a sterile grid.
  floor.lineStyle(2,0x3b2416,.65);for(let y=-218;y<240;y+=29){const skew=(y+220)*.06;floor.lineBetween(-155+skew,y,169+skew,y-24);}
  floor.lineStyle(1,0xe1a65d,.24);for(let i=0;i<13;i++){const x=-145+i*25;const y=-220+(i%3)*11;floor.lineBetween(x,y,x+42,235);}
  floor.fillStyle(0x5a341d,.7);for(const [x,y,w] of [[-92,-108,58],[35,-18,46],[-34,154,63]] as const)floor.fillRoundedRect(x,y,w,8,2);
  // quarterdeck is visibly elevated.
  floor.fillStyle(0x2b190f,.55).fillPoints([new Phaser.Geom.Point(20,-218),new Phaser.Geom.Point(143,-229),new Phaser.Geom.Point(165,-89),new Phaser.Geom.Point(38,-77)],true);
  floor.fillStyle(0x6b4021,1).fillPoints([new Phaser.Geom.Point(16,-229),new Phaser.Geom.Point(137,-241),new Phaser.Geom.Point(158,-105),new Phaser.Geom.Point(34,-91)],true);
  floor.lineStyle(4,0xd09b59,.7).lineBetween(34,-91,158,-105);for(let i=0;i<4;i++)floor.lineBetween(42+i*28,-96-i*3,42+i*28,-82-i*3);
  // deep hatch with ladder disappearing into darkness.
  floor.fillStyle(0x090a0b,1).fillPoints([new Phaser.Geom.Point(-30,37),new Phaser.Geom.Point(71,31),new Phaser.Geom.Point(78,117),new Phaser.Geom.Point(-24,126)],true);
  floor.fillStyle(0x20130c,1).fillPoints([new Phaser.Geom.Point(-24,43),new Phaser.Geom.Point(65,38),new Phaser.Geom.Point(69,109),new Phaser.Geom.Point(-18,116)],true);
  floor.lineStyle(5,0xb87c40,.95).strokePoints([new Phaser.Geom.Point(-30,37),new Phaser.Geom.Point(71,31),new Phaser.Geom.Point(78,117),new Phaser.Geom.Point(-24,126)],true);
  floor.lineStyle(3,0x9d744d,.8);for(let yy=55;yy<109;yy+=14)floor.lineBetween(-9,yy,51,yy-3);floor.lineBetween(-10,48,-6,113);floor.lineBetween(52,43,56,107);
  root.add(floor);

  // Smaller integrated masts with feet, rope collars and spar hints.
  const structural=scene.add.graphics().setDepth(10);
  for(const [x,y,h] of [[-66,-242,278],[76,-239,205]] as const){
    structural.fillStyle(0x20130d,.35).fillEllipse(x+5,y+h+3,35,13);structural.fillStyle(0x442817,1).fillRoundedRect(x-10,y,20,h,8);structural.fillStyle(0xb0763d,.65).fillRoundedRect(x-5,y+3,6,h-8,3);
    structural.lineStyle(4,0x272323,1);for(let by=y+57;by<y+h;by+=78)structural.lineBetween(x-11,by,x+11,by);
    structural.lineStyle(3,0xcaa06a,.8).strokeEllipse(x,y+h-18,27,11);
  }
  structural.lineStyle(5,0x422817,1).lineBetween(-132,-209,28,-220).lineBetween(20,-204,148,-214);
  structural.lineStyle(2,0xc6a06e,.72);structural.lineBetween(-66,-219,-169,-135);structural.lineBetween(-66,-205,161,-190);structural.lineBetween(76,-216,178,-116);structural.lineBetween(-66,-151,-152,142);
  structural.lineStyle(1,0xe3c18c,.45);for(let y=-173;y<82;y+=27)structural.lineBetween(-151,y,-89,y+4);
  root.add(structural);

  // Helm station: deck pedestal, wheel, compass binnacle.
  const helm=scene.add.graphics().setDepth(12);helm.fillStyle(0x4a2b18,1).fillPoints([new Phaser.Geom.Point(63,-182),new Phaser.Geom.Point(128,-188),new Phaser.Geom.Point(137,-119),new Phaser.Geom.Point(69,-112)],true);
  helm.fillStyle(0x1d110b,1).fillCircle(100,-166,26);helm.lineStyle(5,0xb97c3f,1).strokeCircle(100,-166,26);for(let a=0;a<Math.PI*2;a+=Math.PI/8)helm.lineBetween(100+Math.cos(a)*15,-166+Math.sin(a)*15,100+Math.cos(a)*36,-166+Math.sin(a)*36);
  helm.fillStyle(0x684426,1).fillRoundedRect(76,-132,34,24,5);helm.fillStyle(0xd4b568,1).fillCircle(93,-121,7);helm.lineStyle(1,0x443526,1).strokeCircle(93,-121,7);helm.setVisible(!scene.textures.exists('prod-helm-hires'));root.add(helm);if(scene.textures.exists('prod-helm-hires'))root.add(scene.add.image(101,-158,'prod-helm-hires').setDisplaySize(72,72).setDepth(12));

  // Dimensional props.
  for(const [x,y,s] of [[-132,8,.82],[-117,54,.9],[136,27,.78],[145,67,.75]] as const)root.add(crate(scene,x,y,s).setDepth(11));
  for(const [x,y,s] of [[-145,-63,.9],[154,-48,.82],[-68,198,.9]] as const)root.add(barrel(scene,x,y,s).setDepth(11));
  root.add(rope(scene,-145,127).setDepth(12));root.add(rope(scene,132,126).setDepth(12));
  // sacks, bucket, spare timber and pulley clutter.
  const clutter=scene.add.graphics().setDepth(11);clutter.fillStyle(0x8b7652,1).fillEllipse(-111,164,27,34).fillEllipse(-91,169,24,31);clutter.lineStyle(2,0x463927,.8).lineBetween(-121,153,-103,154);
  clutter.fillStyle(0x4b4d4b,1).fillPoints([new Phaser.Geom.Point(112,158),new Phaser.Geom.Point(132,158),new Phaser.Geom.Point(128,184),new Phaser.Geom.Point(116,184)],true);clutter.lineStyle(2,0xb0a98c,.6).strokeEllipse(122,158,20,7);
  clutter.fillStyle(0x68401f,1).fillRoundedRect(-22,214,105,8,3).fillRoundedRect(-8,227,94,7,3);clutter.fillStyle(0x292422,1).fillCircle(151,112,9);clutter.lineStyle(3,0xc6a06c,.8).strokeCircle(151,112,15);root.add(clutter);
  const lamps=scene.add.container(0,0).setDepth(19);for(const [x,y] of [[-158,-115],[169,-103],[106,167]] as const)lamps.add(lantern(scene,x,y));root.add(lamps);root.setData('lamps',lamps);

  // Foreground rail cap renders above feet near lower edge.
  const fg=scene.add.graphics().setDepth(30);fg.lineStyle(8,0x2a180f,1);fg.beginPath().moveTo(-181,187).lineTo(-100,273).lineTo(83,261).lineTo(202,166).strokePath();fg.lineStyle(3,0xd09b59,.8);fg.beginPath().moveTo(-177,184).lineTo(-97,268).lineTo(80,256).lineTo(198,163).strokePath();root.add(fg);
  return root;
}

function room(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,base:number):void{
  g.fillStyle(0x100a07,.65).fillRoundedRect(x+5,y+7,w,h,9);g.fillStyle(base,1).fillRoundedRect(x,y,w,h,9);g.lineStyle(3,0x9a6c43,.72).strokeRoundedRect(x,y,w,h,9);
  for(let yy=y+14;yy<y+h-6;yy+=14){g.lineStyle(1,0xe0b16d,.12).lineBetween(x+6,yy,x+w-6,yy-2);}
}
export function createInteriorArt(scene:Phaser.Scene):Phaser.GameObjects.Container{
  const root=scene.add.container(0,0);const g=scene.add.graphics();g.fillStyle(0x0b0806,1).fillRoundedRect(-188,-226,376,452,24);g.lineStyle(10,0x4b311f,1).strokeRoundedRect(-188,-226,376,452,24);
  room(g,-170,-207,143,116,0x54351f);room(g,27,-207,143,116,0x4c321f);room(g,-170,-70,143,111,0x4a2f1c);room(g,27,-70,143,111,0x55361c);room(g,-170,61,143,111,0x432b1c);room(g,27,61,143,111,0x34251c);
  // curved ribs and passage beams.
  g.fillStyle(0x6b4529,1).fillRoundedRect(-18,-210,36,388,7);for(const y of [-82,49,179])g.fillRoundedRect(-181,y,362,9,4);g.lineStyle(3,0xb17b49,.45);for(const x of [-154,-122,122,154])g.lineBetween(x,-201,x,165);
  // captain: bunk, pillow, desk, chart, chest.
  g.fillStyle(0x563720,1).fillRoundedRect(-158,-159,84,38,6);g.fillStyle(0x24394a,1).fillRoundedRect(-153,-153,74,27,5);g.fillStyle(0xe4d7bd,1).fillRoundedRect(-151,-151,20,11,5);g.fillStyle(0x704525,1).fillRoundedRect(-157,-110,61,21,4);g.fillStyle(0xd9c48d,1).fillPoints([new Phaser.Geom.Point(-149,-106),new Phaser.Geom.Point(-105,-108),new Phaser.Geom.Point(-109,-96),new Phaser.Geom.Point(-147,-95)],true);g.lineStyle(1,0x796646,.7).lineBetween(-141,-102,-118,-99);g.fillStyle(0x4a2d19,1).fillRoundedRect(-62,-145,25,27,4);
  // Sera: chart table, compass, books, hanging map.
  g.fillStyle(0x6b4325,1).fillRoundedRect(54,-160,84,36,5);g.fillStyle(0xdac58f,1).fillEllipse(96,-143,59,23);g.lineStyle(2,0x69553a,.8).strokeCircle(96,-143,9);g.lineBetween(96,-151,96,-135);g.lineBetween(88,-143,104,-143);for(let i=0;i<3;i++){g.fillStyle([0x354e61,0x7b4035,0x4d5b3e][i]!,1).fillRoundedRect(142,-157+i*9,18,7,2);}g.fillStyle(0xcbb67e,1).fillRect(45,-201,75,25);g.lineStyle(1,0x6d5c3d,.6).lineBetween(52,-190,108,-187);
  // Rowan: rack, chain, hooks, bench.
  g.fillStyle(0x42291a,1).fillRoundedRect(-156,-27,87,26,5);g.lineStyle(2,0xaeb6ba,.9);for(let i=0;i<8;i++)g.strokeCircle(-145+i*8,7+(i%2)*3,3);g.lineStyle(4,0xd0d6d8,1);g.beginPath().moveTo(-148,10).lineTo(-157,23).lineTo(-151,31).strokePath();g.beginPath().moveTo(-88,11).lineTo(-78,24).lineTo(-85,31).strokePath();g.fillStyle(0x56361f,1).fillRoundedRect(-153,27,66,10,3);
  // Galley.
  g.fillStyle(0x242527,1).fillRoundedRect(48,-44,50,42,5);g.fillStyle(0xa55227,1).fillCircle(73,-23,10);g.fillStyle(0x6b4325,1).fillRoundedRect(107,-39,50,32,4);for(let i=0;i<3;i++){g.fillStyle(0xb7aa88,1).fillCircle(116+i*14,-25,5);}g.lineStyle(2,0xb9c1c2,1).lineBetween(149,-51,149,-37);
  // bunks and personal storage.
  for(const yy of [82,118]){g.fillStyle(0x563720,1).fillRoundedRect(-157,yy,98,27,5);g.fillStyle(0x394c58,1).fillRoundedRect(-151,yy+4,86,18,4);g.fillStyle(0xd5c8ad,1).fillRoundedRect(-149,yy+5,22,10,4);}g.fillStyle(0x4b2f1c,1).fillRoundedRect(-54,91,19,51,3);
  // cargo: dimensional-ish boxes, sacks, barrel silhouettes and lashings.
  for(const [x,y] of [[49,82],[91,82],[70,119],[117,117]] as const){g.fillStyle(0x60401f,1).fillRoundedRect(x,y,34,29,3);g.fillStyle(0x8c5b2d,.7).fillRect(x+3,y+3,28,6);g.lineStyle(2,0xb77a3e,.7).strokeRoundedRect(x,y,34,29,3);}g.fillStyle(0x8a7654,1).fillEllipse(151,101,24,32);g.lineStyle(2,0xc49c66,.7).lineBetween(45,76,152,150).lineBetween(56,151,154,78);
  root.add(g);
  const lamps=scene.add.container(0,0).setDepth(20);for(const [x,y] of [[-18,-135],[-18,1],[-18,135]] as const)lamps.add(lantern(scene,x,y));root.add(lamps);root.setData('lamps',lamps);return root;
}

export function timeOfDayTint(minute:number):{shade:number;alpha:number;lampAlpha:number;waterTint:number}{
  if(minute>=20*60||minute<5*60)return{shade:0x071124,alpha:.30,lampAlpha:1,waterTint:0x557b9b};
  if(minute>=17*60&&minute<20*60)return{shade:0x7a3c2e,alpha:.13,lampAlpha:.75,waterTint:0xd08b70};
  if(minute>=5*60&&minute<7*60)return{shade:0x69434c,alpha:.09,lampAlpha:.55,waterTint:0xc39488};
  return{shade:0x102536,alpha:0,lampAlpha:.25,waterTint:0xffffff};
}
