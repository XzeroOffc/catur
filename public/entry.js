const tg=window.Telegram?.WebApp;
if(tg?.initDataUnsafe?.start_param==='slot'||new URLSearchParams(location.search).get('tgWebAppStartParam')==='slot'){
 location.replace('/slot.html'+location.search+location.hash);
}else{import('./app.js');}
