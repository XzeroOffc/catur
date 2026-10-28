import {moveVector} from './rpg-motion.js';
export function createPrediction(){
 let queued=[],seconds=0,position=null;
 return {
  get position(){return position;},get pending(){return queued.length>0;},get duration(){return seconds;},
  reset(player){queued=[];seconds=0;position={...player};},
  rebase(player,monsters){position={...player};for(const s of queued)position=moveVector(position,s.vector,s.seconds,monsters);},
  step(vector,dt,monsters){if(!position||seconds>=2||dt<=0)return false;dt=Math.min(dt,.05,2-seconds);position=moveVector(position,vector,dt,monsters);queued.push({vector:{...vector},seconds:dt});seconds+=dt;return true;},
  take(){const path=queued;queued=[];seconds=0;return path;}
 };
}
