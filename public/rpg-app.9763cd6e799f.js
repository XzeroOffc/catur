import {ITEMS,TYPES,distance,safe} from './rpg-world.9763cd6e799f.js';
import {createRenderer} from './rpg-iso.9763cd6e799f.js';
import {storyTarget} from './rpg-story.9763cd6e799f.js';
import {protectGameGestures} from './rpg-gestures.9763cd6e799f.js';
import {createPrediction} from './rpg-prediction.9763cd6e799f.js';
const $=id=>document.getElementById(id),tg=window.Telegram?.WebApp,renderer=createRenderer($('world'));
const controlsStyle=document.createElement('link');controlsStyle.rel='stylesheet';controlsStyle.href='/rpg-controls.9763cd6e799f.css';document.head.append(controlsStyle);
const storyBox=document.createElement('section'),storyTitle=document.createElement('h2'),storyText=document.createElement('p');storyBox.className='quest';storyBox.append(storyTitle,storyText);$('notice').before(storyBox);
let state,busy=false,held=null,pending=null,lastAction=0;
const prediction=createPrediction();let lastFrame=0,travelSentAt=0;
tg?.ready();tg?.expand();
protectGameGestures(tg,document.querySelector('.controls'));
const say=(s,isError=false)=>{const e=$(isError?'error':'notice');e.textContent=s;if(isError)e.hidden=!s;if($('bag').open)$('bag-status').textContent=s;};
function paint(){
 document.querySelectorAll('[data-dir]').forEach(b=>{b.disabled=!state;});
 document.querySelectorAll('#attack,#interact,#potion,[data-craft],.equip').forEach(b=>{b.disabled=busy||!state;});$('refresh').disabled=busy;
 if(!state)return;const p=state.player;
 const destination=storyTarget(state.story);
 storyTitle.textContent=destination?`Bab ${(state.story?.stage||0)+1}: ${destination.title}`:'Pelita kembali menyala';
 storyText.textContent=destination?destination.text:'Cerita selesai. Kamu tetap dapat menjelajah, mengumpulkan item, dan naik level.';
 const resource=state.nodes.find(n=>n.available&&distance(n,p)<=1);
 $('interact').querySelector?.('small')?.replaceChildren(document.createTextNode(distance(p,{x:5,y:5})<=2?'Istirahat: pulihkan HP':resource?resource.kind==='chest'?'Buka peti':`Ambil ${ITEMS[resource.kind]?.name||resource.kind}`:'Dekati sumber daya / api unggun'));
 if(destination&&distance(p,destination)<=1)$('interact').querySelector?.('small')?.replaceChildren(document.createTextNode(`Interaksi: ${destination.label}`));
 $('level').textContent=p.level;$('hp-label').textContent=`${p.hp} / ${p.maxHp}`;$('hp').max=p.maxHp;$('hp').value=p.hp;$('xp-label').textContent=`${p.xp} / ${p.nextXp}`;$('xp').max=p.nextXp;$('xp').value=p.xp;$('gold').textContent=p.gold;$('area').textContent=p.area;$('coords').textContent=`${p.x}, ${p.y}`;$('potions').textContent=p.inventory.potion||0;
 const near=state.monsters.filter(m=>m.hp>0&&distance(m,p)<=2).sort((a,b)=>distance(a,p)-distance(b,p))[0];$('nearby').textContent=near?`${TYPES[near.kind].name} · ${near.hp}/${near.maxHp} HP`:safe(p.x,p.y)?'Zona aman':'Jelajahi sekitar';
 $('quest-state').textContent=p.questClaimed?'SELESAI':`${Number(p.kills>=5)+Number(p.gathered>=3)} / 2 tujuan`;$('quest-text').textContent=`Monster: ${Math.min(5,p.kills)}/5 · Sumber daya: ${Math.min(3,p.gathered)}/3`;
 $('events').replaceChildren(...state.events.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 if($('map-dialog').open)renderer.minimap($('minimap'));
 $('coords').textContent=`${p.x.toFixed(1)}, ${p.y.toFixed(1)}`;
}
function bag(){if(!state)return;const p=state.player;$('equipment').textContent=`ATK ${p.attack} · DEF ${p.defense} · ${p.equipment.weapon?ITEMS[p.equipment.weapon].name:'Pedang kayu'} · ${p.equipment.armor?ITEMS[p.equipment.armor].name:'Tanpa pelindung'}`;
 $('items').replaceChildren();for(const [id,count]of Object.entries(p.inventory)){if(!count)continue;const li=document.createElement('li'),label=document.createElement('span'),desc=document.createElement('small');label.textContent=`${ITEMS[id]?.name||id} × ${count}`;desc.textContent=ITEMS[id]?.description||'';label.append(desc);li.append(label);if(['sword','armor'].includes(id)){const b=document.createElement('button');b.textContent=Object.values(p.equipment).includes(id)?'Dipakai':'Pakai';b.className='equip';b.disabled=busy||Object.values(p.equipment).includes(id);b.onclick=()=>action('equip',{item:id});li.append(b);}$('items').append(li);}
 document.querySelectorAll('[data-craft]').forEach(b=>{b.disabled=busy||!safe(p.x,p.y);});}
async function request(op,extra={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch('/api/rpg',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,initData:tg?.initData||'',...extra}),signal:controller.signal});const b=await r.json();if(!r.ok){const e=Error(b.error||'Permintaan gagal.');e.rejected=r.status===400||r.status===401;throw e;}return b;}finally{clearTimeout(timer);}}
function apply(next){state=next;prediction.rebase(next.player,next.monsters);renderer.update(next);paint();if($('bag').open)bag();}
async function sync(manual=false){if(busy||!tg?.initData||document.hidden)return;busy=true;paint();try{const next=await request('state');apply(next);if(manual||!$('notice').textContent||$('notice').textContent.startsWith('Memuat'))say('Progres tersimpan. Jelajahi dunia dengan tombol arah.');say('',true);pending=null;}catch(e){say(e.message+' Tekan Sinkronkan untuk mencoba lagi.',true);held=null;}finally{busy=false;paint();if($('bag').open)bag();}}
async function action(type,extra={}){
 if(type==='move'&&typeof extra.direction==='object')return;
 if(type!=='move'&&type!=='travel'&&prediction.pending&&!busy){held=null;await new Promise(resolve=>setTimeout(resolve,Math.max(0,245-(Date.now()-lastAction))));if(busy)return;await action('travel',{path:prediction.take()});if(pending)return;await new Promise(resolve=>setTimeout(resolve,Math.max(0,245-(Date.now()-lastAction))));}
 if(type==='move'&&typeof extra.direction==='object'){type='walk';extra={vector:extra.direction,seconds:.24};}
 if(busy||!state||!tg?.initData)return;
 if(pending){held=null;await sync(true);return;}
 if(Date.now()-lastAction<240)return;
 lastAction=Date.now();
 busy=true;paint();pending={action:type,...extra,revision:state.revision,requestId:crypto.randomUUID()};
 renderer.animate?.(type,extra);
 try{const next=await request('action',pending);pending=null;apply(next);say('',true);if(type!=='move')say(next.events[0]||'Aksi selesai.');}
 catch(e){held=null;prediction.reset(state.player);renderer.update(state);if(e.rejected)pending=null;say(e.message+(e.rejected?'':' Memulihkan koneksi…'),true);}
 finally{busy=false;paint();if($('bag').open)bag();}
}
for(const b of document.querySelectorAll('[data-dir]')){b.onpointerdown=e=>{e.preventDefault();held=b.dataset.dir;b.setPointerCapture?.(e.pointerId);action('move',{direction:held});};b.onpointerup=b.onpointercancel=()=>{held=null;};b.onclick=e=>{if(!e.detail)action('move',{direction:b.dataset.dir});};}
document.addEventListener('pointerup',()=>{held=null;});document.addEventListener('pointercancel',()=>{held=null;});
const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
const stick=document.createElement('div');stick.className='joystick';stick.setAttribute('aria-label','Joystick gerak. Geser untuk berjalan.');
const knob=document.createElement('span');knob.className='joystick-knob';stick.append(knob);
document.querySelector('.dpad')?.before(stick);
let pointer=null;
function releaseStick(){pointer=null;held=null;knob.style.transform='translate(0,0)';}
function steer(e){if(pointer!==e.pointerId)return;if(e.cancelable)e.preventDefault();const box=stick.getBoundingClientRect(),x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2,r=Math.hypot(x,y),scale=Math.min(1,42/Math.max(1,r));knob.style.transform=`translate(${x*scale}px,${y*scale}px)`;const wx=x/2+y,wy=y-x/2,n=Math.hypot(wx,wy);held=r<12?null:{x:wx/n*Math.min(1,r/42),y:wy/n*Math.min(1,r/42)};if(held)action('move',{direction:held});}
stick.onpointerdown=e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(e.pointerId);steer(e);};stick.onpointermove=steer;stick.onpointerup=stick.onpointercancel=stick.onlostpointercapture=releaseStick;
window.addEventListener('blur',releaseStick);document.addEventListener('visibilitychange',releaseStick);
document.addEventListener('keydown',e=>{if($('bag').open||$('map-dialog').open)return;const d=dirs[e.key];if(d){e.preventDefault();held=d;if(!e.repeat)action('move',{direction:d});}});document.addEventListener('keyup',()=>{held=null;});window.addEventListener('blur',()=>{held=null;});document.addEventListener('visibilitychange',()=>{held=null;});
$('attack').onclick=()=>action('attack');$('interact').onclick=()=>action('interact');$('potion').onclick=()=>action('potion');$('refresh').onclick=()=>sync(true);$('close').onclick=()=>tg?.close();
$('inventory').onclick=()=>{held=null;bag();$('bag').showModal();};$('bag-close').onclick=()=>$('bag').close();$('map').onclick=()=>{held=null;renderer.minimap($('minimap'));$('map-dialog').showModal();};$('map-close').onclick=()=>$('map-dialog').close();document.querySelectorAll('[data-craft]').forEach(b=>{b.onclick=()=>action('craft',{item:b.dataset.craft});});
setInterval(()=>{if(held&&!busy&&!document.hidden&&!$('bag').open&&!$('map-dialog').open)action('move',{direction:held});},320);
setInterval(()=>{if(!held||pending)sync();},1800);
function frame(t){
 const dt=lastFrame?Math.min(.05,(t-lastFrame)/1000):0;lastFrame=t;
 const active=state&&!pending?.action?.startsWith('attack')&&!document.hidden&&!$('bag').open&&!$('map-dialog').open;
 if(active&&held&&typeof held==='object')prediction.step(held,dt,state.monsters);
 if(state&&prediction.position)renderer.preview?.(prediction.position,Boolean(active&&held),held);
 if(state&&!busy&&prediction.pending&&t-travelSentAt>300&&Date.now()-lastAction>=240){travelSentAt=t;action('travel',{path:prediction.take()});}
 renderer.draw(t);requestAnimationFrame(frame);
}requestAnimationFrame(frame);paint();
if(tg?.initData)sync(true);else say('Buka dari tombol Buka RPG pada /rpg di Telegram.',true);
