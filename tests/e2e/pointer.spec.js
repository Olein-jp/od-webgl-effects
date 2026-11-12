const {test,expect}=require('@playwright/test');const {editor,fixture,cleanup}=require('./helpers');
test('pointer responds without blocking links and releases on pause, motion and removal',async({page})=>{
 await editor(page);const data=await fixture(page,1,['ripple']);
 try{
  await page.goto(data.url);const root=page.locator('[data-od-webgl]');
  await root.evaluate(el=>{const c=JSON.parse(el.dataset.odWebgl);c.settings.interactive=true;c.settings.interactionStrength=1;c.settings.speed=0;c.performance.paused=false;el.dataset.odWebgl=JSON.stringify(c);});
  await expect(root.locator('canvas')).toBeVisible();const box=await root.boundingBox();
  await page.mouse.move(box.x+box.width*.2,box.y+box.height*.7);await page.waitForTimeout(120);const left=await root.locator('canvas').screenshot();
  await page.mouse.move(box.x+box.width*.8,box.y+box.height*.7);await page.waitForTimeout(120);expect((await root.locator('canvas').screenshot()).equals(left)).toBe(false);
  await root.getByRole('link').click();expect(page.url()).toContain('#example');
  await root.evaluate(el=>{const c=JSON.parse(el.dataset.odWebgl);c.performance.paused=true;el.dataset.odWebgl=JSON.stringify(c);});await page.mouse.move(box.x+box.width*.8,box.y+box.height*.8);await page.waitForTimeout(120);const paused=await root.locator('canvas').screenshot();
  await page.mouse.move(box.x+box.width*.2,box.y+box.height*.8);await page.waitForTimeout(120);expect((await root.locator('canvas').screenshot()).equals(paused)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(root.locator('canvas')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(root.locator('canvas')).toBeVisible();
  await root.evaluate(el=>el.remove());await expect(page.locator('canvas')).toHaveCount(0);
 }finally{await cleanup(page,data.id);}
});
