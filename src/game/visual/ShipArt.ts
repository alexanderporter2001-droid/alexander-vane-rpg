import Phaser from 'phaser';

export function createDeckArt(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const root=scene.add.container(0,0);
  const hull=scene.add.graphics();
  hull.fillStyle(0x07141b,.34).fillEllipse(0,34,500,650);
  hull.fillStyle(0x24140d,1).fillPoints([
    new Phaser.Geom.Point(-205,-245),new Phaser.Geom.Point(150,-270),
    new Phaser.Geom.Point(222,205),new Phaser.Geom.Point(-128,286)
  ],true);
  hull.lineStyle(12,0x120b08,1).strokePoints([
    new Phaser.Geom.Point(-205,-245),new Phaser.Geom.Point(150,-270),
    new Phaser.Geom.Point(222,205),new Phaser.Geom.Point(-128,286)
  ],true);
  hull.fillStyle(0x8a582d,1).fillPoints([
    new Phaser.Geom.Point(-185,-228),new Phaser.Geom.Point(135,-250),
    new Phaser.Geom.Point(198,188),new Phaser.Geom.Point(-112,262)
  ],true);
  // Curved plank courses and seams.
  hull.lineStyle(3,0x4a2b19,.75);
  for(let y=-205;y<245;y+=28) hull.lineBetween(-170,y,185,y-38);
  hull.lineStyle(1,0xe0a45d,.28);
  for(let x=-140;x<160;x+=34) hull.lineBetween(x,-225,x+56,225);
  // Quarterdeck, bow platform and stair lips.
  hull.fillStyle(0x59351d,1).fillPoints([
    new Phaser.Geom.Point(25,-224),new Phaser.Geom.Point(132,-235),
    new Phaser.Geom.Point(162,-95),new Phaser.Geom.Point(42,-82)
  ],true);
  hull.lineStyle(5,0xd09a55,.85).strokePoints([
    new Phaser.Geom.Point(25,-224),new Phaser.Geom.Point(132,-235),
    new Phaser.Geom.Point(162,-95),new Phaser.Geom.Point(42,-82)
  ],true);
  hull.fillStyle(0x6f4626,1).fillPoints([
    new Phaser.Geom.Point(-164,176),new Phaser.Geom.Point(-85,238),
    new Phaser.Geom.Point(55,204),new Phaser.Geom.Point(-30,153)
  ],true);
  // Hatch with inset grating.
  hull.fillStyle(0x1b110c,1).fillRoundedRect(-36,35,116,88,9);
  hull.lineStyle(6,0xd09a55,.9).strokeRoundedRect(-36,35,116,88,9);
  hull.lineStyle(3,0x8f6138,.95);
  for(let y=52;y<116;y+=16) hull.lineBetween(-25,y,69,y);
  for(let x=-18;x<72;x+=19) hull.lineBetween(x,47,x,114);
  root.add(hull);

  // Railings live above the floor and help characters feel embedded.
  const rail=scene.add.graphics().setDepth(18);
  rail.lineStyle(7,0x321d12,1); rail.lineBetween(-183,-220,-111,251); rail.lineBetween(137,-242,196,180);
  rail.lineStyle(3,0xd4a363,1); rail.lineBetween(-178,-218,-107,247); rail.lineBetween(133,-240,192,178);
  for(let i=0;i<9;i++){const y=-194+i*52;const lx=-174+i*8;rail.fillStyle(0x68401f,1).fillRoundedRect(lx-5,y-12,10,29,4);rail.fillStyle(0xe0b26d,1).fillCircle(lx,y-13,5);}
  for(let i=0;i<8;i++){const y=-215+i*50;const rx=140+i*7;rail.fillStyle(0x68401f,1).fillRoundedRect(rx-5,y-12,10,29,4);rail.fillStyle(0xe0b26d,1).fillCircle(rx,y-13,5);}
  root.add(rail);

  // Masts: shadow, timber highlight, bands and rigging.
  const rig=scene.add.graphics().setDepth(16);
  for(const [x,y,h] of [[-72,-245,440],[73,-242,305]] as const){
    rig.fillStyle(0x1b100b,.35).fillEllipse(x+7,y+h-2,42,13);
    rig.fillStyle(0x3a2113,1).fillRoundedRect(x-13,y,26,h,9);
    rig.fillStyle(0xa56c36,1).fillRoundedRect(x-6,y,10,h,5);
    rig.fillStyle(0x202127,1);for(let by=y+62;by<y+h;by+=90)rig.fillRect(x-14,by,28,11);
  }
  rig.lineStyle(3,0xd5aa70,.88);
  rig.lineBetween(-72,-218,-167,-126);rig.lineBetween(-72,-202,172,-190);
  rig.lineBetween(73,-211,183,-89);rig.lineBetween(-72,-122,-143,158);
  rig.lineStyle(2,0x725039,.7);for(let y=-165;y<85;y+=25)rig.lineBetween(-146,y,-91,y+5);
  root.add(rig);

  // Wheel and binnacle.
  const wheel=scene.add.graphics().setDepth(17);
  wheel.fillStyle(0x24150e,1).fillCircle(98,-167,28);wheel.lineStyle(6,0xc88f4d,1).strokeCircle(98,-167,28);
  for(let a=0;a<Math.PI*2;a+=Math.PI/6)wheel.lineBetween(98+Math.cos(a)*17,-167+Math.sin(a)*17,98+Math.cos(a)*39,-167+Math.sin(a)*39);
  wheel.fillStyle(0x6a4325,1).fillRoundedRect(76,-137,44,31,6);
  root.add(wheel);

  const props=scene.add.graphics().setDepth(15);
  const crates=[[-135,20],[-120,66],[128,15],[145,58]] as const;
  for(const [x,y] of crates){props.fillStyle(0x67401f,1).fillRoundedRect(x-19,y-18,38,36,4);props.lineStyle(3,0xb97c3e,1).strokeRoundedRect(x-19,y-18,38,36,4);props.lineBetween(x-17,y-16,x+17,y+16);props.lineBetween(x+17,y-16,x-17,y+16);}
  for(const [x,y] of [[-142,-66],[151,-52],[-70,190]] as const){props.fillStyle(0x4f301b,1).fillEllipse(x,y,36,47);props.lineStyle(4,0xbd8145,1).strokeEllipse(x,y,36,47);props.lineBetween(x-16,y,x+16,y);}
  // Rope coils.
  props.lineStyle(4,0xd2aa72,.9);for(const [x,y] of [[-148,130],[130,120]] as const){for(let r=8;r<=20;r+=6)props.strokeCircle(x,y,r);}
  root.add(props);

  const lamps=scene.add.container(0,0).setDepth(20);
  for(const [x,y] of [[-155,-118],[166,-102],[104,162]] as const){
    const glow=scene.add.circle(x,y,34,0xffc45c,.13).setBlendMode(Phaser.BlendModes.ADD);
    const body=scene.add.graphics();body.fillStyle(0xffd77c,1).fillCircle(x,y,5);body.lineStyle(2,0x4b2b18,1).strokeRoundedRect(x-6,y-10,12,20,3);
    lamps.add([glow,body]);
  }
  root.add(lamps);
  root.setData('lamps',lamps);
  return root;
}

