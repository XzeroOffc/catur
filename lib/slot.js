import {randomInt,randomUUID} from 'node:crypto';
export const COST=20000, DAILY=20;
export const PRIZES=[{points:100,weight:50,face:'🍒'},{points:200,weight:30,face:'🍋'},{points:400,weight:15,face:'🍇'},{points:1000,weight:5,face:'⭐'}];
export function dayAt(now){return new Date(now+9*3600000).toISOString().slice(0,10);}
export function wallet(data,now){data.wallet ||= {balance:0,revision:0,spins:0,day:dayAt(now)};const w=data.wallet;if(w.day!==dayAt(now)){w.day=dayAt(now);w.spins=0;}return w;}
export function publicState(w){return {balance:w.balance,revision:w.revision,remaining:DAILY-w.spins,cost:COST,prizes:PRIZES,last:w.last||null,pending:Boolean(w.pending)};}
export function spin(w,{revision,requestId},now=Date.now(),draw=()=>randomInt(100)){
 if(!/^[\w-]{16,80}$/.test(requestId||''))throw Error('ID putaran tidak valid.');
 if(w.last?.requestId===requestId)return publicState(w);
 if(revision!==w.revision)throw Error('Saldo berubah. Muat ulang sebelum bermain.');
 if(w.spins>=DAILY)throw Error('20 putaran hari ini selesai. Tersedia lagi pukul 00.00 WIT.');
 if(now-(w.last?.at||0)<5000)throw Error('Tunggu 5 detik antarputaran.');
 let n=draw();const prize=PRIZES.find(p=>(n-=p.weight)<0);
 w.balance+=prize.points;w.spins++;w.revision++;
 w.last={requestId,points:prize.points,face:prize.face,at:now};return publicState(w);
}
export function prepare(w){if(w.pending)return w.pending;if(w.balance<COST)throw Error('Perlu 20.000 poin untuk reset jatah.');w.balance-=COST;w.revision++;w.pending={id:randomUUID(),cost:COST};return w.pending;}
