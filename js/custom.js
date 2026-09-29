/* Crux.kit (touch steppers, two-tap delete) and Crux.custom (the "New exercise" form).
   Custom exercises are stored in Crux.store and mirrored into the library by js/lib.js (ids start with "my-"). */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const {h,icon,toast}=Crux;

 /* ── touch stepper: − value + with hold-to-repeat ─────────────────────── */
 function stepper({value,min=0,max=999,step=1,fmt=v=>String(v),onChange,label='',cls=''}){
  const el=document.createElement('div');el.className='kstep'+(cls?' '+cls:'');
  el.innerHTML=`<button type="button" class="kstep-btn" data-d="-1" aria-label="Decrease ${h(label)}">${icon('minus')}</button><div class="kstep-val num" role="spinbutton" aria-label="${h(label)}"></div><button type="button" class="kstep-btn" data-d="1" aria-label="Increase ${h(label)}">${icon('plus')}</button>`;
  const val=el.querySelector('.kstep-val'),minus=el.querySelector('[data-d="-1"]'),plus=el.querySelector('[data-d="1"]');
  let cur=value;
  const clamp=v=>Math.max(min,Math.min(max,v));
  function paint(){
   val.textContent=fmt(cur);val.setAttribute('aria-valuenow',String(cur));val.setAttribute('aria-valuemin',String(min));val.setAttribute('aria-valuemax',String(max));val.setAttribute('aria-valuetext',fmt(cur));
   minus.disabled=cur<=min;plus.disabled=cur>=max;
  }
  function set(v,silent){const n=clamp(Math.round(v/step)*step);if(n===cur){paint();return;}cur=n;paint();if(!silent&&onChange)onChange(cur);}
  [minus,plus].forEach(btn=>{
   const d=Number(btn.dataset.d);let t=null,n=0;
   const stop=()=>{clearTimeout(t);clearInterval(t);t=null;};
   const bump=()=>{n++;set(cur+d*step*(n>14?4:n>7?2:1));};
   btn.addEventListener('pointerdown',e=>{if(e.button)return;n=0;bump();stop();t=setTimeout(()=>{t=setInterval(bump,110);},420);});
   ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,stop));
   btn.addEventListener('click',e=>{if(e.detail===0){n=0;bump();}}); // keyboard activation
   btn.addEventListener('contextmenu',e=>e.preventDefault());
  });
  paint();
  return {el,set,get:()=>cur};
 }
 // First tap arms the button ("Tap again to delete"), second tap within 3 s runs it.
 function twoTap(btn,armedLabel,run){
  const label=btn.innerHTML;let timer=null;
  btn.addEventListener('click',e=>{
   e.preventDefault();
   if(btn.dataset.armed){clearTimeout(timer);delete btn.dataset.armed;btn.innerHTML=label;btn.classList.remove('is-armed');run();return;}
   btn.dataset.armed='1';btn.classList.add('is-armed');btn.textContent=armedLabel;
   timer=setTimeout(()=>{delete btn.dataset.armed;btn.innerHTML=label;btn.classList.remove('is-armed');},3000);
  });
 }
 const fmtSec=v=>v>=60?`${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`:`${v} s`;

 /* ── photo: file → ~1000 px JPEG data URL ─────────────────────────────── */
 function downscale(file,maxDim=1000){
  return new Promise((resolve,reject)=>{
   const url=URL.createObjectURL(file),img=new Image();
   img.onload=()=>{
    try{
     const k=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight));
     const w=Math.max(1,Math.round(img.naturalWidth*k)),hh=Math.max(1,Math.round(img.naturalHeight*k));
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=hh;
     const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,hh);ctx.drawImage(img,0,0,w,hh);
     let q=.8,out=canvas.toDataURL('image/jpeg',q);
     while(out.length>420000&&q>.4){q-=.1;out=canvas.toDataURL('image/jpeg',q);}
     resolve(out);
    }catch(err){reject(err);}finally{URL.revokeObjectURL(url);}
   };
   img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('That file is not a picture I can read.'));};
   img.src=url;
  });
 }

 /* ── the New / Edit exercise sheet ────────────────────────────────────── */
 function openForm(id){
  const store=Crux.store,existing=id?store.find('customExercises',id):null;
  const d={name:'',notes:'',category:'strength',equipment:'',oneSided:false,mode:'time',work:30,reps:10,sets:3,rest:30,photo:'',...(existing||{})};
  const body=document.createElement('div');
  body.innerHTML=`
   <div class="sheet-head"><h2>${existing?'Edit exercise':'New exercise'}</h2><button type="button" class="icon-btn plain" data-sheet-close aria-label="Close">${icon('close')}</button></div>
   <form class="form-body" id="ex-form" novalidate>
    <div class="photo-field">
     <div class="photo-preview" id="photo-preview"></div>
     <div class="photo-actions">
      <button type="button" class="btn btn-secondary btn-sm" id="photo-take">${icon('camera')} Take photo</button>
      <button type="button" class="btn btn-secondary btn-sm" id="photo-pick">Choose photo</button>
      <button type="button" class="btn btn-ghost btn-sm" id="photo-clear" hidden>Remove</button>
      <input type="file" id="photo-file-cam" accept="image/*" capture="environment" hidden>
      <input type="file" id="photo-file" accept="image/*" hidden>
     </div>
    </div>
    <label class="field"><span class="field-label">Name</span><input class="field-input" id="f-name" type="text" maxlength="60" placeholder="e.g. Ring rows" autocomplete="off" value="${h(d.name)}" required></label>
    <label class="field"><span class="field-label">Notes / how to</span><textarea class="field-input" id="f-notes" rows="3" maxlength="800" placeholder="Cues, tempo, anything to remember">${h(d.notes)}</textarea></label>
    <div class="field"><span class="field-label">Category</span><div class="chip-row wrap" id="f-cat" role="group" aria-label="Category">${Crux.CUSTOM_CATS.map(([v,l])=>`<button type="button" class="chip" data-v="${v}" aria-pressed="${d.category===v}">${h(l)}</button>`).join('')}</div></div>
    <label class="field"><span class="field-label">Equipment <i>(optional, comma separated)</i></span><input class="field-input" id="f-eq" type="text" maxlength="80" placeholder="Rings, band…" autocomplete="off" value="${h(d.equipment)}"></label>
    <div class="field-row"><span class="field-label inline">One-sided (do each side)</span><label class="switch"><input type="checkbox" id="f-one" ${d.oneSided?'checked':''}><span class="switch-track"></span></label></div>
    <div class="field"><span class="field-label">Default mode</span><div class="segmented" id="f-mode"><button type="button" data-v="time" aria-pressed="${d.mode!=='reps'}">Timed</button><button type="button" data-v="reps" aria-pressed="${d.mode==='reps'}">Reps</button><span class="segmented-indicator" aria-hidden="true"></span></div></div>
    <div class="form-steppers" id="f-steppers"></div>
    <div class="form-actions">
     ${existing?`<button type="button" class="btn btn-secondary btn-danger" id="f-delete">${icon('trash')} Delete</button>`:''}
     <button type="submit" class="btn" id="f-save">${existing?'Save changes':'Save exercise'}</button>
    </div>
   </form>`;
  const sheet=Crux.ui.openSheet({body,label:existing?'Edit exercise':'New exercise'});
  const q=s=>body.querySelector(s);
  const fields={};
  // photo
  const preview=q('#photo-preview'),clear=q('#photo-clear');
  function paintPhoto(){
   preview.innerHTML=d.photo?`<img alt="Exercise photo" src="${h(d.photo)}">`:`<span class="photo-empty">${icon('camera')}<span>Add a photo</span></span>`;
   clear.hidden=!d.photo;
  }
  async function onFile(input){
   const f=input.files&&input.files[0];input.value='';
   if(!f)return;
   try{d.photo=await downscale(f);paintPhoto();}catch(err){toast(err.message||'Could not use that photo');}
  }
  q('#photo-take').addEventListener('click',()=>q('#photo-file-cam').click());
  q('#photo-pick').addEventListener('click',()=>q('#photo-file').click());
  preview.addEventListener('click',()=>q('#photo-file').click());
  q('#photo-file').addEventListener('change',e=>onFile(e.target));
  q('#photo-file-cam').addEventListener('change',e=>onFile(e.target));
  clear.addEventListener('click',()=>{d.photo='';paintPhoto();});
  paintPhoto();
  // category + mode
  q('#f-cat').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;d.category=b.dataset.v;[...q('#f-cat').children].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));});
  const modeSeg=q('#f-mode');
  modeSeg.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;d.mode=b.dataset.v;[...modeSeg.querySelectorAll('button')].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));Crux.ui.syncIndicator(modeSeg,'button','.segmented-indicator');paintSteppers();});
  // steppers
  const wrap=q('#f-steppers');
  function row(label,st){const r=document.createElement('div');r.className='field-row';r.innerHTML=`<span class="field-label inline">${h(label)}</span>`;r.appendChild(st.el);wrap.appendChild(r);}
  function paintSteppers(){
   wrap.innerHTML='';
   if(d.mode==='reps')row('Reps',stepper({value:d.reps,min:1,max:100,label:'reps',onChange:v=>d.reps=v}));
   else row('Work',stepper({value:d.work,min:5,max:600,step:5,fmt:fmtSec,label:'work seconds',onChange:v=>d.work=v}));
   row('Sets',stepper({value:d.sets,min:1,max:12,label:'sets',onChange:v=>d.sets=v}));
   row('Rest',stepper({value:d.rest,min:0,max:300,step:5,fmt:fmtSec,label:'rest seconds',onChange:v=>d.rest=v}));
  }
  paintSteppers();
  requestAnimationFrame(()=>Crux.ui.syncIndicator(modeSeg,'button','.segmented-indicator'));
  // delete
  const del=q('#f-delete');
  if(del)twoTap(del,'Tap again to delete',()=>{store.remove('customExercises',existing.id);sheet.close();toast('Exercise deleted');});
  // save
  q('#ex-form').addEventListener('submit',e=>{
   e.preventDefault();
   const name=q('#f-name').value.trim();
   if(!name){toast('Give the exercise a name');q('#f-name').focus();return;}
   const item={id:existing?existing.id:store.newId('my'),name,notes:q('#f-notes').value.trim(),category:d.category,equipment:q('#f-eq').value.trim(),
    oneSided:q('#f-one').checked,mode:d.mode,work:d.work,reps:d.reps,sets:d.sets,rest:d.rest,photo:d.photo||'',
    // photoRev changes only when the picture does, so sync can move a photo once instead of on every edit
    photoRev:d.photo?((existing&&existing.photo===d.photo&&existing.photoRev)||Date.now()):0};
   store.upsert('customExercises',item);
   sheet.close();toast(existing?'Exercise updated':`Added ${name}`);
  });
 }

 Crux.kit={stepper,twoTap,fmtSec,downscale};
 Crux.custom={openForm,downscale};
})();
