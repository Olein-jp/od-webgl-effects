const {test,expect}=require('@playwright/test');const fs=require('node:fs');const {editor,fixture,cleanup}=require('./helpers');
test('media image survives save and supplies editor, no-JS and failed-render fallbacks',async({page,browser,browserName})=>{
 await editor(page);const data=await fixture(page,1);let media;
 try{
  media=await page.evaluate(async encoded=>wp.apiFetch({path:'/wp/v2/media',method:'POST',headers:{'Content-Disposition':'attachment; filename="od-fallback.png"','Content-Type':'image/png'},body:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}),fs.readFileSync('tests/fixtures/fallback.png').toString('base64'));
  await page.goto('/wp-admin/post.php?post='+data.id+'&action=edit');await page.waitForFunction(()=>wp.data.select('core/block-editor').getBlocks().length>0);
  await page.evaluate(()=>wp.data.dispatch('core/block-editor').selectBlock(wp.data.select('core/block-editor').getBlocks()[0].clientId));
  if(!await page.locator('.interface-interface-skeleton__sidebar').isVisible())await page.getByRole('button',{name:'Settings',exact:true}).click();
  const styles=page.getByRole('tab',{name:'Styles',exact:true});if(await styles.count())await styles.click();await page.getByRole('button',{name:'WebGL background',exact:true}).click();
  await page.getByRole('button',{name:'Choose fallback image',exact:true}).click();
  // Select the real uploaded attachment in the standard WordPress media frame.
  await page.evaluate(id=>{const frame=wp.media.frame;frame.state().get('selection').add(wp.media.attachment(id));},media.id);
  await page.locator('.media-modal').getByRole('button',{name:'Select',exact:true}).click();
  await page.getByLabel('Image fit',{exact:true}).selectOption('contain');
  await page.evaluate(()=>wp.data.dispatch('core/editor').savePost());
  await page.emulateMedia({reducedMotion:'reduce'});
  const frame=page.frameLocator('iframe[name="editor-canvas"]');await expect.poll(()=>frame.locator('.has-od-webgl').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('od-fallback');
  await page.goto(data.url);const root=page.locator('.has-od-webgl');await expect(root.locator('canvas')).toHaveCount(0);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});await expect.poll(()=>root.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('od-fallback');if(browserName==='chromium'&&process.platform==='darwin')await expect(root).toHaveScreenshot('fallback-image-'+width+'.png');}
  const context=await browser.newContext({javaScriptEnabled:false});try{const plain=await context.newPage();await plain.goto(data.url);expect(await plain.locator('.has-od-webgl').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('od-fallback');await expect(plain.getByText('Readable content',{exact:false})).toBeVisible();}finally{await context.close();}
  await page.emulateMedia({reducedMotion:'no-preference'});await page.route('**/effect-aurora.*.js',r=>r.abort());await page.reload();await expect(root.locator('canvas')).toHaveCount(0);expect(await root.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('od-fallback');
  for(const config of [{version:2,effect:'aurora'},{version:1,effect:'missing-effect'}]){
   await page.goto('/wp-admin/');await page.evaluate(async({id,config})=>{const post=await wp.apiFetch({path:'/wp/v2/posts/'+id+'?context=edit'});const content=post.content.raw.replace(/<!-- wp:group (.*?) -->/,(_,json)=>{const attrs=JSON.parse(json);Object.assign(attrs.odWebgl,config);return '<!-- wp:group '+JSON.stringify(attrs)+' -->';});await wp.apiFetch({path:'/wp/v2/posts/'+id,method:'POST',data:{content}});},{id:data.id,config});
   await page.goto(data.url);expect(await root.getAttribute('data-od-webgl')).toBeNull();expect(await root.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('od-fallback');
  }
  await page.goto('/wp-admin/');await page.evaluate(id=>wp.apiFetch({path:'/wp/v2/media/'+id+'?force=true',method:'DELETE'}),media.id);media=null;
  await page.goto(data.url);expect(await root.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toBe('none');expect(await root.evaluate(el=>getComputedStyle(el,'::before').backgroundColor)).toBe('rgb(18, 52, 86)');
 }finally{if(media){await page.goto('/wp-admin/');await page.evaluate(id=>wp.apiFetch({path:'/wp/v2/media/'+id+'?force=true',method:'DELETE'}),media.id);}await cleanup(page,data.id);}
});
