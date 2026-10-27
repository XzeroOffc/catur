import {randomInt} from 'node:crypto';
import {storyTarget} from '../public/rpg-story.js';
import {WORLD,TYPES,NODES,walkable,safe,area,distance,maxHp,attack,defense,nextXp} from '../public/rpg-world.js';
const SPAWNS=[['slime',10,6],['slime',12,10],['slime',8,14],['slime',12,22],['slime',7,25],['wolf',23,8],['wolf',28,8],['wolf',31,12],['wolf',25,14],['skeleton',27,23],['skeleton',32,23],['skeleton',35,28]];
function makeMonster([kind,x,y],i){return {id:'m'+i,kind,x,y,home:{x,y},hp:TYPES[kind].hp,respawnAt:0,lastAttack:0};}
export function ensureRpg(data,now){
 data.rpg ||= {version:1,revision:0,player:{...WORLD.camp,level:1,xp:0,hp:60,gold:0,inventory:{potion:3},equipment:{weapon:null,armor:null},kills:0,gathered:0,questClaimed:false},monsters:SPAWNS.map(makeMonster),nodes:{},lastTick:now,lastAction:0,receipts:[],events:['Selamat datang di Kamp Pelita. Jelajahi padang di sebelah timur.']};
 data.rpg.story ||= {stage:0,guardianDefeated:false};
 return data.rpg;
}
function log(g,text){g.events.unshift(text);g.events=g.events.slice(0,8);}
export function gainXp(g,amount){const p=g.player;p.xp+=amount;while(p.level<50&&p.xp>=nextXp(p.level)){p.xp-=nextXp(p.level);p.level++;p.hp=maxHp(p);log(g,`Naik level ${p.level}! HP dipulihkan.`);}if(p.level===50)p.xp=Math.min(p.xp,nextXp(50));}
function add(p,item,n=1){p.inventory[item]=(p.inventory[item]||0)+n;}
function defeatPlayer(g){const p=g.player;p.x=WORLD.camp.x;p.y=WORLD.camp.y;p.hp=maxHp(p);log(g,'Kamu tumbang dan kembali ke kamp. Item dan EXP tetap aman.');}
function damagePlayer(g,m,now){const p=g.player;if(safe(p.x,p.y)||now-m.lastAttack<2000)return;m.lastAttack=now;const hit=Math.max(1,TYPES[m.kind].atk-defense(p));p.hp-=hit;log(g,`${TYPES[m.kind].name} menyerang: -${hit} HP.`);if(p.hp<=0)defeatPlayer(g);}
export function tick(g,now,draw=randomInt){
 if(now-g.lastTick<1100)return;
 // Tidak mensimulasikan serangan selama pemain menutup game.
 if(now-g.lastTick>10000){g.lastTick=now;return;}
 g.lastTick=now;
 for(const m of g.monsters){
  if(m.hp<=0){if(now>=m.respawnAt){m.hp=TYPES[m.kind].hp;Object.assign(m,m.home);m.lastAttack=now;}continue;}
  const p=g.player,d=distance(m,p);let dx=0,dy=0;
  if(d<=4&&!safe(p.x,p.y)){if(d<=1){damagePlayer(g,m,now);continue;}if(Math.abs(p.x-m.x)>=Math.abs(p.y-m.y))dx=Math.sign(p.x-m.x);else dy=Math.sign(p.y-m.y);}
  else{[dx,dy]=[[0,0],[1,0],[-1,0],[0,1],[0,-1]][draw(5)];}
  const x=m.x+dx,y=m.y+dy;
  if(walkable(x,y)&&!safe(x,y)&&!(x===p.x&&y===p.y)&&Math.abs(x-m.home.x)+Math.abs(y-m.home.y)<=7&&!g.monsters.some(o=>o!==m&&o.hp>0&&o.x===x&&o.y===y)){m.x=x;m.y=y;}
 }
 g.revision++;
}
function quest(g){const p=g.player;if(!p.questClaimed&&p.kills>=5&&p.gathered>=3){p.questClaimed=true;p.gold+=50;add(p,'armor');gainXp(g,60);log(g,'Misi Penjelajah selesai: pelindung kulit, 50 koin, dan 60 EXP.');}}
export function act(g,b,now,draw=randomInt){
 if(!/^[\w-]{16,80}$/.test(b.requestId||''))throw Error('ID aksi tidak valid.');
 if(g.receipts.includes(b.requestId))return;
 if(b.revision!==g.revision)throw Error('Dunia berubah. Muat ulang sebelum melanjutkan.');
 if(now-g.lastAction<220)throw Error('Tunggu sebentar sebelum aksi berikutnya.');
 const p=g.player;
 if(b.action==='move'){
  const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},d=dirs[b.direction];if(!d)throw Error('Arah tidak valid.');
  const x=p.x+d[0],y=p.y+d[1];if(!walkable(x,y))throw Error('Jalur terhalang. Cari jalan atau jembatan.');
  if(g.monsters.some(m=>m.hp>0&&m.x===x&&m.y===y))throw Error('Ada monster di depan. Serang dari petak sebelahnya.');p.x=x;p.y=y;
 }else if(b.action==='attack'){
  const m=g.monsters.filter(m=>m.hp>0&&distance(m,p)<=1).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!m)throw Error('Dekati monster hingga satu petak untuk menyerang.');
  const hit=attack(p);m.hp-=hit;log(g,`Kamu menyerang ${TYPES[m.kind].name}: ${hit} damage.`);
  if(m.hp<=0){if(m.id==='m11'&&g.story.stage===3)g.story.guardianDefeated=true;m.hp=0;m.respawnAt=now+45000;p.kills++;p.gold+=TYPES[m.kind].gold;gainXp(g,TYPES[m.kind].xp);const item=['herb','wood','ore','potion','fang'][draw(5)];add(p,item);log(g,`${TYPES[m.kind].name} kalah: +${TYPES[m.kind].xp} EXP, +${TYPES[m.kind].gold} koin, +1 ${item}.`);}else damagePlayer(g,m,now);
 }else if(b.action==='interact'){
  const destination=storyTarget(g.story);
  if(destination&&distance(p,destination)<=1){
   if(g.story.stage===3&&!g.story.guardianDefeated)throw Error('Kalahkan Penjaga Segel di tenggara sebelum mengaktifkan altar.');
   log(g,destination.dialog);g.story.stage++;
   if(g.story.stage===5){p.gold+=150;gainXp(g,120);add(p,'potion',3);log(g,'Petualangan Pelita selesai: +150 koin, +120 EXP, +3 ramuan.');}
  }else if(distance(p,WORLD.camp)<=2){p.hp=maxHp(p);log(g,'Istirahat di api unggun. HP penuh.');}
  else{const n=NODES.find(n=>distance(n,p)<=1);if(!n)throw Error('Dekati herba, kayu, bijih, peti, atau api unggun.');if((g.nodes[n.id]||0)>now)throw Error('Sumber daya ini belum tersedia lagi.');
   if(n.kind==='chest'){g.nodes[n.id]=Number.MAX_SAFE_INTEGER;p.gold+=30;add(p,n.id==='chest3'?'sword':'potion');log(g,'Peti dibuka: +30 koin dan 1 item.');}
   else{g.nodes[n.id]=now+600000;add(p,n.kind);p.gathered++;gainXp(g,5);log(g,`Mengambil ${n.kind}: +5 EXP.`);}
  }
 }else if(b.action==='potion'){
  if(!(p.inventory.potion>0))throw Error('Ramuan habis. Buat ramuan di kamp.');if(p.hp>=maxHp(p))throw Error('HP masih penuh.');p.inventory.potion--;p.hp=Math.min(maxHp(p),p.hp+35);log(g,'Ramuan digunakan: pulih hingga 35 HP.');
 }else if(b.action==='equip'){
  if(!['sword','armor'].includes(b.item)||!(p.inventory[b.item]>0))throw Error('Perlengkapan belum dimiliki.');p.equipment[b.item==='sword'?'weapon':'armor']=b.item;log(g,'Perlengkapan dipakai.');
 }else if(b.action==='craft'){
  if(!safe(p.x,p.y))throw Error('Craft hanya tersedia di kamp.');const recipes={potion:{herb:2},sword:{wood:5,ore:3}},recipe=recipes[b.item];if(!recipe)throw Error('Resep tidak dikenal.');for(const [item,n]of Object.entries(recipe))if((p.inventory[item]||0)<n)throw Error('Bahan belum cukup.');for(const [item,n]of Object.entries(recipe))p.inventory[item]-=n;add(p,b.item);log(g,`${b.item} berhasil dibuat.`);
 }else throw Error('Aksi tidak dikenal.');
 quest(g);g.lastAction=now;g.revision++;g.receipts.push(b.requestId);g.receipts=g.receipts.slice(-64);tick(g,now,draw);
}
export function viewRpg(g,now){return {story:{...g.story},revision:g.revision,player:{...g.player,maxHp:maxHp(g.player),attack:attack(g.player),defense:defense(g.player),nextXp:nextXp(g.player.level),area:area(g.player.x,g.player.y)},monsters:g.monsters.map(({id,kind,x,y,hp})=>({id,kind,x,y,hp,maxHp:TYPES[kind].hp})),nodes:NODES.map(n=>({...n,available:(g.nodes[n.id]||0)<=now})),events:g.events,serverTime:now};}
