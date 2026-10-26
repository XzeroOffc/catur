import {Chess} from './vendor/chess.js';
const $=id=>document.getElementById(id),tg=window.Telegram?.WebApp;
let state,selected=null,flipped=false,initialized=false,busy=false,inflight=false,pendingPromotion=null;
const names={k:'Raja',q:'Ratu',r:'Benteng',b:'Gajah',n:'Kuda',p:'Pion'};
const glyph={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
tg?.ready();tg?.expand();
function error(message){$('error').textContent=message||'';$('error').hidden=!message;}
async function request(op,extra={}){
 const r=await fetch('/api/game',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,initData:tg?.initData||'',...extra}),signal:AbortSignal.timeout(29000)});
 const body=await r.json();if(!r.ok)throw Error(body.error||'Koneksi game gagal.');return body;
}
function setState(value){
 if(state && state.revision!==value.revision){selected=null;pendingPromotion=null;$('promotion').close();}
 state=value;if(!initialized){flipped=state.yourColor==='b';initialized=true;}draw();
}
function draw(){
 const c=new Chess(state.fen),own=state.yourColor==='w'?state.white:state.black,opponent=state.yourColor==='w'?state.black:state.white;
 $('game').hidden=false;$('loading').hidden=true;$('retry').hidden=true;
 $('you').textContent=own.name;$('opponent').textContent=opponent.name;
 $('bottom-piece').textContent=state.yourColor==='w'?'♙':'♟';$('top-piece').textContent=state.yourColor==='w'?'♟':'♙';
 $('bottom-color').textContent=state.yourColor==='w'?'Putih':'Hitam';$('top-color').textContent=state.yourColor==='w'?'Hitam':'Putih';
 const done=state.status!=='active'||state.expired,turn=state.turn===state.yourColor;
 $('status').textContent=state.expired?'Pertandingan kedaluwarsa':done?state.result:turn?'Giliranmu'+(state.check?' · Skak!':''):'Menunggu langkah lawan';
 $('hint').textContent=done?'Ketik /catur di grup untuk main lagi.':selected?`Pilih tujuan untuk ${selected}.`:'Sentuh bidak, lalu petak tujuan.';
 $('resign').disabled=done||busy;
 const moves=selected?c.moves({square:selected,verbose:true}):[],destinations=new Set(moves.map(m=>m.to));
 const board=$('board');board.replaceChildren();
 const ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],files=(flipped?'hgfedcba':'abcdefgh').split('');
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const square=files[col]+ranks[row],piece=c.get(square),button=document.createElement('button');
  button.className='square'+((files[col].charCodeAt(0)-97+ranks[row])%2===1?' dark':'');
  if(selected===square)button.classList.add('selected');if(destinations.has(square))button.classList.add('target');
  if([state.lastMove?.from,state.lastMove?.to].includes(square))button.classList.add('last');
  button.setAttribute('aria-label',square+(piece?` ${names[piece.type]} ${piece.color==='w'?'putih':'hitam'}`:' kosong')+(destinations.has(square)?', tujuan sah':''));
  button.setAttribute('aria-pressed',String(selected===square));
  if(piece){const span=document.createElement('span');span.className='piece '+(piece.color==='w'?'white':'black');span.textContent=glyph[piece.type];button.append(span);}
  if(col===0){const l=document.createElement('span');l.className='coord rank';l.textContent=ranks[row];button.append(l);}
  if(row===7){const l=document.createElement('span');l.className='coord file';l.textContent=files[col];button.append(l);}
  button.addEventListener('click',()=>choose(square));board.append(button);
 }
 $('count').textContent=state.moves.length;$('history').replaceChildren();
 for(let i=0;i<state.moves.length;i+=2){const li=document.createElement('li');li.textContent=state.moves[i]+'  '+(state.moves[i+1]||'');$('history').append(li);}
}
function choose(square){
 if(busy||!state||state.status!=='active'||state.expired||state.turn!==state.yourColor)return;
 const c=new Chess(state.fen),piece=c.get(square);
 if(selected){
  const matches=c.moves({square:selected,verbose:true}).filter(m=>m.to===square);
  if(matches.length){if(matches.some(m=>m.promotion)){pendingPromotion=selected+square;$('promotion').showModal();}else act('move',{move:selected+square});return;}
 }
 selected=piece?.color===state.yourColor&&selected!==square?square:null;draw();
}
async function load(manual=false){
 if(inflight||busy)return;inflight=true;
 try{const value=await request('state');if(!state||value.revision!==state.revision||manual)setState(value);error('');}
 catch(e){error(e.message);$('loading').hidden=true;$('retry').hidden=false;}
 finally{inflight=false;}
}
async function act(op,extra={}){
 if(busy||inflight)return;busy=true;error('');draw();
 try{const value=await request(op,{...extra,revision:state.revision});selected=null;setState(value);if(value.warning)error(value.warning);tg?.HapticFeedback?.impactOccurred('light');}
 catch(e){error(e.message);try{setState(await request('state'));}catch{} }
 finally{busy=false;draw();}
}
$('flip').onclick=()=>{flipped=!flipped;draw();};$('refresh').onclick=()=>load(true);$('retry').onclick=()=>load(true);
$('close').onclick=()=>{if(tg?.initData)tg.close();else error('Buka game dari tombol Catur di Telegram.');};
$('resign').onclick=()=>$('resign-dialog').showModal();$('cancel-resign').onclick=()=>$('resign-dialog').close();
$('confirm-resign').onclick=()=>{$('resign-dialog').close();act('resign');};
$('cancel-promotion').onclick=()=>{$('promotion').close();pendingPromotion=null;};
for(const b of document.querySelectorAll('[data-piece]'))b.onclick=()=>{const move=pendingPromotion+b.dataset.piece;$('promotion').close();pendingPromotion=null;act('move',{move});};
if(!tg?.initData){$('loading').hidden=true;error('Buka Mini App melalui tombol “Buka Catur” pada pertandingan di grup Telegram.');}
else{load();setInterval(()=>{if(!document.hidden&&!$('promotion').open&&!$('resign-dialog').open)load();},4000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true);});}
