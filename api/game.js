import {createChess,position} from '../lib/chess.js';
import {verifyInitData,same} from '../lib/auth.js';
import {redis,locked} from '../lib/redis.js';
export function view(g,userId) {
 const c=position(g);
 return {id:g.id,revision:g.rev,status:g.status,fen:c.fen(),white:g.white,black:g.black,turn:c.turn(),check:c.isCheck(),result:(g.result||'').replace(/<[^>]*>/g,''),lastMove:g.moves.at(-1)||null,moves:c.history(),yourColor:g.white.id===userId?'w':'b',expired:Date.now()-g.updated>86400000};
}
export function validateMove(g,userId,revision,uci) {
 if(g.status!=='active'||Date.now()-g.updated>86400000)throw Error('Pertandingan sudah berakhir. Mulai /catur di grup.');
 if(g.rev!==revision)throw Error('Papan sudah berubah. Muat ulang dan pilih langkah lagi.');
 const c=position(g);if(userId!==(c.turn()==='w'?g.white.id:g.black.id))throw Error('Belum giliranmu.');
 const x=/^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci||'');if(!x)throw Error('Format langkah tidak valid.');
 try{c.move({from:x[1],to:x[2],promotion:x[3]||'q'});}catch{throw Error('Langkah tidak sah.');}
}
export function createEndpoint({db=redis,lock=locked,env=process.env,request=fetch}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Gunakan POST.'});
  try {
   if(!env.BOT_TOKEN || !/^[A-Za-z0-9_]{5,32}$/.test(env.BOT_USERNAME||'') || (env.GAME_SERVICE_SECRET||'').length<32)throw Error('Konfigurasi server belum lengkap.');
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body || JSON.stringify(body).length>400000)return res.status(413).json({error:'Permintaan terlalu besar.'});
   const api={call:async(method,payload)=>{
    const r=await request(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(7000)});
    const value=await r.json();if(!value.ok)throw Error(value.description||'Telegram menolak permintaan.');return value.result;
   }};
   if(['command','callback'].includes(body.op)) {
    if(!same(req.headers.authorization,`Bearer ${env.GAME_SERVICE_SECRET}`))return res.status(401).json({error:'Autentikasi bot ditolak.'});
    const m=body.message;
    if(!['group','supergroup'].includes(m?.chat?.type)||!Number.isSafeInteger(m.chat.id)||m.chat.id>=0)throw Error('Catur khusus grup.');
    const key=`chess:${m.chat.id}:${m.message_thread_id||0}`;
    await lock(key,async store=>{
     const engine=createChess({api,store,miniAppUsername:env.BOT_USERNAME,groupStore:{knownMembers:async()=>Array.isArray(body.known)?body.known:[]}});
     if(body.op==='callback')await engine.callback(body.callback);else await engine.command(m,m.chessArgument||'');
    },db);
    return res.status(200).json({ok:true});
   }
   let auth;try{auth=verifyInitData(body.initData,env.BOT_TOKEN);}catch(e){return res.status(401).json({error:e.message});}
   const {user,chatId,threadId,gameId}=auth,key=`chess:${chatId}:${threadId}`,scope=`${chatId}:${threadId}`;
   const find=data=>{const g=data.games?.[scope];if(!g||g.id!==gameId)throw Error('Pertandingan tidak ditemukan atau sudah diganti. Buka tombol terbaru di grup.');if(![g.white?.id,g.black?.id].includes(user.id))throw Error('Kamu bukan pemain pertandingan ini.');if(!g.black)throw Error('Lawan belum dipilih.');return g;};
   if(body.op==='state') {
    const data=JSON.parse(await db(['GET',key])||'{}');return res.status(200).json(view(find(data),user.id));
   }
   if(!['move','resign'].includes(body.op))return res.status(400).json({error:'Aksi tidak dikenal.'});
   let warning=null;
   const result=await lock(key,async store=>{
    const g=find(store.data);
    if(body.revision!==g.rev)throw Error('Papan sudah berubah. Muat ulang dan coba lagi.');
    if(g.status!=='active'||Date.now()-g.updated>86400000)throw Error('Pertandingan sudah selesai atau kedaluwarsa.');
    if(body.op==='move')validateMove(g,user.id,body.revision,body.move);
    const member=await api.call('getChatMember',{chat_id:chatId,user_id:user.id});
    if(!['creator','administrator','member'].includes(member.status)&&!(member.status==='restricted'&&member.is_member))throw Error('Kamu harus menjadi anggota grup untuk bermain.');
    const engine=createChess({api,store,miniAppUsername:env.BOT_USERNAME});
    const before=g.rev;let savedRevision=before;const save=store.save;
    store.save=async()=>{await save();savedRevision=g.rev;};
    try {await engine.command({chat:{id:chatId,type:'supergroup'},message_thread_id:threadId,from:user},body.op==='move'?`langkah ${body.move}`:'menyerah');}
    catch(e){if(g.rev===before || savedRevision!==g.rev)throw e;warning='Langkah tersimpan, tetapi pesan grup belum diperbarui. Gunakan /catur status.';}
    return view(g,user.id);
   },db);
   return res.status(200).json({...result,warning});
  }catch(e){console.error('Chess request failed:',e.message);return res.status(400).json({error:e.message||'Permainan gagal diperbarui.'});}
 };
}
export default createEndpoint();
