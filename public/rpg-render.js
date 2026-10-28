import {WORLD,TYPES,tile,safe} from './rpg-world.js';

const colors={grass:'#78965f',forest:'#496b4e',ruins:'#9d9a84',water:'#4e8790',bridge:'#b49566',camp:'#ad986d',wall:'#405746'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function createRenderer(canvas){
 const ctx=canvas.getContext('2d');let state=null,from=null,changed=0,direction='down',motion={kind:'idle',at:0};
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const rounded=(x,y,w,h,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
 const line=(points,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.stroke();};

 function drawGround(sx,sy,kind,now,worldX,worldY){
  ctx.fillStyle=colors[kind];ctx.fillRect(sx,sy,32,32);
   const seed=(worldX*73+worldY*37)%19;
  if(kind==='grass'||kind==='forest'){
   ellipse(sx+7+seed%14,sy+8+(seed*3)%16,2,1.1,kind==='forest'?'#5c8058':'#91a875');
   ellipse(sx+25,sy+22,1.6,1,'#b4bd7c');
   if(kind==='forest'&&seed<5){
    ellipse(sx+17,sy+27,13,4,'#344f3b88');rounded(sx+14,sy+17,6,12,3,'#6b5941');
    ellipse(sx+15,sy+13,11,10,'#315a3e');ellipse(sx+22,sy+10,9,9,'#3c6946');ellipse(sx+11,sy+8,7,7,'#527c52');
   }
  }else if(kind==='water'){
   const drift=reduced?0:((now/900+worldX*13+worldY*7)%12);
   line([[sx+4+drift,sy+10],[sx+11+drift,sy+10]],'#83b6ad',1.4);
   line([[sx+17-drift/2,sy+23],[sx+25-drift/2,sy+23]],'#36717b',1.2);
  }else if(kind==='bridge'){
   rounded(sx+1,sy+2,30,28,3,'#8a6c4b');
   for(let i=0;i<4;i++)rounded(sx+3,sy+4+i*6,26,4,1,i%2?'#bd9a69':'#a9855a');
   line([[sx+2,sy+2],[sx+30,sy+2]],'#dfbc83',1);
  }else if(kind==='ruins'){
   rounded(sx+3,sy+4,24,22,4,'#aaa58e');rounded(sx+6,sy+7,18,3,1,'#cbc2a7');
   line([[sx+8,sy+17],[sx+14,sy+15],[sx+19,sy+18]],'#817f72',1.2);
  }else if(kind==='wall'){
   rounded(sx+2,sy+4,28,26,5,'#586c55');rounded(sx+6,sy+2,20,7,3,'#788265');
  }else if(kind==='camp'){
   ellipse(sx+16,sy+22,12,5,'#91805266');
  }
 }

 function drawCamp(x,y,now){
  const cx=x+16,base=y+25,flicker=reduced?0:Math.sin(now/95)*1.4;
  ellipse(cx,base+4,15,5,'#3f47345a');
  line([[cx-10,base+2],[cx+10,base+2]],'#705238',5);
  line([[cx-7,base+5],[cx+8,base-1]],'#9a7046',3);
  ctx.fillStyle='#ee9b4c';ctx.beginPath();ctx.moveTo(cx,base-18-flicker);ctx.quadraticCurveTo(cx+13,base-5,cx+5,base-1);ctx.quadraticCurveTo(cx-1,base+2,cx-5,base-3);ctx.quadraticCurveTo(cx-10,base-8,cx,base-18-flicker);ctx.fill();
  ctx.fillStyle='#ffe29a';ctx.beginPath();ctx.moveTo(cx,base-11-flicker*.4);ctx.quadraticCurveTo(cx+6,base-3,cx+1,base);ctx.quadraticCurveTo(cx-5,base-2,cx,base-11-flicker*.4);ctx.fill();
 }

 function drawPlayer(x,y,now,dir,active){
  const t=(now-motion.at)/1000,walking=active==='move',bob=reduced?0:(walking?Math.abs(Math.sin(t*13))*2:Math.sin(now/540)*.7);
  const swing=walking&&!reduced?Math.sin(t*13)*.42:0;
  const actionAge=(now-motion.at)/1000,attacking=active==='attack'&&actionAge<.46,hit=active==='hit'&&actionAge<.28;
  const gather=active==='interact'&&actionAge<.45,potion=active==='potion'&&actionAge<.55;
  ctx.save();ctx.translate(x+16+(hit&&!reduced?Math.sin(now/18)*2:0),y+30-bob);
  ellipse(0,1,12,3.4,'#1e342b66');
  if(hit&&actionAge<.14)ctx.globalAlpha=.55;
  // Boots and legs
  ctx.fillStyle='#443b39';ctx.beginPath();ctx.ellipse(-4+Math.sin(swing)*3,-4,3.2,5,swing*.2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(4-Math.sin(swing)*3,-4,3.2,5,-swing*.2,0,Math.PI*2);ctx.fill();
  rounded(-8,-3,7,3,1.5,'#d4c39d');rounded(1,-3,7,3,1.5,'#d4c39d');
  // Tunic, shoulder cape and belt
  ctx.fillStyle='#345e58';ctx.beginPath();ctx.moveTo(-7,-22);ctx.quadraticCurveTo(0,-27,7,-22);ctx.lineTo(9,-8);ctx.quadraticCurveTo(0,-5,-9,-8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d89b4c';ctx.beginPath();ctx.moveTo(-6,-19);ctx.lineTo(4,-22);ctx.lineTo(8,-8);ctx.lineTo(-2,-7);ctx.closePath();ctx.fill();
  rounded(-7,-12,14,3,1.5,'#493c36');rounded(-2,-12,5,3,1,'#edc46d');
  // Arms react to the current action
  const raise=potion?Math.max(0,1-Math.abs(actionAge-.28)/.28):0;
  const lean=gather?Math.max(0,1-Math.abs(actionAge-.2)/.25):0;
  line([[-6,-20],[-10,-15+raise*4+lean*4],[-8,-10+raise*7+lean*3]],'#d49b78',3.8);
  line([[6,-20],[10,-16+(attacking?-5:0)],[attacking?15:8,-13+(attacking?-6:0)]],'#d49b78',3.8);
  // Face direction and expressive hair
  const faceFront=dir==='down',faceBack=dir==='up',faceSide=dir==='left'||dir==='right',side=dir==='left'?-1:1;
  ellipse(0,-29,7.2,8.4,'#f0c7a1');
  if(faceFront||faceSide){
   const eyeY=-29,eyeX=faceSide?side*2.8:-2.7;
   ellipse(eyeX,eyeY,1.05,1.7,'#3d3437');
   if(faceFront)ellipse(2.8,eyeY,1.05,1.7,'#3d3437');
   line([[faceSide?side*1.2:-1,-25],[faceSide?side*2:-1,-24.5]],'#ae665f',.7);
  }
  ctx.fillStyle='#493b38';ctx.beginPath();ctx.moveTo(-7,-31);ctx.quadraticCurveTo(-10,-43,0,-41);ctx.quadraticCurveTo(10,-40,8,-30);ctx.lineTo(4,-32);ctx.lineTo(1,-35);ctx.lineTo(-2,-31);ctx.lineTo(-5,-33);ctx.closePath();ctx.fill();
  ctx.fillStyle='#72554a';ctx.beginPath();ctx.moveTo(-6,-33);ctx.quadraticCurveTo(-10,-25,-7,-18);ctx.quadraticCurveTo(-8,-28,-3,-29);ctx.closePath();ctx.fill();
  if(faceBack){ctx.fillStyle='#493b38';ctx.beginPath();ctx.ellipse(0,-29,7.1,8,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-7,-32);ctx.quadraticCurveTo(-8,-43,1,-41);ctx.quadraticCurveTo(10,-40,7,-30);ctx.closePath();ctx.fill();}
  // Sword slash follows the attack motion and gives combat feedback.
  if(attacking){
   const progress=clamp(actionAge/.46,0,1),alpha=Math.sin(progress*Math.PI);
   const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[dir]||0;
   ctx.save();ctx.globalAlpha=alpha;ctx.rotate(angle);
   ctx.strokeStyle='#ffe2a0';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,-19,18,-.65+progress*.35,.45+progress*.35);ctx.stroke();
   line([[8,-12],[15,-22],[19,-29]],'#d8d7c9',2.5);line([[7,-11],[12,-14]],'#c58b46',2.5);
   ctx.restore();
  }
  if(potion){ellipse(-8,-20-raise*5,3,4,'#80b7a0');rounded(-10,-25,4,2,1,'#e5d5ad');}
  if(gather){line([[-2,-7],[5,-10]],'#97b86f',1.7);}
  ctx.restore();
 }

 function drawSlime(x,y,m,now){
  const bounce=reduced?0:Math.sin(now/340+m.x)*1.6,scale=1+Math.sin(now/480+m.y)*.035;
  ctx.save();ctx.translate(x+16,y+24+bounce);ctx.scale(scale,1/scale);ellipse(0,4,12,4,'#1e342b55');
  ctx.fillStyle=TYPES[m.kind].color;ctx.beginPath();ctx.moveTo(-12,2);ctx.quadraticCurveTo(-13,-10,-5,-12);ctx.quadraticCurveTo(0,-18,7,-11);ctx.quadraticCurveTo(14,-7,11,2);ctx.quadraticCurveTo(0,7,-12,2);ctx.fill();
  ellipse(-4,-5,1.3,2,'#274439');ellipse(4,-5,1.3,2,'#274439');ellipse(-6,-9,3,1.3,'#d8edba');ctx.restore();
 }
 function drawWolf(x,y,m,now){
  const bob=reduced?0:Math.sin(now/250+m.x)*1.2;ctx.save();ctx.translate(x+16,y+23+bob);ellipse(0,5,14,4,'#1e342b55');
  ctx.fillStyle='#bcc4c9';ctx.beginPath();ctx.ellipse(-1,-2,11,7,-.08,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(8,-7,7,6,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(4,-11);ctx.lineTo(3,-19);ctx.quadraticCurveTo(9,-17,9,-10);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(10,-11);ctx.lineTo(14,-18);ctx.quadraticCurveTo(17,-13,14,-8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d89a73';ctx.beginPath();ctx.moveTo(10,-6);ctx.lineTo(18,-4);ctx.lineTo(10,-1);ctx.closePath();ctx.fill();
  ellipse(9,-8,1.1,1.2,'#49363a');line([[-8,1],[-9,7]],'#89969a',2.5);line([[4,1],[5,7]],'#89969a',2.5);line([[-10,-4],[-16,-7],[-17,-10]],'#aeb7bb',2.4);ctx.restore();
 }
 function drawSkeleton(x,y,m,now){
  const bob=reduced?0:Math.sin(now/320+m.x)*.7;ctx.save();ctx.translate(x+16,y+29+bob);ellipse(0,2,12,3,'#1e342b55');
  line([[-5,-7],[-5,-17],[0,-21],[5,-17],[5,-7]],'#e1d7bd',3.2);
  line([[-5,-15],[5,-15]],'#9e9a87',1.3);line([[-4,-11],[4,-11]],'#9e9a87',1.3);
  ellipse(0,-26,7,7,'#e8dec6');ellipse(-2.5,-27,1.5,2,'#403b38');ellipse(2.5,-27,1.5,2,'#403b38');
  ctx.fillStyle='#e8dec6';ctx.beginPath();ctx.moveTo(-2,-21);ctx.lineTo(2,-21);ctx.lineTo(0,-18);ctx.closePath();ctx.fill();
  line([[-5,-17],[-10,-12],[-9,-6]],'#ddd2b7',2.3);line([[5,-17],[10,-13],[9,-8]],'#ddd2b7',2.3);
  line([[-3,-7],[-4,-1]],'#d9ceb6',2.5);line([[3,-7],[4,-1]],'#d9ceb6',2.5);line([[11,-13],[12,-1]],'#aeb7b6',2.1);line([[8,-1],[16,-1]],'#9d7852',2);ctx.restore();
 }
 function drawMonster(m,x,y,now){
  if(m.kind==='slime')drawSlime(x,y,m,now);else if(m.kind==='wolf')drawWolf(x,y,m,now);else drawSkeleton(x,y,m,now);
  rounded(x+4,y+1,24,3,1.5,'#403b34');rounded(x+4,y+1,24*m.hp/m.maxHp,3,1.5,'#cf7664');
 }
 function drawNode(n,x,y,now){
  if(!n.available)return;const cx=x+16;
  if(n.kind==='chest'){
   ellipse(cx,y+28,12,3,'#21382c44');rounded(x+6,y+15,20,13,3,'#805b3c');rounded(x+5,y+13,22,6,3,'#c18b4d');rounded(x+14,y+17,5,6,1,'#f0cf7e');
  }else if(n.kind==='herb'){
   ellipse(cx,y+28,9,2,'#21382c33');line([[cx,y+27],[cx,y+11]],'#536d3e',2);
   ctx.fillStyle='#91b76a';ctx.beginPath();ctx.ellipse(cx-5,y+18,6,3,-.55,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx+5,y+15,6,3,.55,0,Math.PI*2);ctx.fill();ellipse(cx,y+10,2,2,'#e5d5a0');
  }else if(n.kind==='wood'){
   ellipse(cx,y+27,12,3,'#21382c33');rounded(x+5,y+17,22,8,4,'#805b40');ellipse(x+8,y+21,4,4,'#bd9865');line([[x+15,y+17],[x+17,y+25]],'#594b39',1.2);
  }else{
   ellipse(cx,y+28,12,3,'#21382c33');ctx.fillStyle='#798783';ctx.beginPath();ctx.moveTo(x+6,y+26);ctx.lineTo(x+9,y+15);ctx.lineTo(x+16,y+11);ctx.lineTo(x+25,y+16);ctx.lineTo(x+27,y+27);ctx.closePath();ctx.fill();line([[x+14,y+16],[x+18,y+20],[x+16,y+24]],'#d4d1ba',1.5);
  }
 }

 function draw(now){
  if(!state){ctx.fillStyle='#304b36';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e5dfc3';ctx.font='14px Arial';ctx.textAlign='center';ctx.fillText('Menghubungkan dunia…',canvas.width/2,canvas.height/2);return;}
  const p=state.player,travel=reduced?1:clamp((now-changed)/180,0,1);
  const pos={x:from.x+(p.x-from.x)*travel,y:from.y+(p.y-from.y)*travel};
  const camera={x:clamp(pos.x-6,0,WORLD.width-13),y:clamp(pos.y-5,0,WORLD.height-11)};
  const startX=Math.floor(camera.x),startY=Math.floor(camera.y);
  for(let y=startY;y<=Math.ceil(camera.y+11);y++)for(let x=startX;x<=Math.ceil(camera.x+13);x++)drawGround((x-camera.x)*32,(y-camera.y)*32,tile(x,y),now,x,y);
  const campX=(WORLD.camp.x-camera.x)*32,campY=(WORLD.camp.y-camera.y)*32;drawCamp(campX,campY,now);
  state.nodes.forEach(n=>drawNode(n,(n.x-camera.x)*32,(n.y-camera.y)*32,now));
  const actors=state.monsters.filter(m=>m.hp>0).map(m=>({y:m.y,draw:()=>drawMonster(m,(m.x-camera.x)*32,(m.y-camera.y)*32,now)}));
  const duration={move:420,attack:480,interact:450,potion:550,hit:260}[motion.kind]||0;
  const active=now-motion.at<duration?motion.kind:'idle';
  actors.push({y:pos.y,draw:()=>drawPlayer((pos.x-camera.x)*32,(pos.y-camera.y)*32,now,direction,active)});
  actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
 }
 function update(next){
  from=state?{x:state.player.x,y:state.player.y}:{x:next.player.x,y:next.player.y};
  state=next;changed=performance.now();
  if(!motion.at)motion={kind:'idle',at:changed};
 }
 function trigger(kind,extra={}){
  if(extra.direction)direction=extra.direction;
  motion={kind:kind==='attack'?'attack':kind==='interact'?'interact':kind==='potion'?'potion':kind==='move'?'move':kind==='damage'?'hit':kind,at:performance.now()};
 }
 function minimap(target){
  if(!state)return;const c=target.getContext('2d');
  for(let y=0;y<WORLD.height;y++)for(let x=0;x<WORLD.width;x++){c.fillStyle=colors[tile(x,y)];c.fillRect(x*10,y*10,10,10);}
  for(const n of state.nodes)if(n.available){c.fillStyle='#f8d076';c.fillRect(n.x*10+2,n.y*10+2,6,6);}
  for(const m of state.monsters)if(m.hp>0){c.fillStyle='#df7064';c.fillRect(m.x*10+2,m.y*10+2,6,6);}
  c.fillStyle='#ffffff';c.beginPath();c.arc(state.player.x*10+5,state.player.y*10+5,4,0,Math.PI*2);c.fill();
 }
 return {update,trigger,draw,minimap};
}
