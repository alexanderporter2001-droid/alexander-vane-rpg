import Phaser from 'phaser';

export type HeroRole='captain'|'navigator'|'fighter';
export type Facing='down'|'up'|'left'|'right';

interface Palette{skin:number;coat:number;accent:number;hair:number;metal:number;}

const palettes:Record<HeroRole,Palette>={
  captain:{skin:0xd8b45f,coat:0x17364a,accent:0x982c3c,hair:0x17191d,metal:0xd8b45f},
  navigator:{skin:0xc98e66,coat:0x315b72,accent:0xa13d52,hair:0x74372f,metal:0xd7bd77},
  fighter:{skin:0x9d6b4b,coat:0x2c3135,accent:0x9c3838,hair:0xd6d1c7,metal:0xc7ced2},
};

function limb(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number):void{
  g.fillStyle(0x111318,.3).fillRoundedRect(x+2,y+3,w,h,Math.min(5,w/2));
  g.fillStyle(c,1).fillRoundedRect(x,y,w,h,Math.min(5,w/2));
  g.fillStyle(0xffffff,.08).fillRoundedRect(x+2,y+2,Math.max(2,w*.22),h-5,2);
}
function hook(g:Phaser.GameObjects.Graphics,x:number,y:number,flip:number):void{
  g.lineStyle(2,0x777e82,.85);let py=y;
  for(let i=0;i<6;i++){g.strokeCircle(x+flip*(i%2),py,2.2);py+=5;}
  g.lineStyle(4,0xd7dde0,1);g.beginPath().moveTo(x,py).lineTo(x+flip*8,py+7).lineTo(x+flip*4,py+15).lineTo(x-flip*3,py+18).strokePath();
  g.lineStyle(1,0xffffff,.5).lineBetween(x+flip*7,py+8,x+flip*3,py+14);
}

export function createHeroTextures(scene:Phaser.Scene,key:string,role:HeroRole):void{
  const p=palettes[role];
  for(const facing of ['down','up','left','right'] as Facing[]){
    for(let frame=0;frame<2;frame++){
      const g=scene.add.graphics();const cx=48;const step=frame?3:-2;const side=facing==='left'?-1:facing==='right'?1:0;
      // cast shadow is baked lightly; runtime shadow adds contact.
      g.fillStyle(0x050607,.18).fillEllipse(cx,127,49,12);
      // legs with alternating stride.
      limb(g,30+side*2,89+step,13,31,0x20252b);limb(g,53+side*2,89-step,13,31,0x20252b);
      g.fillStyle(0x0b0d10,1).fillRoundedRect(25+side*2,115+step,22,9,4).fillRoundedRect(50+side*2,115-step,22,9,4);
      // torso: tapered coat, dark side plane, lapels.
      g.fillStyle(0x0a1014,.35).fillPoints([new Phaser.Geom.Point(26,54),new Phaser.Geom.Point(70,52),new Phaser.Geom.Point(76,96),new Phaser.Geom.Point(20,96)],true);
      g.fillStyle(p.coat,1).fillPoints([new Phaser.Geom.Point(27,52),new Phaser.Geom.Point(68,51),new Phaser.Geom.Point(73,92),new Phaser.Geom.Point(22,94)],true);
      g.fillStyle(0xffffff,.1).fillTriangle(29,55,40,55,28,87);g.fillStyle(0x09141a,.18).fillTriangle(68,53,58,55,71,88);
      g.fillStyle(0xeadcc4,1).fillTriangle(38,53,58,52,48,72);
      g.fillStyle(p.accent,1).fillPoints([new Phaser.Geom.Point(22,82),new Phaser.Geom.Point(72,80),new Phaser.Geom.Point(71,87),new Phaser.Geom.Point(22,89)],true);
      g.fillStyle(p.metal,1).fillCircle(47,84,2).fillCircle(56,83,2);
      // arms, with tiny movement.
      const armSwing=frame?2:-2;limb(g,14,57+armSwing,13,35,p.skin);limb(g,69,57-armSwing,13,35,p.skin);
      g.fillStyle(p.coat,1).fillRoundedRect(14,55+armSwing,13,24,5).fillRoundedRect(69,55-armSwing,13,24,5);
      // neck and shaped head.
      g.fillStyle(p.skin,1).fillRoundedRect(42,43,12,13,4);
      g.fillStyle(0x5f3528,.14).fillEllipse(50,34,31,37);g.fillStyle(p.skin,1).fillEllipse(47,32,31,37);
      // ears/nose/facial features respect facing.
      if(facing!=='up'){
        g.fillStyle(0x251b19,1);
        if(facing==='down')g.fillEllipse(41,32,3,2).fillEllipse(53,32,3,2);
        else g.fillEllipse(47+side*7,32,3,2);
        g.fillStyle(0x8d5b46,.65).fillTriangle(47+side*2,34,45+side*4,39,50+side*4,39);
        g.lineStyle(1,0x60352d,.7).lineBetween(42+side*3,43,52+side*3,43);
      }
      // hair silhouette, with irregular locks.
      g.fillStyle(p.hair,1).fillEllipse(47,21,38,23);
      g.fillTriangle(28,22,24,38,36,29).fillTriangle(66,20,70,38,58,29);
      if(role==='navigator'){g.fillRoundedRect(27,20,8,41,4).fillRoundedRect(60,20,8,43,4);g.fillStyle(0xd6b66e,1).fillCircle(74,67,7);g.lineStyle(2,0x1d2a35,1).strokeCircle(74,67,5);g.lineBetween(74,62,74,72);g.lineBetween(69,67,79,67);}
      if(role==='captain'){
        // asymmetrical long captain coat and hat brim.
        g.fillStyle(0x15181d,1).fillEllipse(47,17,49,14);g.fillStyle(0x20242b,1).fillPoints([new Phaser.Geom.Point(29,17),new Phaser.Geom.Point(38,5),new Phaser.Geom.Point(58,5),new Phaser.Geom.Point(67,17)],true);
        g.lineStyle(2,p.metal,1).lineBetween(26,18,68,18);
        g.fillStyle(p.accent,1).fillPoints([new Phaser.Geom.Point(23,61),new Phaser.Geom.Point(8,111),new Phaser.Geom.Point(31,98)],true).fillPoints([new Phaser.Geom.Point(72,60),new Phaser.Geom.Point(88,111),new Phaser.Geom.Point(64,98)],true);
        g.lineStyle(2,p.metal,.8).lineBetween(25,64,13,103).lineBetween(70,63,83,103);
      }
      if(role==='fighter'){
        // shoulder wraps, chain belt, unmistakable chain hooks.
        g.fillStyle(0x171b20,1).fillTriangle(18,55,29,47,34,60).fillTriangle(77,54,66,47,62,60);
        g.lineStyle(2,0xaeb5b8,.9);for(let i=0;i<8;i++)g.strokeCircle(29+i*5,85+(i%2),2.1);
        hook(g,13,77,-1);hook(g,82,76,1);
      }
      if(facing==='up')g.fillStyle(p.hair,1).fillEllipse(47,31,31,28);
      g.generateTexture(`${key}-${facing}-${frame}`,96,136);g.destroy();
    }
  }
}

export function heroTexture(key:string,facing:Facing,frame:number):string{return `${key}-${facing}-${frame&1}`;}
export function facingFromMotion(x:number,y:number,current:Facing='down'):Facing{
  if(Math.abs(x)<.08&&Math.abs(y)<.08)return current;
  if(Math.abs(x)>Math.abs(y))return x<0?'left':'right';
  return y<0?'up':'down';
}
