const {test,expect}=require('@playwright/test');
const {editor,fixture,cleanup}=require('./helpers');
test('modules load once on demand; delayed and failed chunks preserve content',async({page})=>{
 await editor(page); const data=await fixture(page,1);
 try {
  const requests=[]; page.on('request',r=>{if(/effect-|engine-ogl/.test(r.url()))requests.push(r.url());});
  await page.goto('/?s=od-webgl-no-such-post'); expect(requests).toEqual([]);
  await page.route('**/effect-aurora.*.js',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue();});
  await page.goto(data.url);
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
 await editor(page);const data=await fixture(page,1);
 try {
  let release; const wait=new Promise(r=>release=r);
  await page.route('**/effect-aurora.*.js',async route=>{await wait;await route.continue();});
  await page.goto(data.url);
  await page.locator('[data-od-webgl]').evaluate(el=>el.remove()); release();
  await page.waitForTimeout(500);await expect(page.locator('.od-webgl-background canvas')).toHaveCount(0);
 } finally {await cleanup(page,data.id);}
});
