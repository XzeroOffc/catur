export function protectGameGestures(tg,element){
 const supports=version=>typeof tg?.isVersionAtLeast==='function'&&tg.isVersionAtLeast(version);
 if(supports('7.7'))tg.disableVerticalSwipes();
 if(supports('6.2'))tg.enableClosingConfirmation();
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 element?.addEventListener('touchmove',prevent,{passive:false});
 element?.addEventListener('contextmenu',prevent);
 return ()=>{element?.removeEventListener('touchmove',prevent);element?.removeEventListener('contextmenu',prevent);};
}
