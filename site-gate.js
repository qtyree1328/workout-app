/* Password screen for the hosted website. Skipped on the local Mac/iPad server.
   This hides the app; it does not encrypt the files. Only a SHA-256 hash is stored.
   Change the password: python3 -c "import hashlib;print(hashlib.sha256(b'NEW').hexdigest())" */
(function(){
 const HASH='841eb2df95001c5c76a5876626037118834eaa61333e51801075d2466b6a7449';
 const host=location.hostname;
 const local=location.protocol==='file:'||!host||host==='localhost'||host.endsWith('.local')||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
 if(local)return;
 try{if(localStorage.getItem('site-gate')===HASH)return;}catch{}
 const root=document.documentElement;root.classList.add('site-locked');
 const style=document.createElement('style');
 style.textContent='.site-locked .app-shell{display:none}#site-gate{position:fixed;inset:0;z-index:100;background:#f5f5f7;display:grid;place-items:center;padding:16px}#site-gate form{background:#fff;border-radius:20px;padding:28px;width:min(360px,100%);display:grid;gap:14px;box-shadow:0 10px 40px #0000000f}#site-gate h1{margin:0;font-size:24px;letter-spacing:-.5px}#site-gate p{margin:0;color:#727278;font-size:13px}#site-gate input{height:46px;border:0;border-radius:12px;background:#eaeaef;padding:0 14px;font-size:16px}#site-gate-error{color:#d5433f!important;min-height:18px}';
 document.head.appendChild(style);
 const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
 // crypto.subtle only exists on https; the small fallback covers plain-http hosts.
 async function sha(text){const data=new TextEncoder().encode(text);if(globalThis.crypto?.subtle)return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',data)));return sha256(data);}
 function sha256(data){const K=[],H=[];let n=2;for(let found=0;found<64;n++){if(![...Array(n).keys()].slice(2).some(d=>n%d===0)){if(found<8)H.push(Math.pow(n,1/2)*2**32|0);K.push(Math.pow(n,1/3)*2**32|0);found++;}}
  const bits=data.length*8,padded=new Uint8Array(((data.length+9+63)>>6)<<6);padded.set(data);padded[data.length]=0x80;const view=new DataView(padded.buffer);view.setUint32(padded.length-4,bits);view.setUint32(padded.length-8,Math.floor(bits/2**32));
  const r=(x,k)=>x>>>k|x<<(32-k),w=new Array(64);
  for(let i=0;i<padded.length;i+=64){for(let t=0;t<64;t++)w[t]=t<16?view.getUint32(i+t*4):(r(w[t-2],17)^r(w[t-2],19)^w[t-2]>>>10)+w[t-7]+(r(w[t-15],7)^r(w[t-15],18)^w[t-15]>>>3)+w[t-16]|0;
   let [a,b,c,d,e,f,g,h]=H;for(let t=0;t<64;t++){const t1=h+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[t]+w[t]|0,t2=(r(a,2)^r(a,13)^r(a,22))+(a&b^a&c^b&c)|0;h=g;g=f;f=e;e=d+t1|0;d=c;c=b;b=a;a=t1+t2|0;}
   [a,b,c,d,e,f,g,h].forEach((x,j)=>H[j]=H[j]+x|0);}
  return hex(new Uint8Array(new Uint32Array(H.map(x=>((x>>>24)|(x>>>8&0xff00)|(x<<8&0xff0000)|(x<<24))>>>0)).buffer));}
 function show(){
  const gate=document.createElement('div');gate.id='site-gate';
  gate.innerHTML='<form><h1>Exercises</h1><p>Enter the password to open the app.</p><input id="site-gate-password" type="password" autocomplete="current-password" aria-label="Password" autofocus><button class="primary" type="submit">Open</button><p id="site-gate-error" role="alert"></p></form>';
  document.body.appendChild(gate);
  gate.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();
   if(await sha(gate.querySelector('input').value)===HASH){try{localStorage.setItem('site-gate',HASH);}catch{}gate.remove();root.classList.remove('site-locked');}
   else gate.querySelector('#site-gate-error').textContent='That password is not right. Try again.';});
 }
 if(document.body)show();else document.addEventListener('DOMContentLoaded',show);
})();
