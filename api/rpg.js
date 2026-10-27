import {verifyIdentity} from '../lib/auth.js';
import {redis} from '../lib/redis.js';
import {persistentLock} from './slot.js';
import {ensureRpg,tick,act,viewRpg} from '../lib/rpg.js';
export function createRpgEndpoint({db=redis,lock=persistentLock,env=process.env,now=Date.now}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Gunakan POST.'});
  try{
   if(!env.BOT_TOKEN)throw Error('BOT_TOKEN belum dikonfigurasi.');
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||JSON.stringify(body).length>20000)throw Error('Permintaan tidak valid.');
   let auth;try{auth=verifyIdentity(body.initData,env.BOT_TOKEN,now());}catch(e){return res.status(401).json({error:e.message});}
   if(auth.startParam!=='rpg')throw Error('Buka RPG melalui tombol /rpg.');
   if(!['state','action'].includes(body.op))throw Error('Operasi tidak valid.');
   const result=await lock(`rpg:player:${auth.user.id}`,async data=>{
    const g=ensureRpg(data,now());
    if(body.op==='action')act(g,body,now());else tick(g,now());
    return viewRpg(g,now());
   },db);return res.status(200).json(result);
  }catch(e){return res.status(400).json({error:e.message||'RPG gagal diperbarui.'});}
 };
}
export default createRpgEndpoint();
