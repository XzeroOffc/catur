import {createHmac,timingSafeEqual} from 'node:crypto';
export function same(a,b) { const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length && timingSafeEqual(x,y); }
export function verifyIdentity(raw,token,now=Date.now()) {
  if(typeof raw!=='string'||raw.length>16000)throw Error('Buka game melalui tombol di Telegram.');
  const params=new URLSearchParams(raw),hash=params.get('hash');
  if(!/^[a-f0-9]{64}$/i.test(hash||''))throw Error('Sesi Telegram tidak valid.');
  const entries=[...params.entries()];
  if(new Set(entries.map(x=>x[0])).size!==entries.length)throw Error('Sesi Telegram tidak valid.');
  const check=entries.filter(([k])=>k!=='hash').sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=createHmac('sha256','WebAppData').update(token).digest();
  const expected=createHmac('sha256',secret).update(check).digest('hex');
  if(!same(hash,expected))throw Error('Tanda tangan Telegram tidak valid.');
  const age=now/1000-Number(params.get('auth_date'));
  if(!Number.isFinite(age)||age < -30 || age > 86400)throw Error('Sesi kedaluwarsa. Tutup dan buka lagi game.');
  const user=JSON.parse(params.get('user')||'null');
  if(!Number.isSafeInteger(user?.id)||user.id<=0||user.is_bot)throw Error('Identitas pemain tidak valid.');
  return {user, startParam: params.get('start_param') || ''};
}
export function verifyInitData(raw,token,now=Date.now()) {
  const {user,startParam}=verifyIdentity(raw,token,now);
  const launch=JSON.parse(Buffer.from(startParam,'base64url').toString());
  if(!Array.isArray(launch)||launch.length!==3||!Number.isSafeInteger(launch[0])||launch[0]>=0||!Number.isSafeInteger(launch[1])||launch[1]<0||!/^\w{12}$/.test(launch[2]))throw Error('Buka game dari pesan pertandingan di grup.');
  return {user,chatId:launch[0],threadId:launch[1],gameId:launch[2]};
}
