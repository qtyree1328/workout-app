const {webkit}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/range-browser-check/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await webkit.launch();const page=await b.newPage({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
 // Check migration separately at this origin, keeping the old backup intact.
 await page.addInitScript(()=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','true');localStorage.setItem('range-v1',JSON.stringify({favorites:['arm-circles'],saved:[{name:'Old routine',ids:['arm-circles'],work:45,rest:20}]}));}});
 await page.goto('http://127.0.0.1:8766');assert.equal(await page.locator('.group-card').count(),9);assert(await page.evaluate(()=>localStorage.getItem('range-v1')!==null));
 // Pointer events match the events Safari delivers for horizontal touch movement.
 await page.locator('#main').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:700,clientY:140});await page.locator('#main').dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:400,clientY:140});assert(await page.locator('#page-exercises').isVisible());
 await page.waitForTimeout(450);await page.locator('[data-page="create"]').click();await page.locator('[data-search="picker"]').fill('Arm circles');await page.locator('[data-pick="arm-circles"]').click();await page.locator('[data-search="picker"]').fill('Standing side bend');await page.locator('[data-pick="standing-side-bend"]').click();
 // A real pointer drag exercises capture, move, and drop on the touch-only handle.
 const a=await page.locator('[data-drag="0"]').boundingBox(),end=await page.locator('.chain-item').nth(1).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(end.x+35,end.y+end.height/2,{steps:10});await page.mouse.up();assert((await page.locator('.chain-item').first().innerText()).includes('Standing side bend'));
 await page.reload();await page.locator('[data-page="create"]').click();assert.equal(await page.locator('.chain-item').count(),2);assert((await page.locator('.chain-item').first().innerText()).includes('Standing side bend'));
 // Timed path, round transition, and hold mode in UI.
 await page.locator('[data-page="exercises"]').click();await page.locator('[data-search="exercises"]').fill('Hollow body hold');await page.locator('.exercise-open').click();assert.equal(await page.locator('[data-setup-mode="reps"]').count(),0);await page.locator('#setup-amount').fill('5');await page.locator('#setup-amount').blur();await page.locator('#setup-rounds').fill('2');await page.locator('#setup-rounds').blur();await page.locator('#setup-rest').fill('1');await page.locator('#setup-rest').blur();await page.locator('#begin-workout').click();await page.waitForTimeout(8200);assert.equal(await page.locator('#workout-title').innerText(),'Rest');await page.waitForTimeout(1200);assert((await page.locator('#session-progress').innerText()).includes('Set 2 of 2'));await page.waitForTimeout(5100);assert.equal(await page.locator('#workout-title').innerText(),'Workout complete');
 console.log('PASS WebKit: v1 migration preserves old data, swipe navigation, actual drag reorder, draft persistence, timed hold UI, timed sets, round break, completion.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
