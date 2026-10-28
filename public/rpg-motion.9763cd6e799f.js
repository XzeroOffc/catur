import {walkable} from './rpg-world.9763cd6e799f.js';
export function moveVector(player,vector,seconds,monsters=[]){
 const magnitude=Math.hypot(vector.x,vector.y);
 if(!Number.isFinite(magnitude)||!Number.isFinite(seconds)||seconds<0||seconds>.6)throw Error('Gerakan tidak valid.');
 if(!magnitude)return {...player};
 const dx=vector.x/Math.max(1,magnitude)*seconds*3,dy=vector.y/Math.max(1,magnitude)*seconds*3;
 let x=player.x,y=player.y;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.08));
 const clear=(a,b)=>[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]].every(([ox,oy])=>walkable(Math.round(a+ox),Math.round(b+oy)))&&!monsters.some(m=>m.hp>0&&Math.hypot(m.x-a,m.y-b)<.55);
 for(let i=0;i<steps;i++){if(clear(x+dx/steps,y))x+=dx/steps;if(clear(x,y+dy/steps))y+=dy/steps;}
 return {...player,x,y};
}
