import Phaser from 'phaser';

/** Reusable local environment compositor. No AI calls: placement is deterministic from seed. */
export type EnvironmentTheme='harbor'|'tropical'|'stone';
function hash(seed:number,i:number){let x=(seed^Math.imul(i+1,0x45d9f3b))>>>0;x=Math.imul(x^(x>>>16),0x45d9f3b);return (x^(x>>>16))>>>0;}
export function addProductionGround(scene:Phaser.Scene,w:number,h:number,seed:number,theme:EnvironmentTheme,depth=-18):Phaser.GameObjects.Container{
 const root=scene.add.container(0,0).setDepth(depth);
 const frames=theme==='tropical'?[4,5,6,7,20,21]:theme==='stone'?[32,33,34,35,48,49]:[0,1,2,3,16,17];
 for(let y=32,i=0;y<h;y+=64)for(let x=32;x<w;x+=64,i++){
   const n=hash(seed,i), frame=frames[n%frames.length];
   const tile=scene.add.image(x,y,'kenney-pirate-tiles',frame).setAlpha(.82+(n%13)/100);
   if((n&3)===0)tile.setFlipX(true); root.add(tile);
 }
 return root;
}
export function addProductionClutter(scene:Phaser.Scene,seed:number,points:Array<[number,number]>,depth=14):Phaser.GameObjects.Container{
 const root=scene.add.container(0,0).setDepth(depth);const frames=[50,51,52,53,66,67,68,69,82,83];
 points.forEach(([x,y],i)=>{const n=hash(seed,i);const p=scene.add.image(x,y,'kenney-pirate-tiles',frames[n%frames.length]).setScale(.65+(n%20)/100);if(n&1)p.setFlipX(true);root.add(p);});
 return root;
}
