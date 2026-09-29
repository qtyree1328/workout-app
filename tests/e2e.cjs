// End-to-end checks in Chromium (Playwright is preinstalled at /opt/node22/lib/node_modules).
// Usage: python3 scripts/serve.py --port 8803 &   then   node tests/e2e.cjs [baseUrl]
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const BASE=process.argv[2]||'http://localhost:8803/';
const step=(n)=>console.log('  ✓ '+n);

(async()=>{
 const browser=await chromium.launch();
 const ctx=await browser.newContext({viewport:{width:1180,height:820},permissions:[]});
 const page=await ctx.newPage();
 const problems=[];
 page.on('console',m=>{if(m.type()==='error')problems.push('console: '+m.text());});
 page.on('pageerror',e=>problems.push('pageerror: '+e.message));
 page.on('requestfailed',r=>{if(!/\/media\//.test(r.url()))problems.push('requestfailed: '+r.url());});
 const go=async hash=>{await page.goto(BASE+(hash||''));await page.waitForFunction(()=>window.Crux&&window.Crux.ui&&document.querySelector('#view').children.length);};

 // ── PNG fixture for the photo test ──
 await go();
 const pngB64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=1200;const x=c.getContext('2d');x.fillStyle='#4D65F2';x.fillRect(0,0,1600,1200);x.fillStyle='#fff';x.font='200px sans-serif';x.fillText('TEST',500,650);return c.toDataURL('image/png').split(',')[1];});
 const pngPath=path.join(os.tmpdir(),'crux-test-photo.png');fs.writeFileSync(pngPath,Buffer.from(pngB64,'base64'));

 // ── 1. Favorites persist across reload ──
 await go('#/');
 await page.waitForSelector('.result-card');
 const favSel='.result-card .fav-btn';
 const favId=await page.locator(favSel).first().getAttribute('data-fav-id');
 await page.locator(favSel).first().click();
 assert.equal(await page.evaluate(id=>Crux.store.isFav('sessions',id),favId),true);
 await page.reload();await page.waitForSelector('.result-card');
 assert.equal(await page.locator(`.fav-btn[data-fav-id="${favId}"]`).first().getAttribute('aria-pressed'),'true');
 await page.locator('.category-tile[data-cat="favorites"]').click();
 await page.waitForFunction(()=>document.querySelector('#results-area')&&/workout/.test(document.querySelector('#results-area').textContent));
 assert((await page.locator('#results-area .fav-btn.on').count())>=1);
 step('session favorite persists and shows under Favorites');
 // exercise favorite through the library
 await go('#/exercises');
 await page.locator('.exercise-card .fav-btn').first().click();
 await page.locator('#ex-filters [data-f="favorites"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.exercise-card').length===1);
 await page.reload();await page.waitForSelector('.exercise-card');
 await page.locator('#ex-filters [data-f="favorites"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.exercise-card').length===1);
 step('exercise favorite persists; Favorites filter works');

 // ── 2. Custom exercise with photo ──
 await go('#/exercises');
 await page.click('#ex-filters [data-f="all"]');
 await page.click('#new-exercise');
 await page.waitForSelector('#ex-form');
 await page.fill('#f-name','Ring rows test');
 await page.fill('#f-notes','Keep the body straight');
 await page.click('#f-cat [data-v="climbing"]');
 await page.fill('#f-eq','Rings');
 await page.setInputFiles('#photo-file',pngPath);
 await page.waitForSelector('#photo-preview img');
 const photoLen=await page.evaluate(()=>document.querySelector('#photo-preview img').src.length);
 assert(photoLen>1000&&photoLen<600000,'photo is downscaled, got '+photoLen);
 const dims=await page.evaluate(()=>new Promise(r=>{const i=new Image();i.onload=()=>r([i.naturalWidth,i.naturalHeight]);i.src=document.querySelector('#photo-preview img').src;}));
 assert(Math.max(...dims)<=1000,'max dimension <= 1000, got '+dims);
 await page.click('#f-mode [data-v="reps"]');
 await page.click('#ex-form .form-actions [type="submit"]');
 await page.waitForSelector('#ex-form',{state:'detached'});
 await page.fill('#ex-search','ring rows');
 await page.waitForFunction(()=>document.querySelectorAll('.exercise-card').length===1&&/Ring rows/.test(document.querySelector('.exercise-card').textContent));
 assert.match(await page.locator('.exercise-card').first().innerText(),/Mine/);
 await page.locator('.exercise-card').first().click();
 await page.waitForSelector('.ex-sheet-media img');
 assert.match(await page.locator('.sheet-panel').innerText(),/Ring rows test/);
 await page.keyboard.press('Escape');
 await page.waitForTimeout(500);
 step('custom exercise with photo created, searchable, shown in sheet');

 // ── 3. Builder: add custom + built-ins, reorder, save, start ──
 await go('#/build');
 await page.click('#b-new');
 await page.fill('#b-name','E2E workout');
 await page.click('#b-add');
 await page.waitForSelector('#p-list .p-row');
 await page.fill('#p-search','ring rows');
 await page.waitForFunction(()=>document.querySelectorAll('#p-list .p-row').length===1);
 await page.locator('#p-list .p-row').first().click();
 await page.fill('#p-search','');
 await page.click('#p-filters [data-f="mobility"]');
 await page.waitForFunction(()=>document.querySelectorAll('#p-list .p-row').length>3);
 await page.locator('#p-list .p-row').nth(0).click();
 await page.locator('#p-list .p-row').nth(1).click();
 await page.click('#p-done');
 await page.waitForSelector('.b-item',{state:'attached'});
 assert.equal(await page.locator('.b-item').count(),3);
 const names0=await page.locator('.b-item-name').allInnerTexts();
 // reorder with the down button, then with a real pointer drag on the grip
 await page.locator('.b-item').nth(0).locator('[data-a="down"]').click();
 const names1=await page.locator('.b-item-name').allInnerTexts();
 assert.equal(names1[1],names0[0]);
 const grip=page.locator('.b-item').nth(0).locator('.b-grip'),gb=await grip.boundingBox();
 const last=await page.locator('.b-item').nth(2).boundingBox();
 await page.mouse.move(gb.x+gb.width/2,gb.y+gb.height/2);await page.mouse.down();
 await page.mouse.move(gb.x+gb.width/2,gb.y+gb.height/2+20,{steps:3});
 await page.mouse.move(gb.x+gb.width/2,last.y+last.height-4,{steps:8});
 await page.mouse.up();
 const names2=await page.locator('.b-item-name').allInnerTexts();
 assert.equal(names2[2],names1[0],'dragged item moved to the end');
 // per-item editing: open the last item, bump sets, switch mode
 await page.locator('.b-item-info').nth(2).click();
 await page.locator('.b-item.is-open .kstep-btn[data-d="1"]').nth(1).click();
 const total1=await page.innerText('#b-total');
 assert.match(total1,/\d+:\d\d/);
 await page.click('#b-save');
 await page.waitForSelector('.w-card');
 assert.match(await page.locator('.w-card').first().innerText(),/E2E workout/);
 step('builder: add custom + built-ins, reorder (buttons + drag), save');
 // shows on the Workouts page under My workouts
 await go('#/');
 await page.locator('.category-tile[data-cat="mine"]').click();
 await page.waitForFunction(()=>/E2E workout/.test(document.querySelector('#results-area').textContent));
 step('saved workout listed under My workouts');
 // start it from the Build tab
 await go('#/build');
 await page.locator('.w-card [data-act="start"]').first().click();
 await page.waitForSelector('.crux-player');
 assert.match(await page.innerText('.cp-top-title'),/E2E workout/);
 await page.click('.cp-close');await page.click('.cp-confirmend');
 await page.waitForSelector('.crux-player',{state:'detached'});
 step('custom workout starts in the player');

 // ── 4. Timer: start, pause ──
 await go('#/timer');
 await page.click('#timer-quick [data-i="0"]');
 assert.match(await page.innerText('#timer-total'),/^\d+:\d\d$/);
 await page.click('#timer-start');
 await page.waitForSelector('.crux-player');
 await page.waitForFunction(()=>/GET READY|WORK/.test(document.querySelector('.cp-phase').textContent));
 await page.click('.cp-playpause');
 assert(await page.locator('.cp-paused.is-shown').count()===1);
 await page.click('.cp-resume-btn');
 await page.click('.cp-close');await page.click('.cp-confirmend');
 await page.waitForSelector('.crux-player',{state:'detached'});
 step('timer tab starts the player and pauses');
 // save + reload a preset
 await go('#/timer');
 await page.click('#preset-open');await page.fill('#preset-name','My tabata');await page.click('.preset-form [type="submit"]');
 await page.waitForSelector('.preset-row');
 assert.equal(await page.evaluate(()=>Crux.store.items('timerPresets').length),1);
 step('timer preset saved');

 // ── 5. Completion writes history ──
 await go('#/timer');
 // 5 s work, no rest, 1 set, no get-ready
 await page.evaluate(()=>{Crux.prefs.set('timerCfg',{work:5,rest:0,sets:1,rounds:1,roundRest:0,getReady:0});});
 await page.reload();await page.waitForSelector('#timer-start');
 await page.click('#timer-start');
 await page.waitForSelector('.cp-complete:not([hidden])',{timeout:15000});
 await page.locator('.cp-effort-btn').nth(3).click();
 await page.fill('.cp-note','felt strong');
 await page.click('.cp-donebtn');
 await page.waitForSelector('.crux-player',{state:'detached'});
 const hist=await page.evaluate(()=>Crux.store.items('history'));
 assert.equal(hist.length,1);
 assert.equal(hist[0].effort,4);assert.equal(hist[0].note,'felt strong');
 assert(hist[0].totalSteps===1&&hist[0].completedSteps===1&&hist[0].duration>=4,JSON.stringify(hist[0]));
 await go('#/build');
 assert.match(await page.locator('.h-row').first().innerText(),/felt strong/);
 step('completion logs history with effort + note; Recent list shows it');

 // ── 5b. Existing behaviour still works: Hip Opener generator, resume after reload ──
 await go('#/');
 await page.locator('.category-tile[data-cat="hip"]').click();
 await page.waitForSelector('#gen-start');
 await page.click('#gen-start');
 await page.waitForSelector('.crux-player');
 await page.waitForTimeout(1200);
 await page.reload();
 await page.waitForSelector('#resume-go');
 assert.match(await page.innerText('#resume-slot'),/Resume/);
 await page.click('#resume-go');
 await page.waitForSelector('.crux-player');
 await page.click('.cp-resume-btn');
 await page.click('.cp-close');await page.click('.cp-confirmend');
 await page.waitForSelector('.crux-player',{state:'detached'});
 await page.locator('.category-tile[data-cat="all"]').click();
 step('Hip Opener generator starts; resume-after-reload still offered');

 // ── 6. Service worker, offline downloads, range requests ──
 await go('#/');
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
 await page.reload();
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
 step('service worker registered and controlling');
 await page.click('#settings-open');
 await page.waitForSelector('[data-dl-go]');
 assert.match(await page.innerText('[data-dl-go]'),/Download all media/);
 await page.click('[data-dl-go]');
 await page.waitForFunction(()=>/Downloaded/.test(document.querySelector('.dl-status')?.textContent||''),null,{timeout:120000});
 const cached=await page.evaluate(async()=>{const c=await caches.open('crux-media-v1');return (await c.keys()).length;});
 assert(cached>400,'cached media files: '+cached);
 assert.match(await page.innerText('[data-dl-go]'),/Remove downloads/);
 step(`media downloaded (${cached} files)`);
 await page.keyboard.press('Escape');
 const clip=await page.evaluate(()=>{const e=Crux.LIB.exercises.find(x=>x.variants[0].clip);return e.variants[0].clip;});
 const r=await page.evaluate(async clip=>{
  const res=await fetch(clip,{headers:{Range:'bytes=0-99'}});const b=await res.arrayBuffer();
  const res2=await fetch(clip,{headers:{Range:'bytes=100-'}});const b2=await res2.arrayBuffer();
  const res3=await fetch(clip,{headers:{Range:'bytes=-50'}});
  return {status:res.status,cr:res.headers.get('Content-Range'),cl:res.headers.get('Content-Length'),ar:res.headers.get('Accept-Ranges'),len:b.byteLength,ct:res.headers.get('Content-Type'),
   s2:res2.status,len2:b2.byteLength,cr2:res2.headers.get('Content-Range'),s3:res3.status,cr3:res3.headers.get('Content-Range')};
 },clip);
 assert.equal(r.status,206);assert.match(r.cr,/^bytes 0-99\/\d+$/);assert.equal(r.len,100);assert.equal(r.cl,'100');assert.equal(r.ar,'bytes');assert.match(r.ct,/video\/mp4/);
 const total=Number(r.cr.split('/')[1]);assert.equal(r.s2,206);assert.equal(r.len2,total-100);assert.equal(r.cr2,`bytes 100-${total-1}/${total}`);
 assert.equal(r.s3,206);assert.equal(r.cr3,`bytes ${total-50}-${total-1}/${total}`);
 step('cached video answers Range requests with 206 + Content-Range');
 // offline: the whole app still loads and plays cached media
 await ctx.setOffline(true);
 await page.reload();
 await page.waitForSelector('.result-card, .hero-card',{timeout:15000});
 const off=await page.evaluate(async clip=>{const res=await fetch(clip,{headers:{Range:'bytes=0-9'}});return res.status;},clip);
 assert.equal(off,206);
 await page.goto(BASE+'#/exercises');await page.waitForSelector('.exercise-card');
 assert(await page.locator('.exercise-card img').first().evaluate(i=>i.complete&&i.naturalWidth>0),'cached thumbnail renders offline');
 step('offline reload works with cached shell and media');
 await ctx.setOffline(false);
 // remove downloads
 await page.click('#settings-open');await page.waitForSelector('[data-dl-go]');
 await page.click('[data-dl-go]');
 await page.waitForFunction(()=>/Download all media/.test(document.querySelector('[data-dl-go]').textContent));
 const left=await page.evaluate(async()=>{const c=await caches.open('crux-media-v1');return (await c.keys()).length;});
 assert(left<60,'media cache cleared, left '+left);
 step('remove downloads clears the media cache');

 assert.deepEqual(problems,[],'console errors: '+problems.join('\n'));
 step('zero console errors');
 await browser.close();
 console.log('PASS e2e');
})().catch(e=>{console.error('FAIL e2e:',e);process.exit(1);});
