const { test, expect } = require('@playwright/test');
test('deterministic editor/public/fallback screenshots', async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', 'Baselines are Chromium-specific. Functional tests run in all engines.');
	page.on('dialog', (dialog) => dialog.accept());
	await page.goto('/wp-login.php');
	await page.locator('#user_login').fill(process.env.WP_USER || 'admin');
	await page.locator('#user_pass').fill(process.env.WP_PASSWORD || 'password');
	await page.locator('#wp-submit').click(); await page.waitForURL('**/wp-admin/**');
	await page.goto('/wp-admin/post-new.php');
	await page.waitForFunction(() => window.wp?.blocks && wp.data.select('core/block-editor'));
	if (await page.locator('.interface-interface-skeleton__sidebar').isVisible()) {
		const label = await page.evaluate(() => wp.i18n.__('Settings'));
		await page.getByRole('button', { name: label, exact: true }).click();
	}
	const post = await page.evaluate(async () => {
		if(wp.data.select('core/edit-post').isFeatureActive('welcomeGuide')) wp.data.dispatch('core/edit-post').toggleFeature('welcomeGuide');
		const blocks = ['aurora', 'fluid-gradient', 'waves'].map((effect) => wp.blocks.createBlock('core/group', { style: { dimensions: { minHeight: '160px' }, color: { text: '#ffffff' }, spacing: { padding: { top: '60px', bottom: '60px' } } }, odWebgl: { version: 1, enabled: true, effect, performance: { paused: true } } }, [wp.blocks.createBlock('core/paragraph', { content: 'OD WebGL Effects', style: { typography: { fontFamily: 'Arial, sans-serif', fontSize: '24px', lineHeight: '1.5' }, spacing: { margin: { top: '0px', bottom: '0px' } } } })]));
		wp.data.dispatch('core/block-editor').resetBlocks(blocks);
		return wp.apiFetch({ path: '/wp/v2/posts', method: 'POST', data: { title: 'OD WebGL visual fixture', content: wp.blocks.serialize(blocks), status: 'publish' } });
	});
	for (const [name,width] of [['desktop',1440],['tablet',768],['mobile',390]]) {
		await page.setViewportSize({width,height:1000});
		await page.mouse.move(0,0);
		const frame = page.frameLocator('iframe[name="editor-canvas"]');
		await expect(frame.locator('.has-od-webgl').first().locator('canvas')).toBeVisible();
		await expect(frame.locator('.has-od-webgl').first()).toHaveScreenshot('editor-' + name + '.png', { animations: 'disabled' });
	}
	await page.goto(post.link);
	for (const [name,width] of [['desktop',1440],['tablet',768],['mobile',390]]) {
		await page.setViewportSize({width,height:1000});
		await page.mouse.move(0,0);
		for (let i=0;i<3;i++) {
			const root = page.locator('[data-od-webgl]').nth(i); await root.scrollIntoViewIfNeeded();
			await expect(root.locator('canvas')).toBeVisible();
			await expect(root).toHaveScreenshot('public-' + ['aurora','fluid-gradient','waves'][i] + '-' + name + '.png', { animations: 'disabled' });
		}
	}
	await page.emulateMedia({reducedMotion:'reduce'});
	await expect(page.locator('canvas')).toHaveCount(0);
	await expect(page.locator('[data-od-webgl]').first()).toHaveScreenshot('fallback-mobile.png');
	await page.emulateMedia({reducedMotion:'no-preference'});
	await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : original.call(this, type, ...args); }; });
	await page.reload();
	await expect(page.locator('.od-webgl-background canvas')).toHaveCount(0);
	await expect(page.locator('[data-od-webgl]').first()).toHaveScreenshot('webgl-unavailable-mobile.png');
	await page.goto('/wp-admin/');
	await page.evaluate((id) => wp.apiFetch({ path: '/wp/v2/posts/' + id + '?force=true', method: 'DELETE' }), post.id);
});
