import {ITEMS,TYPES,distance,safe} from './rpg-world.js';
import {createRenderer} from './rpg-render.js';
const $=id=>document.getElementById(id),tg=window.Telegram?.WebApp,renderer=createRenderer($('world'));
let state,busy=false,held=null,pending=null;
tg?.ready();tg?.expand();
const say=(s,isError=false)=>{const e=$(isError?'error':'notice');e.textContent=s;if(isError)e.hidden=!s;if($('bag').open)$('bag-status').textContent=s;};
function paint(){
 document.querySelectorAll('[data-dir]').forEach(b=>{b.disabled=!state;});
 document.querySelectorAll('#attack,#interact,#potion,[data-craft],.equip').forEach(b=>{b.disabled=busy||!state;});$('refresh').disabled=busy;
 if(!state)return;const p=state.player;
 $('level').textContent=p.level;$('hp-label').textContent=`${p.hp} / ${p.maxHp}`;$('hp').max=p.maxHp;$('hp').value=p.hp;$('xp-label').textContent=`${p.xp} / ${p.nextXp}`;$('xp').max=p.nextXp;$('xp').value=p.xp;$('gold').textContent=p.gold;$('area').textContent=p.area;$('coords').textContent=`${p.x}, ${p.y}`;$('potions').textContent=p.inventory.potion||0;
 const near=state.monsters.filter(m=>m.hp>0&&distance(m,p)<=2).sort((a,b)=>distance(a,p)-distance(b,p))[0];$('nearby').textContent=near?`${TYPES[near.kind].name} · ${near.hp}/${near.maxHp} HP`:safe(p.x,p.y)?'Zona aman':'Jelajahi sekitar';
 $('quest-state').textContent=p.questClaimed?'SELESAI':`${Number(p.kills>=5)+Number(p.gathered>=3)} / 2 tujuan`;$('quest-text').textContent=`Monster: ${Math.min(5,p.kills)}/5 · Sumber daya: ${Math.min(3,p.gathered)}/3`;
 $('events').replaceChildren(...state.events.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 if($('map-dialog').open)renderer.minimap($('minimap'));
}
function bag(){if(!state)return;const p=state.player;$('equipment').textContent=`ATK ${p.attack} · DEF ${p.defense} · ${p.equipment.weapon?ITEMS[p.equipment.weapon].name:'Pedang kayu'} · ${p.equipment.armor?ITEMS[p.equipment.armor].name:'Tanpa pelindung'}`;
 $('items').replaceChildren();for(const [id,count]of Object.entries(p.inventory)){if(!count)continue;const li=document.createElement('li'),label=document.createElement('span'),desc=document.createElement('small');label.textContent=`${ITEMS[id]?.name||id} × ${count}`;desc.textContent=ITEMS[id]?.description||'';label.append(desc);li.append(label);if(['sword','armor'].includes(id)){const b=document.createElement('button');b.textContent=Object.values(p.equipment).includes(id)?'Dipakai':'Pakai';b.className='equip';b.disabled=busy||Object.values(p.equipment).includes(id);b.onclick=()=>action('equip',{item:id});li.append(b);}$('items').append(li);}
 document.querySelectorAll('[data-craft]').forEach(b=>{b.disabled=busy||!safe(p.x,p.y);});}
async function request(op,extra={}){const r=await fetch('/api/rpg',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,initData:tg?.initData||'',...extra}),signal:AbortSignal.timeout(12000)});const b=await r.json();if(!r.ok)throw Error(b.error||'Permintaan gagal.');return b;}
function apply(next){state=next;renderer.update(next);paint();if($('bag').open)bag();}
async function sync(manual=false){if(busy||!tg?.initData||document.hidden)return;busy=true;paint();try{const next=await request('state');apply(next);if(manual||!$('notice').textContent||$('notice').textContent.startsWith('Memuat'))say('Progres tersimpan. Jelajahi dunia dengan tombol arah.');say('',true);pending=null;}catch(e){say(e.message+' Tekan Sinkronkan untuk mencoba lagi.',true);held=null;}finally{busy=false;paint();if($('bag').open)bag();}}
async function action(type,extra={}){
 if(busy||!state||!tg?.initData)return;
 if(pending){say('Periksa hasil aksi sebelumnya dengan Sinkronkan sebelum melanjutkan.',true);held=null;return;}
 busy=true;paint();pending={action:type,...extra,revision:state.revision,requestId:crypto.randomUUID()};
 try{const next=await request('action',pending);pending=null;apply(next);say('',true);if(type!=='move')say(next.events[0]||'Aksi selesai.');}
 catch(e){held=null;say(e.message+' Tekan Sinkronkan sebelum melanjutkan.',true);}
 finally{busy=false;paint();if($('bag').open)bag();}
}
for(const b of document.querySelectorAll('[data-dir]')){b.onpointerdown=e=>{e.preventDefault();held=b.dataset.dir;b.setPointerCapture?.(e.pointerId);action('move',{direction:held});};b.onpointerup=b.onpointercancel=()=>{held=null;};b.onclick=e=>{if(!e.detail)action('move',{direction:b.dataset.dir});};}
document.addEventListener('pointerup',()=>{held=null;});document.addEventListener('pointercancel',()=>{held=null;});
const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
document.addEventListener('keydown',e=>{if($('bag').open||$('map-dialog').open)return;const d=dirs[e.key];if(d){e.preventDefault();held=d;if(!e.repeat)action('move',{direction:d});}});document.addEventListener('keyup',()=>{held=null;});window.addEventListener('blur',()=>{held=null;});document.addEventListener('visibilitychange',()=>{held=null;});
$('attack').onclick=()=>action('attack');$('interact').onclick=()=>action('interact');$('potion').onclick=()=>action('potion');$('refresh').onclick=()=>sync(true);$('close').onclick=()=>tg?.close();
$('inventory').onclick=()=>{held=null;bag();$('bag').showModal();};$('bag-close').onclick=()=>$('bag').close();$('map').onclick=()=>{held=null;renderer.minimap($('minimap'));$('map-dialog').showModal();};$('map-close').onclick=()=>$('map-dialog').close();document.querySelectorAll('[data-craft]').forEach(b=>{b.onclick=()=>action('craft',{item:b.dataset.craft});});
setInterval(()=>{if(held&&!busy&&!document.hidden&&!$('bag').open&&!$('map-dialog').open)action('move',{direction:held});},320);
setInterval(()=>{if(!held&&!pending)sync();},2500);
function frame(t){renderer.draw(t);requestAnimationFrame(frame);}requestAnimationFrame(frame);paint();
if(tg?.initData)sync(true);else say('Buka dari tombol Buka RPG pada /rpg di Telegram.',true);
