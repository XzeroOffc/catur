import { Chess } from 'chess.js';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person = u => ({ id: Number(u.id), name: [u.first_name || u.firstName || u.name, u.last_name || u.lastName].filter(Boolean).join(' ') || u.username || String(u.id) });
const tag = u => !u ? 'Belum dipilih' : u.id ? `<a href="tg://user?id=${u.id}">${escape(u.name)}</a>` : '🤖 AI';
const scope = m => `${m.chat.id}:${m.message_thread_id || 0}`;
const group = m => ['group','supergroup'].includes(m?.chat?.type);
const live = g => g && g.status !== 'done' && Date.now() - g.updated < (g.status === 'active' ? 86400000 : 600000);
export function position(g) { const c = new Chess(g.fen); for (const move of g.moves) c.move(move); return c; }
export function aiMove(c) {
  const values = {p:100,n:320,b:330,r:500,q:900,k:0};
  const score = () => c.isCheckmate() ? (c.turn() === 'b' ? -100000 : 100000) : c.isDraw() ? 0 : c.board().flat().reduce((n,p) => n + (p ? values[p.type] * (p.color === 'b' ? 1 : -1) : 0),0);
  let best, highest = -Infinity;
  for (const m of c.moves({verbose:true})) {
    c.move(m); let worst = score();
    if (!c.isGameOver()) {
      worst = Infinity;
      for (const reply of c.moves({verbose:true})) { c.move(reply); worst = Math.min(worst,score()); c.undo(); }
    }
    c.undo(); if (worst > highest) { highest = worst; best = m; }
  }
  return best;
}
export class ChessStore {
  constructor(file = null) { this.file = file instanceof URL ? fileURLToPath(file) : file; this.data = {games:{},members:{}}; }
  async ensure() {
    if (!this.file) return;
    try { this.data = JSON.parse(await readFile(this.file,'utf8')); if (!this.data.games || !this.data.members) throw Error('Format data catur tidak valid'); }
    catch(e) { if(e.code !== 'ENOENT') throw e; }
  }
  async save() {
    if (!this.file) return;
    await mkdir(dirname(this.file),{recursive:true});
    await writeFile(this.file + '.tmp',JSON.stringify(this.data)); await rename(this.file + '.tmp',this.file);
  }
}
export function createChess({api,groupStore,store = new ChessStore(), miniAppUsername = null}) {
  let queue = Promise.resolve();
  const serial = fn => { const p = queue.then(fn); queue = p.catch(()=>{}); return p; };
  const send = (m,text,keyboard=[]) => api.call('sendMessage',{chat_id:m.chat.id,...(m.message_thread_id ? {message_thread_id:m.message_thread_id}:{}),text,parse_mode:'HTML',reply_markup:{inline_keyboard:keyboard}});
  const remember = m => {
    if (!group(m)) return false;
    const members = store.data.members[m.chat.id] ||= {}; let changed = false;
    for (const u of [m.from,m.reply_to_message?.from,...(m.new_chat_members || [])]) {
      if (!u || u.is_bot) continue;
      const p = person(u); if(JSON.stringify(members[p.id]) !== JSON.stringify(p)) { members[p.id] = p; changed = true; }
    }
    if(m.left_chat_member && members[m.left_chat_member.id]) { delete members[m.left_chat_member.id]; changed = true; }
    return changed;
  };
  const member = async (m,id) => {
    const x = await api.call('getChatMember',{chat_id:m.chat.id,user_id:id});
    return !x.user?.is_bot && (['creator','administrator','member'].includes(x.status) || (x.status === 'restricted' && x.is_member));
  };
  const finish = (g,c) => {
    if(c.isCheckmate()) { g.status='done'; g.result=`Skakmat! Pemenang: ${tag(c.turn()==='w'?g.black:g.white)}.`; }
    else if(c.isGameOver()) { g.status='done'; g.result='Remis: '+(c.isStalemate()?'stalemate':c.isThreefoldRepetition()?'pengulangan posisi tiga kali':c.isInsufficientMaterial()?'material tidak cukup':'aturan 50 langkah')+'.'; }
  };
  async function render(m,g) {
    const b = (text,action,arg='') => ({text,callback_data:`chess:${g.id}:${g.rev}:${action}:${arg}`});
    let text = '♟ <b>Catur</b>\n', rows=[];
    if(g.status==='choosing') {
      text += `${tag(g.white)}, pilih lawan atau AI.\nDaftar berisi anggota yang dikenal bot dan admin. Belum terdaftar? Kirim /catur daftar, lalu buka ulang pemilihan.`;
      rows = g.candidates.slice(g.page*8,g.page*8+8).map(p=>[b(p.name.slice(0,45),'pick',p.id)]);
      rows.push([b('🤖 Lawan AI','ai')]);
      const nav=[]; if(g.page>0)nav.push(b('⬅️','page',g.page-1)); if((g.page+1)*8<g.candidates.length)nav.push(b('➡️','page',g.page+1)); if(nav.length)rows.push(nav);
      rows.push([b('Batal','cancel')]);
    } else if(g.status==='pending') {
      text += `${tag(g.black)}, kamu ditantang oleh ${tag(g.white)}!\nBersedia bermain? Tantangan berlaku 10 menit.`;
      rows=[[b('✅ Terima','accept'),b('❌ Tolak','decline')],[b('Batalkan tantangan','cancel')]];
    } else {
      const c=position(g), glyph={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
      text += `Putih: ${tag(g.white)}\nHitam: ${tag(g.black)}\n\n`;
      text += '<pre>'+c.board().map((rank,i)=>(8-i)+' '+rank.map(p=>p?glyph[p.color+p.type]:'·').join(' ')).join('\n')+'\n  a b c d e f g h</pre>\n';
      if(g.status==='done')text+=g.result;
      else {
        text+=`Giliran: ${tag(c.turn()==='w'?g.white:g.black)}${c.isCheck()?' • SKAK':''}\n`;
        const moves=c.moves({verbose:true});
        let buttons;
        if(g.promotion) { text+='Pilih promosi pion.'; buttons=['q','r','b','n'].map((p,i)=>b(['Ratu','Benteng','Gajah','Kuda'][i],'promote',p)); }
        else if(g.selected) { text+=`Bidak ${g.selected}: pilih petak tujuan.`; buttons=[...new Set(moves.filter(x=>x.from===g.selected).map(x=>x.to))].map(to=>b(to,'to',to)); }
        else { text+='Pilih bidak, lalu petak tujuan.\nAtau /catur langkah e2e4'; buttons=[...new Set(moves.map(x=>x.from))].map(from=>b(glyph[c.get(from).color+c.get(from).type]+' '+from,'from',from)); }
        for(let i=0;i<buttons.length;i+=4)rows.push(buttons.slice(i,i+4));
        rows.push([b('Pilih ulang','clear'),b('Menyerah','resign')]);
        if(g.confirmResign)rows.push([b('Ya, saya menyerah','confirmresign',g.confirmResign)]);
      }
      if(g.status==='done')rows=[[{text:'♟ Main lagi',callback_data:'chess:start'}]];
    }
    if(miniAppUsername && ['active','done'].includes(g.status)) {
      const launch = Buffer.from(JSON.stringify([m.chat.id,m.message_thread_id||0,g.id])).toString('base64url');
      text = `♟ <b>Catur Mini App</b>\nPutih: ${tag(g.white)}\nHitam: ${tag(g.black)}\n\n` + (g.status==='done' ? g.result : `Giliran: ${tag(position(g).turn()==='w'?g.white:g.black)}\nBuka papan untuk memilih dan menggerakkan bidak.`);
      rows = [[{text:'🎮 Buka Catur',url:`https://t.me/${miniAppUsername}?startapp=${launch}`}]];
      if(g.status==='done')rows.push([{text:'Main lagi',callback_data:'chess:start'}]);
    }
    const payload={chat_id:m.chat.id,text,parse_mode:'HTML',reply_markup:{inline_keyboard:rows}};
    if(g.messageId) {
      try { await api.call('editMessageText',{...payload,message_id:g.messageId}); return; }
      catch(e) { if(/message is not modified/i.test(e.message))return; if(!/message to edit not found|message can't be edited/i.test(e.message))throw e; }
    }
    const result=await send(m,text,rows); g.messageId=result.message_id; await store.save();
  }
  async function commit(m,g) { g.rev++;g.updated=Date.now(); await store.save(); await render(m,g); }
  function move(g,uci) {
    const c=position(g); try { c.move(uci); } catch { return false; }
    g.moves.push({from:uci.from,to:uci.to,...(uci.promotion?{promotion:uci.promotion}:{})});
    g.selected=null;g.promotion=null;g.confirmResign=null;finish(g,c);
    if(g.status==='active' && g.black.id===0 && c.turn()==='b') { const a=aiMove(c); c.move(a);g.moves.push({from:a.from,to:a.to,...(a.promotion?{promotion:a.promotion}:{})});finish(g,c); }
    return true;
  }
  async function start(m,ai=false) {
    let g=store.data.games[scope(m)];
    if(live(g) && g.status!=='choosing') {
      if(![g.white.id,g.black?.id].includes(m.from.id))return send(m,`♟ Ada pertandingan ${tag(g.white)} melawan ${tag(g.black)}. Tunggu pertandingan selesai sebelum membuat yang baru.`);
      g.messageId=null;return commit(m,g);
    }
    if(live(g) && g.white.id!==m.from.id)return send(m,'Pemain lain sedang memilih lawan. Tunggu atau coba lagi setelah 10 menit.');
    const candidates=new Map(Object.values(store.data.members[m.chat.id]||{}).map(p=>[p.id,p]));
    for(const u of await groupStore?.knownMembers(m.chat.id) || [])if(!u.isBot)candidates.set(Number(u.id),person(u));
    try { for(const a of await api.call('getChatAdministrators',{chat_id:m.chat.id}))if(!a.user.is_bot)candidates.set(a.user.id,person(a.user)); } catch { /* Known members remain available when administrator lookup is unavailable. */ }
    candidates.delete(m.from.id);
    g={id:randomBytes(6).toString('hex'),rev:0,status:ai?'active':'choosing',white:person(m.from),black:ai?{id:0,name:'AI'}:null,moves:[],page:0,candidates:[...candidates.values()],updated:Date.now()};
    store.data.games[scope(m)]=g;await commit(m,g);
  }
  async function command(m,arg='') {
    if(!group(m))return send(m,'♟ /catur hanya bisa digunakan di grup atau supergroup.');
    if(m.sender_chat || m.from?.is_bot)return send(m,'Gunakan akun pribadi, bukan identitas admin anonim/channel, untuk bermain.');
    remember(m);await store.save();
    const parts=arg.toLowerCase().trim().split(/\s+/), cmd=parts[0];
    if(cmd==='daftar')return send(m,'✅ Kamu sudah masuk daftar pemain grup. Kirim /catur untuk memilih lawan.');
    if(!cmd || cmd==='ai')return start(m,cmd==='ai');
    const g=store.data.games[scope(m)];
    if(!live(g))return send(m,'Belum ada permainan aktif. Kirim /catur.');
    if(cmd==='status'){g.messageId=null;return commit(m,g);}
    if(cmd==='batal' && ['choosing','pending'].includes(g.status) && m.from.id===g.white.id) { g.status='done';g.result='Tantangan dibatalkan.';return commit(m,g); }
    if(g.status!=='active')return send(m,'Tunggu lawan menerima tantangan.');
    if(![g.white.id,g.black.id].includes(m.from.id))return send(m,'Kamu bukan pemain di pertandingan ini.');
    if(cmd==='menyerah') { g.status='done';g.result=`${tag(person(m.from))} menyerah. Pemenang: ${tag(m.from.id===g.white.id?g.black:g.white)}.`;return commit(m,g); }
    if(cmd==='langkah') {
      if(m.from.id!==(position(g).turn()==='w'?g.white.id:g.black.id))return send(m,'Belum giliranmu.');
      const x=/^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(parts[1]||'');
      if(!x || !move(g,{from:x[1],to:x[2],promotion:x[3]||'q'}))return send(m,'Langkah tidak sah. Contoh: /catur langkah e2e4. Promosi: e7e8q.');
      return commit(m,g);
    }
    return send(m,'Command: /catur, /catur ai, /catur daftar, /catur status, /catur langkah e2e4, /catur menyerah, /catur batal.');
  }
  async function callback(cb) {
    const m={...cb.message,from:cb.from};
    const answer=text=>api.call('answerCallbackQuery',{callback_query_id:cb.id,text,show_alert:Boolean(text)});
    if(!group(m))return answer('Catur khusus grup atau supergroup.');
    if(cb.from.is_bot)return answer('Gunakan akun pribadi.');
    if(cb.data==='chess:start') { await answer();return command(m); }
    const [,id,rev,action,arg]=cb.data.split(':'); const g=store.data.games[scope(m)];
    if(!live(g) || g.id!==id || g.rev!==Number(rev) || g.messageId!==m.message_id)return answer('Tombol sudah kedaluwarsa. Kirim /catur status atau /catur.');
    const me=cb.from.id;
    if(g.status==='choosing') {
      if(me!==g.white.id)return answer('Hanya pembuat tantangan yang bisa memilih.');
      if(action==='page') { const page=Number(arg);if(!Number.isInteger(page)||page<0||page*8>=g.candidates.length)return answer('Halaman tidak valid.');g.page=page; }
      else if(action==='pick') {
        const p=g.candidates.find(p=>p.id===Number(arg));if(!p)return answer('Pemain tidak ditemukan.');
        await answer();if(!await member(m,p.id))return send(m,'Pemain sudah keluar atau bukan anggota. Pilih pemain lain.');
        g.black=p;g.status='pending';g.messageId=null;return commit(m,g);
      } else if(action==='ai') {g.black={id:0,name:'AI'};g.status='active';}
      else if(action==='cancel') {g.status='done';g.result='Pemilihan dibatalkan.';} else return answer('Aksi tidak valid.');
    } else if(g.status==='pending') {
      if(action==='cancel' && me===g.white.id) {g.status='done';g.result='Tantangan dibatalkan.';}
      else if(me===g.black.id && ['accept','decline'].includes(action)) {
        if(action==='decline') {g.status='done';g.result=`${tag(g.black)} menolak tantangan.`;}
        else {await answer();if(!await member(m,g.white.id)||!await member(m,g.black.id))return send(m,'Kedua pemain harus masih menjadi anggota grup.');g.status='active';return commit(m,g);}
      } else return answer('Hanya pemain yang ditantang bisa menerima atau menolak.');
    } else {
      if(![g.white.id,g.black.id].includes(me))return answer('Kamu bukan pemain pertandingan ini.');
      if(action==='resign')g.confirmResign=me;
      else if(action==='confirmresign' && g.confirmResign===me && Number(arg)===me) {g.status='done';g.result=`${tag(person(cb.from))} menyerah. Pemenang: ${tag(me===g.white.id?g.black:g.white)}.`;}
      else {
        const c=position(g);if(me!==(c.turn()==='w'?g.white.id:g.black.id))return answer('Belum giliranmu.');
        if(action==='clear') {g.selected=null;g.promotion=null;g.confirmResign=null;}
        else if(action==='from' && c.moves({verbose:true}).some(x=>x.from===arg)) {g.selected=arg;g.promotion=null;}
        else if(action==='to') {
          const moves=c.moves({verbose:true}).filter(x=>x.from===g.selected&&x.to===arg);if(!moves.length)return answer('Langkah tidak sah.');
          if(moves[0].promotion)g.promotion={from:g.selected,to:arg};else move(g,{from:g.selected,to:arg});
        } else if(action==='promote' && g.promotion && ['q','r','b','n'].includes(arg)) {if(!move(g,{...g.promotion,promotion:arg}))return answer('Promosi tidak sah.');}
        else return answer('Aksi tidak valid.');
      }
    }
    await answer();return commit(m,g);
  }
  return {command:(...args)=>serial(()=>command(...args)),callback:cb=>serial(()=>callback(cb)),observe:m=>serial(async()=>{if(remember(m))await store.save();})};
}
