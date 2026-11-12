const {test,expect}=require('@playwright/test');
const {editor,fixture,cleanup}=require('./helpers');
test('modules load once on demand; delayed and failed chunks preserve content',async({page})=>{
 await editor(page); const data=await fixture(page,1);
 try {
  await page.goto('/?s=od-webgl-no-such-post');
  expect(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/od-webgl-effects/build/')).map(r=>r.name))).toEqual([]);
  const requests=[]; page.on('request',r=>{if(/effect-|engine-ogl/.test(r.url()))requests.push(r.url());});
  await page.route('**/effect-aurora.*.js',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue();});
  await page.goto(data.url,{waitUntil:'domcontentloaded'});
  const root=page.locator('[data-od-webgl]').first();
  await expect(root.getByText('Readable content',{exact:false})).toBeVisible();
  await expect(root.locator('canvas')).toBeVisible();
  expect(requests.filter(u=>/effect-aurora/.test(u))).toHaveLength(1);
  expect(requests.some(u=>/effect-waves|effect-fluid/.test(u))).toBe(false);
  await page.route('**/effect-waves.*.js',route=>route.abort());
  await root.evaluate(el=>{const c=JSON.parse(el.dataset.odWebgl);c.effect='waves';el.dataset.odWebgl=JSON.stringify(c);});
  await expect(root.locator('canvas')).toHaveCount(0);
  await expect(root.getByText('Readable content',{exact:false})).toBeVisible();
  expect(await root.evaluate(el=>getComputedStyle(el,'::before').backgroundColor)).toBe('rgb(18, 52, 86)');
 } finally {await cleanup(page,data.id);}
});
test('removing a block while a chunk is pending never mounts stale content',async({page})=>{
 await editor(page);const data=await fixture(page,1);let release;
 try {
   const wait=new Promise(r=>release=r);
  await page.route('**/effect-aurora.*.js',async route=>{await wait;await route.continue();});
  const requested=page.waitForRequest('**/effect-aurora.*.js');
  await page.goto(data.url,{waitUntil:'domcontentloaded'});await requested;
  await page.locator('[data-od-webgl]').evaluate(el=>el.remove()); release();
  await page.waitForTimeout(500);await expect(page.locator('.od-webgl-background canvas')).toHaveCount(0);
 } finally {release();await cleanup(page,data.id);}
});
test('dynamic chunks follow a relocated entry URL',async({page})=>{
 const path=require('node:path');await editor(page);const data=await fixture(page,1);const requested=[];
 try{
  await page.route('**/subdirectory/wp-content/plugins/od-webgl-effects/build/*.js*',async route=>{
   requested.push(route.request().url());await route.fulfill({path:path.join(process.cwd(),'build',path.basename(new URL(route.request().url()).pathname)),contentType:'application/javascript'});
  });
  await page.route(data.url,async route=>{const response=await route.fetch();const html=(await response.text()).replaceAll('/wp-content/plugins/od-webgl-effects/build/','/subdirectory/wp-content/plugins/od-webgl-effects/build/');await route.fulfill({response,body:html});});
  await page.goto(data.url,{waitUntil:'domcontentloaded'});await expect(page.locator('.has-od-webgl canvas')).toBeVisible();expect(requested.some(u=>u.includes('effect-aurora'))).toBe(true);expect(requested.some(u=>u.includes('engine-ogl'))).toBe(true);
 }finally{await cleanup(page,data.id);}
});
test('a newer effect wins when the previous shader finishes late',async({page})=>{
 await editor(page);const data=await fixture(page,1);let release;const wait=new Promise(r=>release=r);
 try{
  await page.route('**/effect-aurora.*.js',async route=>{await wait;await route.continue();});
  const requested=page.waitForRequest('**/effect-aurora.*.js');await page.goto(data.url,{waitUntil:'domcontentloaded'});await requested;
  const root=page.locator('[data-od-webgl]');await root.evaluate(el=>{const c=JSON.parse(el.dataset.odWebgl);c.effect='waves';c.settings={speed:0,colors:['#fff','#000']};el.dataset.odWebgl=JSON.stringify(c);});
  await expect(root.locator('canvas')).toBeVisible();release();await page.waitForTimeout(300);await expect(root.locator('canvas')).toHaveCount(1);
  expect(await root.locator('canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl');return gl.getAttachedShaders(gl.getParameter(gl.CURRENT_PROGRAM)).some(shader=>gl.getShaderSource(shader).includes('float offset='));})).toBe(true);
 }finally{release();await cleanup(page,data.id);}
});
