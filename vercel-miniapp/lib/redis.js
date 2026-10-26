import {randomUUID} from 'node:crypto';
export async function redis(args) {
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)throw Error('Redis belum dikonfigurasi.');
 const r=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
 const body=await r.json();if(!r.ok||body.error)throw Error('Penyimpanan game tidak tersedia.');return body.result;
}
const release="if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";
const write="if redis.call('get',KEYS[1]) == ARGV[1] then redis.call('set',KEYS[2],ARGV[2],'EX',172800); return 1 else return 0 end";
export async function locked(key,run,db=redis) {
 const lock=key+':lock',token=randomUUID();
 if(await db(['SET',lock,token,'NX','PX',25000])!=='OK')throw Error('Permainan sedang diperbarui. Coba lagi sebentar.');
 try {
  const data=JSON.parse(await db(['GET',key])||'{"games":{},"members":{}}');
  const store={data,save:async()=>{if(await db(['EVAL',write,2,lock,key,token,JSON.stringify(data)])!==1)throw Error('Pembaruan bersamaan. Muat ulang papan.');}};
  return await run(store);
 }finally{await db(['EVAL',release,1,lock,token]).catch(()=>{});}
}
