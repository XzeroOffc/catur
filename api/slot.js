import {randomUUID} from 'node:crypto';
import {redis} from '../lib/redis.js';
import {same,verifyIdentity} from '../lib/auth.js';
import {wallet,publicState,spin,prepare} from '../lib/slot.js';
const release="if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";
const write="if redis.call('get',KEYS[1]) == ARGV[1] then redis.call('set',KEYS[2],ARGV[2]); return 1 else return 0 end";
export async function persistentLock(key,run,db=redis){
 const lock=key+':lock',token=randomUUID();if(await db(['SET',lock,token,'NX','PX',15000])!=='OK')throw Error('Saldo sedang diproses. Coba lagi.');
 try{const data=JSON.parse(await db(['GET',key])||'{}');const result=await run(data);if(await db(['EVAL',write,2,lock,key,token,JSON.stringify(data)])!==1)throw Error('Penyimpanan gagal. Muat ulang untuk memeriksa hasil.');return result;}
 finally{await db(['EVAL',release,1,lock,token]).catch(()=>{});}
}
export function createSlotEndpoint({db=redis,lock=persistentLock,env=process.env,now=Date.now}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Gunakan POST.'});
 try{
  if(!env.BOT_TOKEN||(env.GAME_SERVICE_SECRET||'').length<32)throw Error('Konfigurasi game belum lengkap.');
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!b||JSON.stringify(b).length>20000)throw Error('Permintaan tidak valid.');
  const service=['balance','prepare','commit'].includes(b.op);let id;
  if(service){if(!same(req.headers.authorization,`Bearer ${env.GAME_SERVICE_SECRET}`))return res.status(401).json({error:'Akses ditolak.'});id=b.userId;}
  else{let auth;try{auth=verifyIdentity(b.initData,env.BOT_TOKEN,now());}catch(e){return res.status(401).json({error:e.message});}if(auth.startParam!=='slot')throw Error('Buka melalui /slot.');id=auth.user.id;}
  if(!Number.isSafeInteger(id)||id<=0)throw Error('User tidak valid.');
  const result=await lock(`slot:wallet:${id}`,async data=>{
   const w=wallet(data,now());
   if(b.op==='state')return publicState(w);
   if(b.op==='balance')return {...publicState(w),redemption:w.pending||null};
   if(b.op==='spin')return spin(w,b,now());
   if(b.op==='prepare')return {redemption:prepare(w),...publicState(w)};
   if(b.op==='commit'){
    if(w.pending?.id===b.redemptionId){w.completed=b.redemptionId;delete w.pending;}
    else if(w.completed!==b.redemptionId)throw Error('Penukaran tidak cocok.');
    return publicState(w);
   }
   throw Error('Aksi tidak dikenal.');
  },db);return res.status(200).json(result);
 }catch(e){return res.status(400).json({error:e.message});}
};}
export default createSlotEndpoint();
