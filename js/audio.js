/* Crux.Audio: synthesized cues (Web Audio) + spoken cues (SpeechSynthesis). No assets, no network.
   Respects prefs 'sound' / 'voice'. Everything no-ops quietly when unsupported or muted. */
(function(){
 const Crux=window.Crux=window.Crux||{};
 let ctx=null,englishVoice=null,voicesReady=false;

 function ensureCtx(){
  if(!ctx){
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return null;
   try{ctx=new AC();}catch{return null;}
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
 }

 function pickVoice(){
  if(!('speechSynthesis'in window))return null;
  let list=[];
  try{list=speechSynthesis.getVoices()||[];}catch{return null;}
  if(!list.length)return null;
  voicesReady=true;
  return list.find(v=>/^en[-_]US/i.test(v.lang)&&v.localService)
   ||list.find(v=>/^en[-_]US/i.test(v.lang))
   ||list.find(v=>/^en/i.test(v.lang)&&v.localService)
   ||list.find(v=>/^en/i.test(v.lang))
   ||list[0];
 }

 // Must run from a user gesture: creates/resumes the AudioContext and primes speech synthesis.
 function unlock(){
  ensureCtx();
  if('speechSynthesis'in window){
   try{
    const u=new SpeechSynthesisUtterance('');
    u.volume=0;u.rate=1;
    speechSynthesis.speak(u);
    speechSynthesis.cancel();
   }catch{}
   englishVoice=pickVoice();
   if(!voicesReady&&'onvoiceschanged'in speechSynthesis){
    speechSynthesis.onvoiceschanged=()=>{englishVoice=pickVoice();};
   }
  }
  return true;
 }

 // A short, soft tone. start/dur in seconds, relative to now.
 function tone(freq,start,dur,{type='sine',peak=.22,slideTo=null}={}){
  const c=ensureCtx();if(!c)return;
  const t0=c.currentTime+start,osc=c.createOscillator(),gain=c.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,t0);
  if(slideTo)osc.frequency.exponentialRampToValueAtTime(slideTo,t0+dur);
  gain.gain.setValueAtTime(0.0001,t0);
  gain.gain.exponentialRampToValueAtTime(peak,t0+Math.min(.02,dur/3));
  gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  osc.connect(gain);gain.connect(c.destination);
  osc.start(t0);osc.stop(t0+dur+.03);
 }

 const KINDS={
  tick:(opts={})=>tone(opts.quiet?1500:1650,0,.055,{type:'sine',peak:opts.quiet?.07:.14}),
  go:()=>{tone(523.25,0,.11,{type:'sine',peak:.22});tone(783.99,.1,.16,{type:'sine',peak:.24});},
  stop:()=>{tone(494,0,.1,{type:'sine',peak:.18});tone(330,.09,.22,{type:'sine',peak:.16});},
  done:()=>{tone(523.25,0,.16,{type:'sine',peak:.2});tone(659.25,.15,.16,{type:'sine',peak:.2});tone(783.99,.3,.42,{type:'sine',peak:.22});},
 };

 function beep(kind,opts){
  if(!Crux.prefs||!Crux.prefs.get('sound',true))return;
  const fn=KINDS[kind];
  if(fn)fn(opts);
 }

 function say(text){
  if(!Crux.prefs||!Crux.prefs.get('voice',true))return;
  if(!text||!('speechSynthesis'in window))return;
  try{
   speechSynthesis.cancel();
   const u=new SpeechSynthesisUtterance(text);
   u.rate=1.02;u.pitch=1;u.volume=1;
   if(!englishVoice)englishVoice=pickVoice();
   if(englishVoice)u.voice=englishVoice;
   speechSynthesis.speak(u);
  }catch{}
 }

 Crux.Audio={unlock,beep,say};
})();
