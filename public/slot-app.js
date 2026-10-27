const tg=window.Telegram?.WebApp,$=id=>document.getElementById(id);
const faces=['🍒','🍋','🍇','⭐'];
const tracks=[0,1,2].map(i=>$(`reel-${i}`));
const machine=document.querySelector('.machine');
let state,busy=false,cooldown=0,pending=null;
let motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
tg?.ready();tg?.expand();
function error(text){$('error').textContent=text||'';$('error').hidden=!text;}
function fill(track,items){track.replaceChildren(...items.map(face=>{const el=document.createElement('span');el.className='symbol';el.textContent=face;return el;}));}
function resting(face,index){const n=faces.includes(face)?faces.indexOf(face):index%faces.length;fill(tracks[index],[faces[(n+3)%4],faces[n],faces[(n+1)%4]]);tracks[index].parentElement.classList.remove('running');}
function restore(){tracks.forEach((_,i)=>resting(state?.last?.face,i));}
function animateStart(){machine.classList.remove('won');if(!motion)return;tracks.forEach((t,i)=>{fill(t,Array.from({length:8},(_,n)=>faces[(n+i)%4]));t.parentElement.classList.add('running');});}
async function reveal(face){for(let i=0;i<3;i++){if(motion)await pause(i?220:0);resting(face,i);if(motion&&tracks[i].animate)tracks[i].animate([{transform:'translateY(-18px)'},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});}}
function paint(){
 $('refresh').disabled=busy;$('motion').disabled=busy;$('motion').textContent=`Animasi: ${motion?'aktif':'mati'}`;$('motion').setAttribute('aria-pressed',String(motion));
 if(!state){$('spin').disabled=true;return;}
 $('balance').textContent=state.balance.toLocaleString('id-ID');$('progress').value=Math.min(20000,state.balance);
 $('progress-label').textContent=`${Math.min(20000,state.balance).toLocaleString('id-ID')} / 20.000 poin`;
 $('last-prize').textContent=state.last?`+${state.last.points.toLocaleString('id-ID')}`:'Belum ada';
 $('remaining').textContent=`${state.remaining} / 20`;
 const wait=Math.max(0,Math.ceil((cooldown-Date.now())/1000));
 $('spin').disabled=busy||wait>0||state.remaining===0;
 $('spin-label').textContent=busy?'BERPUTAR':state.remaining===0?'SELESAI':wait?`${wait} DETIK`:'PUTAR';
}
async function request(op,extra={}){const r=await fetch('/api/slot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,initData:tg?.initData||'',...extra}),signal:AbortSignal.timeout(15000)});const b=await r.json();if(!r.ok)throw Error(b.error||'Permintaan gagal.');return b;}
async function load(){if(busy)return false;busy=true;paint();error('');try{state=await request('state');cooldown=(state.last?.at||0)+5000;restore();$('result').textContent=state.pending?'Penukaran tertunda. Selesaikan melalui /slot di bot.':state.remaining===0?'Putaran hari ini selesai. Kembali setelah 00.00 WIT.':'Siap bermain. Tekan PUTAR untuk mulai.';return true;}catch(e){error(e.message);$('result').textContent='Saldo belum termuat. Tekan Muat ulang saldo.';return false;}finally{busy=false;paint();}}
$('spin').onclick=async()=>{
 if(busy||!state||Date.now()<cooldown||state.remaining===0)return;
 busy=true;paint();error('');animateStart();$('result').textContent='Reel berputar…';
 const started=Date.now();pending ||= {requestId:crypto.randomUUID(),revision:state.revision};
 try{
  const next=await request('spin',pending);
  if(motion)await pause(Math.max(0,850-(Date.now()-started)));
  await reveal(next.last.face);
  state=next;pending=null;cooldown=state.last.at+5000;
  machine.classList.add('won');$('result').textContent=`+${state.last.points.toLocaleString('id-ID')} POIN`;
 }catch(e){restore();error(e.message+' Tekan Muat ulang untuk memeriksa saldo.');$('result').textContent='Hasil belum terkonfirmasi. Periksa saldo sebelum mencoba lagi.';}
 finally{busy=false;paint();}
};
$('refresh').onclick=async()=>{if(await load())pending=null;};
$('motion').onclick=()=>{if(busy)return;motion=!motion;paint();};
$('redeem').onclick=()=>{const text='Kembali ke bot, kirim /slot, lalu pilih Tukar 20.000 Poin. Penukaran perlu konfirmasi dan tidak boleh ada server aktif.';if(tg?.showAlert)tg.showAlert(text);else error(text);};
$('close').onclick=()=>tg?.close();
setInterval(paint,500);restore();paint();
if(tg?.initData)load();else{error('Buka Mini App dari tombol Main Slot pada /slot di Telegram.');$('result').textContent='Sesi Telegram diperlukan.';}
