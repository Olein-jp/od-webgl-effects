const {test,expect}=require('@playwright/test');const {editor,fixture,cleanup}=require('./helpers');const definitions=require('../../schemas/effects.json');
for(const id of Object.keys(definitions))test(`${id} on Group, Cover, Columns and Column`,async({page})=>{
 await editor(page);const data=await fixture(page,4,[id]);
 try{
  await page.goto('/wp-admin/post.php?post='+data.id+'&action=edit');const frame=page.frameLocator('iframe[name="editor-canvas"]');
  await expect(frame.locator('.has-od-webgl')).toHaveCount(4);await expect(frame.locator('canvas').first()).toBeVisible();
  expect(await page.evaluate(()=>wp.blocks.serialize(wp.data.select('core/block-editor').getBlocks()))).toBe(data.serialized);
  await page.goto(data.url);const roots=page.locator('[data-od-webgl]');await expect(roots).toHaveCount(4);
  for(const root of await roots.all()){expect(JSON.parse(await root.getAttribute('data-od-webgl')).effect).toBe(id);await root.scrollIntoViewIfNeeded();await expect(root.locator(':scope > .od-webgl-background > canvas')).toBeVisible();}
 }finally{await cleanup(page,data.id);}
});
