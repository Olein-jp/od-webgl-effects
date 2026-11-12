const {test,expect}=require('@playwright/test');const fs=require('node:fs/promises');
const {editor,fixture,cleanup}=require('./helpers');const {installDrawMetrics}=require('./draw-metrics');
const kinds=(process.env.PERF_EFFECT||'aurora,particle-connections').split(',');
for(const effect of kinds)test(`${effect} records actual draw cadence and renderer`,async({page,browserName},info)=>{
 test.skip(browserName!=='chromium');test.setTimeout(180000);await page.addInitScript(installDrawMetrics);const results=[];
 for(const count of [1,3,10]){
  await editor(page);const post=await fixture(page,count,[effect]);
  try{
   for(const mode of ['desktop','mobile','tall']){
    await page.setViewportSize({width:mode==='mobile'?390:1440,height:1000});await page.goto(post.url);
    await page.locator('[data-od-webgl]').evaluateAll((els,mode)=>{for(const el of els){const c=JSON.parse(el.dataset.odWebgl);c.performance.paused=false;el.dataset.odWebgl=JSON.stringify(c);if(mode==='tall')el.style.minHeight='10000px';}},mode);
    await expect(page.locator('.od-webgl-background canvas').first()).toBeVisible();await page.waitForTimeout(300);
    const sample=await page.evaluate(async()=>{const start=performance.now();await new Promise(resolve=>setTimeout(resolve,1500));return window.__odDrawMetrics.sample(start,performance.now());});
    expect(sample.length).toBeGreaterThan(0);expect(sample.length).toBeLessThanOrEqual(4);
    expect(sample.some(r=>r.frames>2)).toBe(true);for(const r of sample){expect(r.drawFps).toBeLessThanOrEqual(mode==='mobile'?23:35);expect(r.width*r.height).toBeLessThanOrEqual(4000000);expect(Math.max(r.width,r.height)).toBeLessThanOrEqual(4096);}
    results.push({count,mode,contexts:sample.length,samples:sample});
   }
  }finally{await cleanup(page,post.id);}
 }
 const report={effect,profile:process.env.OD_SOFTWARE_GPU==='1'?'SwiftShader software renderer':'available renderer',hardwareValidation:false,userAgent:await page.evaluate(()=>navigator.userAgent),results};
 const json=JSON.stringify(report,null,2);await fs.writeFile(info.outputPath('draw-profile.json'),json);await info.attach('actual-draw-profile',{body:json,contentType:'application/json'});
});
