const {test,expect}=require('@playwright/test');
const {editor,fixture,cleanup}=require('./helpers');
const fs=require('node:fs/promises');
for(const effectId of (process.env.PERF_EFFECT||'').split(',')){
test('record frame cadence and bounded contexts for 1/3/10 backgrounds '+(effectId||'Phase 1'),async({page,browserName},info)=>{
 test.skip(browserName!=='chromium');test.setTimeout(120000);const results=[];
 await editor(page);
 for(const count of [1,3,10]){
  await editor(page); const post=await fixture(page,count,effectId?[effectId]:undefined);
  try{
   for(const mode of ['desktop','mobile','tall']){
    await page.setViewportSize({width:mode==='mobile'?390:1440,height:1000});await page.goto(post.url);
    await page.locator('[data-od-webgl]').evaluateAll((els,mode)=>{for(const el of els){const c=JSON.parse(el.dataset.odWebgl);c.performance.paused=false;el.dataset.odWebgl=JSON.stringify(c);if(mode==='tall')el.style.minHeight='10000px';}},mode);
    await expect(page.locator('canvas').first()).toBeVisible();
    const sample=await page.evaluate(async()=>{
     const times=[];let previous;await new Promise(resolve=>{const frame=now=>{if(previous)times.push(now-previous);previous=now;if(times.length<60)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
     times.sort((a,b)=>a-b);return {frameMedian:times[30],frameP95:times[57],contexts:document.querySelectorAll('.od-webgl-background canvas').length,canvases:[...document.querySelectorAll('.od-webgl-background canvas')].map(c=>({width:c.width,height:c.height}))};
    });
    expect(sample.contexts).toBeLessThanOrEqual(4);
    for(const c of sample.canvases){expect(Math.max(c.width,c.height)).toBeLessThanOrEqual(4096);expect(c.width*c.height).toBeLessThanOrEqual(mode==='mobile'?1000000:4000000);}
    results.push({count,mode,...sample});
   }
  } finally {await cleanup(page,post.id);}
 }
 const json=JSON.stringify({effect:effectId||'Phase 1',environment:'Chromium/macOS, local WordPress; RAF cadence is not GPU timing or a low-end-device result',results},null,2);
 await fs.writeFile(info.outputPath('performance.json'),json);await info.attach('performance',{body:json,contentType:'application/json'});
});

}
