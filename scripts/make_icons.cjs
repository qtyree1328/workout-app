// Renders icon.svg into the PNG icons used by the manifest and the iOS Home Screen.
// Run: node scripts/make_icons.cjs   (needs Playwright; no build step for the app itself)
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const glyph='<path d="M36 99h28l16-42 25 70 15-37h24" fill="none" stroke="white" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>';
// Full-bleed square (iOS/Android round it themselves); the glyph is scaled into the maskable safe zone.
const svg=(scale)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%"><rect width="180" height="180" fill="#0068ef"/><g transform="translate(90 90) scale(${scale}) translate(-90 -90)">${glyph}</g></svg>`;
(async()=>{
 const browser=await chromium.launch();
 const jobs=[['apple-touch-icon.png',180,1],['icon-192.png',192,1],['icon-512.png',512,1],['icon-maskable-512.png',512,.8]];
 for(const [name,size,scale] of jobs){
  const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
  await page.setContent(`<body style="margin:0;background:#0068ef">${svg(scale)}</body>`);
  await page.screenshot({path:path.join(root,'icons',name),omitBackground:false});
  await page.close();
  console.log('wrote icons/'+name);
 }
 await browser.close();
})();