function room(scene:Phaser.Scene,g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,floor:number):void{
  g.fillStyle(0x26160f,1).fillRoundedRect(x,y,w,h,9);
  g.fillStyle(floor,1).fillRoundedRect(x+5,y+5,w-10,h-10,7);
  g.lineStyle(3,0x9b7046,.75).strokeRoundedRect(x,y,w,h,9);
  for(let yy=y+16;yy<y+h-8;yy+=15){g.lineStyle(1,0xd5a264,.16).lineBetween(x+7,yy,x+w-7,yy);}
}

export function createInteriorArt(scene:Phaser.Scene):Phaser.GameObjects.Container{
  const root=scene.add.container(0,0);const g=scene.add.graphics();
  g.fillStyle(0x100b08,.98).fillRoundedRect(-190,-230,380,460,26);
  g.lineStyle(8,0x5e4028,1).strokeRoundedRect(-190,-230,380,460,26);
  room(scene,g,-172,-208,145,118,0x5a3922);room(scene,g,27,-208,145,118,0x553720);
  room(scene,g,-172,-70,145,112,0x4e321f);room(scene,g,27,-70,145,112,0x60401f);
  room(scene,g,-172,62,145,112,0x49301e);room(scene,g,27,62,145,112,0x3e2b20);
  g.fillStyle(0x684327,1).fillRoundedRect(-18,-210,36,386,7);
  g.fillStyle(0x2b1b12,1).fillRoundedRect(-52,184,104,25,7);
  g.lineStyle(4,0xb88953,.8).strokeRoundedRect(-52,184,104,25,7);
  // Captain bunk + chart desk.
  g.fillStyle(0x5b3a24,1).fillRoundedRect(-157,-152,82,34,6);g.fillStyle(0x26384a,1).fillRoundedRect(-151,-147,70,24,5);
  g.fillStyle(0x70482a,1).fillRoundedRect(-158,-105,58,18,4);g.fillStyle(0xd7c79a,1).fillRect(-151,-101,43,10);
  // Sera cabin chart table / compass.
  g.fillStyle(0x70482a,1).fillRoundedRect(60,-158,76,35,5);g.fillStyle(0xd9c795,1).fillEllipse(98,-141,53,22);
  g.lineStyle(2,0x6d4930,.8).strokeCircle(98,-141,10);
  // Rowan rack / hooks.
  g.fillStyle(0x4a2e1c,1).fillRoundedRect(-151,-20,84,25,5);g.lineStyle(3,0xc3c9ca,1);
  g.beginPath().moveTo(-137,4).lineTo(-145,19).lineTo(-137,27).strokePath();g.beginPath().moveTo(-83,4).lineTo(-75,19).lineTo(-83,27).strokePath();
  // Galley stove/table.
  g.fillStyle(0x28282a,1).fillRoundedRect(53,-40,48,39,5);g.fillStyle(0x8d4b22,1).fillCircle(77,-20,10);
  g.fillStyle(0x6c4426,1).fillRoundedRect(108,-36,47,31,4);
  // Berths.
  for(const yy of [84,119]){g.fillStyle(0x5d3b25,1).fillRoundedRect(-155,yy,96,25,5);g.fillStyle(0x394a55,1).fillRoundedRect(-149,yy+4,84,16,4);}
  // Cargo.
  for(const [x,y] of [[58,89],[103,90],[81,132],[128,130]] as const){g.fillStyle(0x65401f,1).fillRoundedRect(x,y,34,30,3);g.lineStyle(2,0xb87a3d,1).strokeRoundedRect(x,y,34,30,3);}
  root.add(g);
  // Warm practical lights.
  for(const [x,y] of [[-18,-130],[-18,5],[-18,135]] as const){root.add(scene.add.circle(x,y,40,0xffb84f,.09).setBlendMode(Phaser.BlendModes.ADD));root.add(scene.add.circle(x,y,4,0xffd47a,1));}
  return root;
}

export function timeOfDayTint(minute:number):{shade:number;alpha:number;lampAlpha:number}{
  if(minute>=20*60||minute<5*60)return{shade:0x081124,alpha:.43,lampAlpha:1};
  if(minute>=17*60&&minute<20*60)return{shade:0x5a2941,alpha:.18,lampAlpha:.72};
  if(minute>=5*60&&minute<7*60)return{shade:0x473047,alpha:.12,lampAlpha:.5};
  return{shade:0x102536,alpha:0,lampAlpha:.3};
}
