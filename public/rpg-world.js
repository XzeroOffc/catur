export const WORLD={width:40,height:34,camp:{x:5,y:5}};
export const ITEMS={potion:{name:'Ramuan HP',description:'Pulihkan 35 HP'},herb:{name:'Herba',description:'Bahan ramuan'},wood:{name:'Kayu',description:'Bahan pedang'},ore:{name:'Bijih besi',description:'Bahan pedang'},fang:{name:'Taring',description:'Trofi monster'},sword:{name:'Pedang besi',description:'+7 ATK saat dipakai'},armor:{name:'Pelindung kulit',description:'+3 DEF saat dipakai'}};
export const TYPES={slime:{name:'Slime',hp:18,atk:3,xp:15,gold:5,color:'#8cce67'},wolf:{name:'Serigala',hp:35,atk:6,xp:30,gold:10,color:'#bcc4c9'},skeleton:{name:'Penjaga reruntuhan',hp:55,atk:9,xp:50,gold:18,color:'#e2d8b8'}};
export const NODES=[{id:'herb1',kind:'herb',x:8,y:5},{id:'wood1',kind:'wood',x:10,y:9},{id:'herb2',kind:'herb',x:12,y:12},{id:'wood2',kind:'wood',x:22,y:9},{id:'ore1',kind:'ore',x:28,y:21},{id:'ore2',kind:'ore',x:32,y:26},{id:'wood3',kind:'wood',x:26,y:7},{id:'herb3',kind:'herb',x:7,y:20},{id:'chest1',kind:'chest',x:14,y:5},{id:'chest2',kind:'chest',x:28,y:12},{id:'chest3',kind:'chest',x:35,y:29}];
export function safe(x,y){return x>=2&&x<=8&&y>=2&&y<=8;}
export function tile(x,y){
 if(x<0||y<0||x>=WORLD.width||y>=WORLD.height)return 'wall';
 if(x===0||y===0||x===39||y===33)return 'wall';
 if(x>=17&&x<=20&&y>=10&&y<=27&&y!==18&&y!==19)return 'water';
 if((x===17||x===18||x===19||x===20)&&(y===18||y===19))return 'bridge';
 if(safe(x,y))return 'camp';
 if(x>=25&&y>=19)return 'ruins';
 if(x>=22&&y<=15)return 'forest';
 return 'grass';
}
export function walkable(x,y){return !['wall','water'].includes(tile(x,y));}
export function area(x,y){return safe(x,y)?'Kamp Pelita':tile(x,y)==='ruins'?'Reruntuhan Timur':tile(x,y)==='forest'?'Hutan Lumut':'Padang Embun';}
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function maxHp(p){return 60+(p.level-1)*12;}
export function attack(p){return 7+(p.level-1)*2+(p.equipment.weapon==='sword'?7:0);}
export function defense(p){return 1+Math.floor((p.level-1)/2)+(p.equipment.armor==='armor'?3:0);}
export const nextXp=level=>level*50;
