const {test,expect}=require('@playwright/test');
const {editor,fixture,cleanup}=require('./helpers');
test('live frames continue after resize and Auto reduces resolution',async({page})=>{
 await page.addInitScript(()=>{
  window.__odDraws=0;window.__odFrameScale=1;
  const draw=WebGLRenderingContext.prototype.drawArrays;WebGLRenderingContext.prototype.drawArrays=function(...args){window.__odDraws++;return draw.apply(this,args);};
  const raf=window.requestAnimationFrame.bind(window),origin=performance.now();
  window.requestAnimationFrame=callback=>raf(time=>callback(origin+(time-origin)*window.__odFrameScale));
 });
 await editor(page);const post=await fixture(page,1);
 try{
  await page.setViewportSize({width:1440,height:1000});await page.goto(post.url);
  const root=page.locator('[data-od-webgl]'),canvas=root.locator('canvas');await expect(canvas).toBeVisible();
  await root.evaluate(el=>{const c=JSON.parse(el.dataset.odWebgl);c.performance.paused=false;c.performance.quality='auto';el.dataset.odWebgl=JSON.stringify(c);});
  await expect.poll(()=>page.evaluate(()=>window.__odDraws)).toBeGreaterThan(4);
  const beforeResize=await page.evaluate(()=>window.__odDraws);await page.setViewportSize({width:1000,height:1000});
  await expect.poll(()=>page.evaluate(()=>window.__odDraws)).toBeGreaterThan(beforeResize+4);
  const originalWidth=await canvas.evaluate(c=>c.width);await page.evaluate(()=>window.__odFrameScale=3);
  await expect.poll(()=>canvas.evaluate(c=>c.width),{timeout:10000}).toBeLessThan(originalWidth);
  const afterQuality=await page.evaluate(()=>window.__odDraws);await expect.poll(()=>page.evaluate(()=>window.__odDraws)).toBeGreaterThan(afterQuality+4);
  await root.evaluate(el=>{const c=JSON.parse(el.dataset.odWebgl);c.performance.paused=true;el.dataset.odWebgl=JSON.stringify(c);});await page.waitForTimeout(200);
  const paused=await page.evaluate(()=>window.__odDraws);await page.waitForTimeout(400);expect(await page.evaluate(()=>window.__odDraws)).toBe(paused);
 }finally{await cleanup(page,post.id);}
});
