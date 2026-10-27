const tg=window.Telegram?.WebApp;
const game=tg?.initDataUnsafe?.start_param||new URLSearchParams(location.search).get('tgWebAppStartParam');
if(['slot','rpg'].includes(game)){location.replace('/'+game+'.html'+location.search+location.hash);}
else{import('./app.js');}
