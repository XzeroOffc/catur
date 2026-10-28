export function protectGameGestures(tg,element){
 const supports=version=>typeof tg?.isVersionAtLeast==='function'&&tg.isVersionAtLeast(version);
 const configure=()=>{
  if(supports('7.7')&&typeof tg.disableVerticalSwipes==='function')tg.disableVerticalSwipes();
  if(supports('6.2')&&typeof tg.enableClosingConfirmation==='function')tg.enableClosingConfirmation();
 };
 configure();tg?.onEvent?.('activated',configure);
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 element?.addEventListener('touchmove',prevent,{passive:false});
 element?.addEventListener('contextmenu',prevent);
 return ()=>{tg?.offEvent?.('activated',configure);element?.removeEventListener('touchmove',prevent);element?.removeEventListener('contextmenu',prevent);};
}
