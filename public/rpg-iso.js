import {WORLD,tile,walkable} from './rpg-world.js';
import {storyTarget} from './rpg-story.js';
import {moveVector} from './rpg-motion.js';
const colors={grass:'#3d4c40',forest:'#2c4035',camp:'#696352',ruins:'#59615c',bridge:'#7c6b50',water:'#284550',wall:'#35443c'};
export function createRenderer(canvas){
 const c=canvas.getContext('2d');canvas.width=832;canvas.height=704;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let state,from,target,changed=0,old={},facing='down',swing=-1000,hurt=-1000,visual=null,walking=false;
 function position(now){if(!target)return null;const t=reduced?1:Math.max(0,Math.min(1,(now-changed)/260));return {x:from.x+(target.x-from.x)*t,y:from.y+(target.y-from.y)*t};}
 function poly(points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
 function oval(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 function line(points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
 function label(text,x,y){c.font='10px Georgia';c.textAlign='center';c.strokeStyle='#15201c';c.lineWidth=3;c.strokeText(text,x,y);c.fillStyle='#f0ddaa';c.fillText(text,x,y);}
 function person(x,y,now,moving=false,npc=false,skeleton=false){
  const step=moving&&!reduced?Math.sin(now/65)*5:0;
  oval(x,y+1,12,4,'#0d171b77');
  line([[x-4,y-14],[x-5-step*.5,y-7],[x-5-step,y]],'#222d31',5);
  line([[x+4,y-14],[x+5+step*.5,y-7],[x+5+step,y]],'#455154',5);
  poly([[x-7,y-30],[x+7,y-30],[x+11,y-7],[x-11,y-7]],npc?'#78604a':'#354e59');
  poly([[x-6,y-28],[x+5,y-28],[x+7,y-17],[x,y-13],[x-7,y-17]],skeleton?'#c4c1af':'#829497');
  line([[x,y-27],[x,y-16]],'#c2ccc0',1);line([[x-5,y-22],[x+5,y-22]],'#536b70',1);
  line([[x-7,y-14],[x+7,y-14]],'#9e825a',2);oval(x,y-14,2,2,'#d1b981');
  line([[x-8,y-26],[x-12,y-19-step*.4],[x-10,y-14-step*.4]],'#78888a',4);
  line([[x+8,y-26],[x+12,y-21+step*.4],[x+14,y-16+step*.4]],'#92a19c',4);
  oval(x,y-35,5.5,7,skeleton?'#d6cdb3':'#c4ad95');
  if(npc)oval(x,y-40,7,4,'#695748');
  else{poly([[x-6,y-36],[x-4,y-42],[x+4,y-42],[x+7,y-35],[x+1,y-34]],'#70868d');line([[x-4,y-34],[x+4,y-34]],'#243438',2);}
  if(!npc&&!skeleton){const left=facing==='left'||facing==='up';oval(x+(left?-2:2),y-33,1,1,'#222d31');}
  const attackPhase=!npc&&!skeleton&&now-swing<320?Math.sin((now-swing)/320*Math.PI):0;
  line([[x+14,y-17],[x+20+attackPhase*14,y-36+attackPhase*22]],'#d6e1d8',2.5);line([[x+11,y-20],[x+18,y-18]],'#c8ae77',2);
 }
 function tree(x,y){oval(x,y,18,6,'#172c2277');line([[x,y],[x,y-40]],'#584b3d',5);for(let i=0;i<3;i++){const h=i*13;poly([[x-22+i*4,y-15-h],[x,y-48-i*12],[x+22-i*4,y-15-h]],i===2?'#4f6a51':'#344f3b');for(let j=0;j<4;j++)line([[x,y-42-h+j*6],[x+12-i*2,y-28-h+j*3]],'#638164',.7);}}
 function pillar(x,y){poly([[x-9,y],[x-9,y-28],[x+2,y-33],[x+11,y-28],[x+11,y-2]],'#7b8580');poly([[x+2,y-33],[x+11,y-28],[x+11,y-2],[x+2,y]],'#4b5754');line([[x-7,y-20],[x+1,y-18]],'#45534c',1);}
 function resource(n,x,y){
  if(n.kind==='chest'){poly([[x-11,y],[x-11,y-12],[x+4,y-17],[x+13,y-12],[x+13,y],[x,y+4]],'#8b693f');line([[x-10,y-8],[x+3,y-4],[x+12,y-9]],'#ceb77c',2);oval(x+3,y-4,2,3,'#ead39c');}
  else if(n.kind==='herb'){for(let i=-1;i<=1;i++){line([[x,y],[x+i*8,y-15]],'#879e6a',2);oval(x+i*7,y-12,4,2,'#a7b78a');}}
  else if(n.kind==='wood'){line([[x-9,y],[x+9,y-6]],'#7c5d43',7);oval(x-9,y,3,4,'#baa174');}
  else poly([[x-12,y],[x-5,y-12],[x+5,y-15],[x+13,y-3],[x+3,y+3]],'#99a6a4');
 }
 function monster(m,x,y,now,moving){
  const previous=old[m.id]||m;if(now<hurt&&Math.hypot(m.x-state.player.x,m.y-state.player.y)<1.5){const lunge=Math.sin((350-(hurt-now))/350*Math.PI)*8;x+=Math.sign(state.player.x-m.x-state.player.y+m.y)*lunge;y-=lunge*.3;}const dx=m.x-previous.x,dy=m.y-previous.y;
  const screenDirection=(dx-dy)||((state.player.x-m.x)-(state.player.y-m.y));
  c.save();c.translate(x,y);if(screenDirection<0)c.scale(-1,1);x=0;y=0;
  oval(x,y,12,4,'#15251e88');
  if(m.kind==='skeleton')person(x,y,now,moving,false,true);
  else if(m.kind==='wolf'){const step=moving&&!reduced?Math.sin(now/70)*4:0;line([[x-8,y-12],[x-10-step,y]],'#687b7d',3);line([[x+8,y-11],[x+10+step,y]],'#9ca7a3',3);oval(x,y-14,14,7,'#81938e');poly([[x+6,y-17],[x+9,y-29],[x+14,y-24],[x+18,y-29],[x+21,y-16],[x+15,y-10]],'#acb4a9');line([[x-12,y-16],[x-22,y-25]],'#718782',4);oval(x+17,y-20,1.4,1.4,'#d7bf8a');}
  else{oval(x,y-7,13,9,'#708f72');oval(x-3,y-11,7,6,'#a5b88e');oval(x-5,y-7,1.6,2,'#203b31');oval(x+5,y-7,1.6,2,'#203b31');}
  c.restore();x=arguments[1];y=arguments[2];
  const h=m.kind==='skeleton'?49:35;c.fillStyle='#252c27';c.fillRect(x-14,y-h,28,3);c.fillStyle='#c58b74';c.fillRect(x-14,y-h,28*Math.max(0,m.hp/m.maxHp),3);
  if(m.id==='m11'&&state.story?.stage===3)label('Penjaga Segel',x,y-h-6);
 }
 function draw(now){
  c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,416,352);c.fillStyle='#1c2b27';c.fillRect(0,0,416,352);
  if(!state){label('Menghubungkan dunia…',208,176);return;}
  const p=visual||position(now),project=(x,y)=>({x:208+((x-p.x)-(y-p.y))*25,y:190+((x-p.x)+(y-p.y))*12.5}),actors=[];
  for(let y=Math.max(0,Math.floor(p.y)-17);y<Math.min(WORLD.height,p.y+18);y++)for(let x=Math.max(0,Math.floor(p.x)-17);x<Math.min(WORLD.width,p.x+18);x++){
   const s=project(x,y);if(s.x< -60||s.x>476||s.y< -40||s.y>440)continue;const kind=tile(x,y),seed=(x*137+y*71)%31;
   poly([[s.x,s.y-12.5],[s.x+25.3,s.y],[s.x,s.y+12.7],[s.x-25.3,s.y]],colors[kind]);
   if(kind==='water')line([[s.x-8,s.y],[s.x+5,s.y+2]],'#597e82',.6);
   else if(kind==='bridge')line([[s.x-18,s.y-2],[s.x+3,s.y+9]],'#bba47b',1);
   else if(seed%3===0)line([[s.x-5,s.y],[s.x-3,s.y-3],[s.x-1,s.y]],kind==='ruins'?'#818d7f':'#687c5b',.7);
   // Vegetasi diposisikan di tepi petak agar jalur tetap terbaca.
   if(kind==='forest'&&seed<5)actors.push({depth:x+y,draw:()=>tree(s.x+14,s.y+6)});
   if(kind==='wall')actors.push({depth:x+y,draw:()=>pillar(s.x,s.y)});
  }
  for(const [x,y] of [[3,4],[7,3]]){const s=project(x,y);actors.push({depth:x+y,draw:()=>{poly([[s.x-25,s.y],[s.x-3,s.y-42],[s.x+28,s.y-4]],'#758581');poly([[s.x-3,s.y-42],[s.x+8,s.y-14],[s.x+28,s.y-4],[s.x+5,s.y-44]],'#3b5357');poly([[s.x-8,s.y-3],[s.x-2,s.y-27],[s.x+7,s.y-3]],'#253731');}});}
  const f=project(WORLD.camp.x,WORLD.camp.y);actors.push({depth:10,draw:()=>{oval(f.x,f.y,11,5,'#293630');poly([[f.x-6,f.y],[f.x,f.y-20],[f.x+7,f.y]],'#cea56b');poly([[f.x-3,f.y],[f.x+2,f.y-13],[f.x+4,f.y]],'#f3dda6');}});
  state.nodes.filter(n=>n.available).forEach(n=>{const s=project(n.x,n.y);actors.push({depth:n.x+n.y,draw:()=>resource(n,s.x,s.y)});});
  const destination=storyTarget(state.story);if(destination){const s=project(destination.x,destination.y);actors.push({depth:destination.x+destination.y,draw:()=>{if(destination.label==='Nara')person(s.x,s.y,now,false,true);else pillar(s.x,s.y);label(destination.label,s.x,s.y-54);poly([[s.x,s.y-49],[s.x+3,s.y-45],[s.x,s.y-41],[s.x-3,s.y-45]],'#e5ce92');}});}
  for(const m of state.monsters.filter(m=>m.hp>0)){const prev=old[m.id]||m,t=reduced?1:Math.min(1,Math.max(0,(now-changed)/300)),x=prev.x+(m.x-prev.x)*t,y=prev.y+(m.y-prev.y)*t,s=project(x,y);actors.push({depth:x+y,draw:()=>{monster(m,s.x,s.y,now,t<1&&(prev.x!==m.x||prev.y!==m.y));if(m.hp<prev.hp&&now-changed<700)label('-'+(prev.hp-m.hp),s.x,s.y-53-(now-changed)/35);}});}
  const s=project(p.x,p.y);actors.push({depth:p.x+p.y+.01,draw:()=>{person(s.x,s.y,now,walking);if(now<hurt)oval(s.x,s.y-25,9,16,'#cf775544');if(now-swing<320){const angles={right:.46,down:2.68,left:3.6,up:5.82},a=angles[facing],t=(now-swing)/320;c.beginPath();c.ellipse(s.x,s.y-20,29,19,0,a-.8+t,a+.3+t);c.strokeStyle='#eddba7';c.lineWidth=3*(1-t)+.5;c.stroke();}}});
  actors.sort((a,b)=>a.depth-b.depth).forEach(a=>a.draw());
  const shade=c.createRadialGradient(208,180,100,208,180,290);shade.addColorStop(0,'#111a1d00');shade.addColorStop(1,'#0c141b99');c.fillStyle=shade;c.fillRect(0,0,416,352);
 }
 function animate(type,extra={}){
  if(!state)return;const now=performance.now();
  if(type==='walk'){const v=extra.vector;facing=Math.abs(v.x)>Math.abs(v.y)?(v.x>0?'right':'left'):(v.y>0?'down':'up');from=position(now);target=moveVector(state.player,v,extra.seconds,state.monsters);changed=now;}
  if(type==='attack'){swing=now;const m=state.monsters.find(m=>m.hp>0&&Math.hypot(m.x-state.player.x,m.y-state.player.y)<=1.4);if(m)facing=m.x!==state.player.x?(m.x>state.player.x?'right':'left'):(m.y>state.player.y?'down':'up');}
  if(type==='move'){const d=({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[extra.direction];if(d)animate('walk',{vector:{x:d[0],y:d[1]},seconds:1/3});}
 }
 return {draw,animate,preview(p,moving,v){visual={x:p.x,y:p.y};walking=moving;if(v&&typeof v==='object')facing=Math.abs(v.x)>Math.abs(v.y)?(v.x>0?'right':'left'):(v.y>0?'down':'up');},update(next){const now=performance.now();from=position(now)||{x:next.player.x,y:next.player.y};target={x:next.player.x,y:next.player.y};old=Object.fromEntries((state?.monsters||[]).map(m=>[m.id,{...m}]));if(state&&next.player.hp<state.player.hp)hurt=now+350;state=next;changed=now;},minimap(targetCanvas){if(!state)return;const ctx=targetCanvas.getContext('2d');for(let y=0;y<WORLD.height;y++)for(let x=0;x<WORLD.width;x++){ctx.fillStyle=colors[tile(x,y)];ctx.fillRect(x*10,y*10,10,10);}const destination=storyTarget(state.story);if(destination){ctx.fillStyle='#e5cc8d';ctx.fillRect(destination.x*10,destination.y*10,8,8);}for(const m of state.monsters)if(m.hp>0){ctx.fillStyle='#c18a78';ctx.fillRect(m.x*10+2,m.y*10+2,5,5);}ctx.fillStyle='#ffffff';ctx.fillRect(state.player.x*10,state.player.y*10,8,8);}};
}
