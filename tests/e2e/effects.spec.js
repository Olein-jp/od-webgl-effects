const {test,expect}=require('@playwright/test');
const {editor,fixture,cleanup}=require('./helpers');
const definitions=require('../../schemas/effects.json');
for(const id of Object.keys(definitions).filter(id=>!['aurora','fluid-gradient','waves'].includes(id))){
 test(`${id}: edit, save, sizes, quality, snapshots and fallback`,async({page,browserName})=>{
  await editor(page);const data=await fixture(page,1,[id]);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
   await page.goto('/wp-admin/post.php?post='+data.id+'&action=edit');
   const frame=page.frameLocator('iframe[name="editor-canvas"]');await expect(frame.locator('.has-od-webgl canvas')).toBeVisible();
   expect(await page.evaluate(()=>wp.blocks.serialize(wp.data.select('core/block-editor').getBlocks()))).toBe(data.serialized);
   await page.goto(data.url);const root=page.locator('[data-od-webgl]');
   for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:1000});await root.scrollIntoViewIfNeeded();await expect(root.locator('canvas')).toBeVisible();
    if(browserName==='chromium'&&process.platform==='darwin')await expect(root).toHaveScreenshot(`${id}-${width}.png`);
   }
   for(const quality of ['low','medium','high']){
    await root.evaluate((el,q)=>{const c=JSON.parse(el.dataset.odWebgl);c.performance.quality=q;c.performance.mobileQuality=q;el.dataset.odWebgl=JSON.stringify(c);},quality);
    await expect(root.locator('canvas')).toBeVisible();
   }
   await page.emulateMedia({reducedMotion:'reduce'});await expect(root.locator('canvas')).toHaveCount(0);
   await page.emulateMedia({reducedMotion:'no-preference'});await expect(root.locator('canvas')).toBeVisible();
   await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:get.call(this,type,...args);};});
   await page.reload();await expect(root.locator('canvas')).toHaveCount(0);await expect(root.getByText('Readable content',{exact:false})).toBeVisible();expect(errors).toEqual([]);
  }finally{await cleanup(page,data.id);}
 });
}
