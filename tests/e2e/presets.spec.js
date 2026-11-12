const {test,expect}=require('@playwright/test');
const {editor,fixture,cleanup}=require('./helpers');
test('thumbnail keyboard selection and block presets survive undo, save and re-edit',async({page})=>{
 await editor(page);const data=await fixture(page,1);
 try{
  await page.goto('/wp-admin/post.php?post='+data.id+'&action=edit');
  await page.waitForFunction(()=>wp.data.select('core/block-editor').getBlocks().length>0);
  await page.evaluate(()=>wp.data.dispatch('core/block-editor').selectBlock(wp.data.select('core/block-editor').getBlocks()[0].clientId));
  if(!await page.locator('.interface-interface-skeleton__sidebar').isVisible())await page.getByRole('button',{name:'Settings',exact:true}).click();
  const styles=page.getByRole('tab',{name:'Styles',exact:true});if(await styles.count())await styles.click();
  await page.getByRole('button',{name:'WebGL background',exact:true}).click();
  const button=page.getByRole('group',{name:'Effect thumbnails'}).getByRole('button',{name:'Mesh Gradient',exact:true});await button.focus();await button.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');
  await page.getByLabel('Preset name',{exact:true}).fill('Theme demo');await page.getByRole('button',{name:'Save block preset',exact:true}).click();
  const saved=await page.evaluate(()=>wp.data.select('core/block-editor').getBlocks()[0].attributes.odWebgl);
  expect(saved.userPresets).toHaveLength(1);expect(saved.userPresets[0].effect).toBe('mesh-gradient');
  await page.getByRole('button',{name:'Reset effect settings',exact:true}).click();
  await page.getByLabel('Preset',{exact:true}).selectOption(saved.preset);
  expect(await page.evaluate(()=>wp.data.select('core/block-editor').getBlocks()[0].attributes.odWebgl.settings)).toEqual(saved.settings);
  await page.evaluate(()=>wp.data.dispatch('core/editor').undo());await expect.poll(()=>page.evaluate(()=>wp.data.select('core/block-editor').getBlocks()[0].attributes.odWebgl.preset)).toBe('');
  await page.evaluate(()=>wp.data.dispatch('core/editor').redo());
  await page.evaluate(()=>wp.data.dispatch('core/editor').savePost());await page.reload();await page.waitForFunction(()=>wp.data.select('core/block-editor').getBlocks().length>0);
  expect(await page.evaluate(()=>wp.data.select('core/block-editor').getBlocks()[0].attributes.odWebgl.userPresets)).toEqual(saved.userPresets);
  expect(await page.frameLocator('iframe[name="editor-canvas"]').locator('canvas').count()).toBeLessThanOrEqual(1);
 }finally{await cleanup(page,data.id);}
});
