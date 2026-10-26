const tg=window.Telegram?.WebApp,$=id=>document.getElementById(id);
let state,busy=false,cooldown=0,pending=null;
tg?.ready();tg?.expand();
function error(text){$('error').textContent=text||'';$('error').hidden=!text;}
function paint(){if(!state)return;$('balance').textContent=state.balance.toLocaleString('id-ID');$('progress').value=Math.min(20000,state.balance);$('remaining').textContent=`${state.remaining}/20 putaran tersisa hari ini`;const wait=Math.max(0,Math.ceil((cooldown-Date.now())/1000));$('spin').disabled=busy||wait>0||state.remaining===0;$('spin').textContent=busy?'Memproses…':wait?`Tunggu ${wait} detik`:'Putar gratis';}
async function request(op,extra={}){const r=await fetch('/api/slot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,initData:tg?.initData||'',...extra}),signal:AbortSignal.timeout(15000)});const b=await r.json();if(!r.ok)throw Error(b.error||'Permintaan gagal.');return b;}
async function load(){if(busy)return;busy=true;paint();error('');try{state=await request('state');cooldown=(state.last?.at||0)+5000;$('result').textContent=state.pending?'Penukaran tertunda. Selesaikan melalui /slot di bot.':'Siap bermain. Setiap putaran menambah poin.';}catch(e){error(e.message);}finally{busy=false;paint();}}
$('spin').onclick=async()=>{if(busy||!state)return;busy=true;paint();error('');pending ||= {requestId:crypto.randomUUID(),revision:state.revision};try{state=await request('spin',pending);pending=null;cooldown=state.last.at+5000;document.querySelectorAll('.reels span').forEach(el=>{el.textContent=state.last.face;});$('result').textContent=`+${state.last.points.toLocaleString('id-ID')} poin ditambahkan.`;}catch(e){error(e.message+' Tekan Muat ulang untuk memeriksa saldo.');}finally{busy=false;paint();}};
$('refresh').onclick=async()=>{await load();if(state)pending=null;};
$('redeem').onclick=()=>{const text='Kembali ke bot, kirim /slot, lalu pilih Tukar 20.000 Poin. Penukaran perlu konfirmasi dan tidak boleh ada server aktif.';if(tg?.showAlert)tg.showAlert(text);else error(text);};
$('close').onclick=()=>tg?.close();
setInterval(paint,500);
if(tg?.initData)load();else{error('Buka Mini App dari tombol Main Slot pada /slot di Telegram.');$('result').textContent='Sesi Telegram diperlukan.';}
