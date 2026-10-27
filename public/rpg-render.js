import {WORLD,TYPES,tile,safe} from './rpg-world.js';
const colors={grass:'#668650',forest:'#426848',ruins:'#888879',water:'#447f91',bridge:'#a28b63',camp:'#9c916a',wall:'#384f40'};
export function createRenderer(canvas){
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;let state=null,from=null,changed=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
 function person(x,y){
  rect(x+10,y+27,15,3,'#24382888');rect(x+11,y+23,4,6,'#2e3235');rect(x+19,y+23,4,6,'#2e3235');
  rect(x+9,y+13,16,12,'#bc6a43');rect(x+12,y+6,10,9,'#edc298');rect(x+10,y+3,14,6,'#405d75');rect(x+8,y+8,18,3,'#405d75');rect(x+24,y+12,2,14,'#e4dfc4');rect(x+22,y+20,6,2,'#e1b66d');
 }
 function monster(m,x,y){
  const c=TYPES[m.kind].color;rect(x+7,y+26,20,4,'#24382866');
  if(m.kind==='slime'){rect(x+6,y+15,22,12,c);rect(x+10,y+11,14,5,c);rect(x+12,y+18,3,3,'#233824');rect(x+21,y+18,3,3,'#233824');rect(x+9,y+14,5,2,'#d8f0b2');}
  else if(m.kind==='wolf'){rect(x+7,y+14,19,10,c);rect(x+20,y+9,9,10,c);rect(x+19,y+6,4,7,'#73838c');rect(x+26,y+6,3,7,'#73838c');rect(x+7,y+23,4,5,c);rect(x+22,y+23,4,5,c);rect(x+3,y+12,5,4,c);rect(x+25,y+12,2,2,'#552b27');}
  else{rect(x+11,y+5,12,10,c);rect(x+12,y+17,10,8,c);rect(x+10,y+24,4,5,c);rect(x+21,y+24,4,5,c);rect(x+7,y+16,4,8,c);rect(x+25,y+13,3,14,'#a6afb1');rect(x+13,y+9,3,3,'#3e3b37');rect(x+20,y+9,3,3,'#3e3b37');}
  rect(x+4,y,24,3,'#49342d');rect(x+4,y,Math.max(0,24*m.hp/m.maxHp),3,'#df8b64');
 }
 function node(n,x,y){
  if(!n.available)return;
  if(n.kind==='chest'){rect(x+7,y+12,19,14,'#8f5c37');rect(x+7,y+11,19,4,'#cd9c4f');rect(x+15,y+15,4,5,'#f0d078');}
  else if(n.kind==='herb'){rect(x+15,y+14,3,14,'#334d28');rect(x+8,y+16,9,6,'#a6ca71');rect(x+17,y+10,7,8,'#bad47e');rect(x+12,y+8,4,4,'#e8d59f');}
  else if(n.kind==='wood'){rect(x+6,y+17,22,9,'#866046');rect(x+6,y+17,5,9,'#c39f67');rect(x+14,y+16,3,10,'#574732');}
  else{rect(x+7,y+17,21,11,'#5e696b');rect(x+12,y+12,12,8,'#8f9d9b');rect(x+14,y+15,3,4,'#d2d6bd');}
 }
 function draw(now){
  if(!state){ctx.fillStyle='#304b36';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e5dfc3';ctx.font='14px Arial';ctx.textAlign='center';ctx.fillText('Menghubungkan dunia…',canvas.width/2,canvas.height/2);return;}
  const p=state.player,t=reduced?1:Math.min(1,(now-changed)/180);const pos={x:from.x+(p.x-from.x)*t,y:from.y+(p.y-from.y)*t};
  const camera={x:Math.max(0,Math.min(WORLD.width-13,pos.x-6)),y:Math.max(0,Math.min(WORLD.height-11,pos.y-5))};
  for(let y=Math.floor(camera.y);y<=Math.ceil(camera.y+11);y++)for(let x=Math.floor(camera.x);x<=Math.ceil(camera.x+13);x++){
   const kind=tile(x,y),sx=(x-camera.x)*32,sy=(y-camera.y)*32;rect(sx,sy,33,33,colors[kind]);
   if(kind==='grass'||kind==='forest'){const h=(x*73+y*37)%23;rect(sx+4+h%12,sy+8+h%15,2,4,kind==='forest'?'#30553a':'#587744');rect(sx+22,sy+20,3,2,'#89a16a');if(kind==='forest'&&h<5){rect(sx+2,sy+5,10,12,'#294c35');rect(sx+4,sy+2,6,4,'#355b3a');}}
   if(kind==='water'){rect(sx+3,sy+9,11,2,'#6fa5ae');rect(sx+19,sy+23,8,2,'#336678');}
   if(kind==='bridge'){rect(sx+2,sy+2,28,2,'#75583c');rect(sx+2,sy+16,28,2,'#75583c');}
   if(kind==='ruins'){rect(sx+2,sy+3,23,1,'#a1a18e');rect(sx+25,sy+4,1,11,'#747769');}
   if(kind==='wall'){rect(sx+4,sy+6,23,24,'#526756');rect(sx+7,sy+4,17,5,'#75816a');}
  }
  const sx=(WORLD.camp.x-camera.x)*32,sy=(WORLD.camp.y-camera.y)*32;
  rect(sx+5,sy+23,23,5,'#66513a');rect(sx+10,sy+12,12,13,'#e89445');rect(sx+14,sy+7,6,15,'#f7cc6c');
  state.nodes.forEach(n=>node(n,(n.x-camera.x)*32,(n.y-camera.y)*32));
  const actors=state.monsters.filter(m=>m.hp>0).map(m=>({y:m.y,draw:()=>monster(m,(m.x-camera.x)*32,(m.y-camera.y)*32)}));actors.push({y:pos.y,draw:()=>person((pos.x-camera.x)*32,(pos.y-camera.y)*32)});actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
 }
 return {update(next){from=state?{x:state.player.x,y:state.player.y}:{x:next.player.x,y:next.player.y};state=next;changed=performance.now();},draw,minimap(target){if(!state)return;const c=target.getContext('2d');for(let y=0;y<WORLD.height;y++)for(let x=0;x<WORLD.width;x++){c.fillStyle=colors[tile(x,y)];c.fillRect(x*10,y*10,10,10);}for(const n of state.nodes)if(n.available){c.fillStyle='#f8d076';c.fillRect(n.x*10+2,n.y*10+2,6,6);}for(const m of state.monsters)if(m.hp>0){c.fillStyle='#df7064';c.fillRect(m.x*10+2,m.y*10+2,6,6);}c.fillStyle='#ffffff';c.fillRect(state.player.x*10+1,state.player.y*10+1,8,8);}};
}
