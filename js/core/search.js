/* Local keyword search with anatomy/equipment synonyms, plurals and one-letter typos. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Search=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const aliases={hip:'hip',hips:'hip',pelvis:'hip',pelvic:'hip',glute:'glute',glutes:'glute',butt:'glute',ab:'core',abs:'core',abdominal:'core',abdominals:'core',core:'core',trunk:'core',
  shoulder:'shoulder',shoulders:'shoulder',delt:'shoulder',delts:'shoulder',scapular:'scapula',scapula:'scapula',lat:'lat',lats:'lat',quad:'quad',quads:'quad',quadriceps:'quad',
  hamstring:'hamstring',hamstrings:'hamstring',calf:'calf',calves:'calf',ankles:'ankle',feet:'foot',thoracic:'thoracic',forearms:'forearm',forearm:'forearm',
  elastic:'band',bands:'band',band:'band',dowel:'bar',stick:'bar',dumbbell:'weight',weights:'weight',stretching:'stretch',stretches:'stretch',flexibility:'mobility',mobilization:'mobility',
  beginner:'beginner',easy:'beginner',gentle:'light',intermediate:'intermediate',advanced:'advanced',hard:'high',strengthening:'strength',
  pullup:'pull',chinup:'pull',row:'pull',rowing:'pull',pulling:'pull',pushup:'push',pressup:'push',pushing:'push',
  fingerboard:'hangboard',hangboard:'hangboard',board:'hangboard',finger:'finger',fingers:'finger',grip:'grip',crimp:'crimp',crimps:'crimp',crimping:'crimp',
  hang:'hang',hangs:'hang',hanging:'hang',climb:'climbing',climbing:'climbing',climber:'climbing',bouldering:'climbing',boulder:'climbing',
  yoga:'yoga',pose:'pose',poses:'pose',stamina:'endurance',endurance:'endurance',pump:'endurance',lockoff:'lock',lockoffs:'lock'};
 const stop=new Set(['a','an','the','for','and','my','to','with','of','exercise','exercises','workout','workouts','session','sessions']);
 function tokens(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/t[ -]?spine/g,'thoracic spine').replace(/no equipment|body[ -]?weight/g,'bodyweight').replace(/upper[ -]?back/g,'upper back thoracic').replace(/lower[ -]?back/g,'lower back lumbar')
  .replace(/pull[ -]?ups?/g,'pullup').replace(/chin[ -]?ups?/g,'chinup').replace(/push[ -]?ups?|press[ -]?ups?/g,'pushup').replace(/lock[ -]?offs?/g,'lockoff').replace(/shoulder blades?/g,'scapula')
  .replace(/warm[ -]?up/g,'warmup').replace(/cool[ -]?down/g,'cooldown').split(/[^a-z0-9]+/).filter(t=>t&&!stop.has(t))
  .map(t=>aliases[t]||aliases[t.replace(/s$/,'')]||(t.length>4?t.replace(/s$/,''):t));}
 function close(a,b){if(a===b)return true;if(a.length<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}return edits+(i<a.length||j<b.length?1:0)<=1;}
 function matches(text,query){const q=tokens(query);if(!q.length)return true;const hay=new Set(tokens(text));return q.every(term=>hay.has(term)||[...hay].some(word=>word.startsWith(term)&&term.length>=3||close(term,word)));}
 return {tokens,matches};
});
