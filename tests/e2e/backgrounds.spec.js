const { test, expect } = require('@playwright/test');
async function editor(page) {
	page.on('dialog', (dialog) => dialog.accept());
	await page.goto('/wp-login.php');
	await page.locator('#user_login').fill(process.env.WP_USER || 'admin');
	await page.locator('#user_pass').fill(process.env.WP_PASSWORD || 'password');
	await page.locator('#wp-submit').click();
	await page.waitForURL('**/wp-admin/**');
	await page.goto('/wp-admin/post-new.php', { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => window.wp?.data?.select('core/block-editor'));
	await page.evaluate(() => {
		if (wp.data.select('core/edit-post').isFeatureActive('welcomeGuide')) wp.data.dispatch('core/edit-post').toggleFeature('welcomeGuide');
	});
}
async function fixture(page, count = 4) {
	return page.evaluate(async (count) => {
		const cfg = (effect) => ({ version: 1, enabled: true, effect, settings: { colors: ['#01273e', '#074073', '#faa500'] }, performance: { paused: true }, fallback: { color: '#123456' } });
		const text = () => wp.blocks.createBlock('core/paragraph', { content: 'Readable content <a href="#example">Test link</a>' });
		const style = { spacing: { padding: { top: '45px', bottom: '45px', left: '24px', right: '24px' } } };
		let blocks = [
			wp.blocks.createBlock('core/group', { align: 'full', style, odWebgl: cfg('aurora') }, [text()]),
			wp.blocks.createBlock('core/cover', { style, minHeight: 220, odWebgl: cfg('fluid-gradient'), url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E' }, [text()]),
			wp.blocks.createBlock('core/columns', { style, odWebgl: cfg('waves') }, [wp.blocks.createBlock('core/column', { style, odWebgl: cfg('aurora') }, [text()])]),
		];
		if (count !== 4) blocks = Array.from({ length: count }, (_, i) => wp.blocks.createBlock('core/group', { style, odWebgl: cfg(['aurora','fluid-gradient','waves'][i % 3]) }, [text()]));
		wp.data.dispatch('core/block-editor').resetBlocks(blocks);
		const content = wp.blocks.serialize(blocks);
		const parsed = wp.blocks.parse(content);
		const all = (bs) => bs.flatMap((b) => [b, ...all(b.innerBlocks)]);
		if (all(parsed).some((b) => !b.isValid)) throw new Error('Block validation failed');
		const post = await wp.apiFetch({ path: '/wp/v2/posts', method: 'POST', data: { title: 'OD WebGL automated fixture', content, status: 'publish' } });
		return { id: post.id, url: post.link, serialized: content };
	}, count);
}
async function cleanup(page, id) {
	await page.goto('/wp-admin/');
	await page.evaluate(async (id) => wp.apiFetch({ path: '/wp/v2/posts/' + id + '?force=true', method: 'DELETE' }), id);
}
test('editor preview, persistence, validation, undo and removal', async ({ page }) => {
	await editor(page);
	const data = await fixture(page);
	await page.goto('/wp-admin/post.php?post=' + data.id + '&action=edit', { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => wp.data.select('core/block-editor').getBlocks().length === 3);
	const frame = page.frameLocator('iframe[name="editor-canvas"]');
	await expect(frame.locator('.has-od-webgl')).toHaveCount(4);
	await expect(frame.locator('.od-webgl-background canvas').first()).toBeVisible();
	const result = await page.evaluate(() => {
		const blocks = wp.data.select('core/block-editor').getBlocks();
		const id = blocks[0].clientId;
		wp.data.dispatch('core/block-editor').selectBlock(id);
		return { id, saved: wp.blocks.serialize(blocks), invalid: wp.data.select('core/block-editor').getBlocks().some((b) => !b.isValid) };
	});
	expect(result.invalid).toBe(false);
	expect(result.saved).toBe(data.serialized);
	const labels = await page.evaluate(() => ({ settings: wp.i18n.__('Settings'), styles: wp.i18n.__('Styles'), panel: wp.i18n.__('WebGL background', 'od-webgl-effects'), enabled: wp.i18n.__('Enable WebGL background', 'od-webgl-effects') }));
	if (!await page.locator('.interface-interface-skeleton__sidebar').isVisible()) await page.getByRole('button', { name: labels.settings, exact: true }).click();
	const stylesTab = page.getByRole('tab', { name: labels.styles, exact: true });
	if (await stylesTab.count()) await stylesTab.click();
	await page.getByRole('button', { name: labels.panel, exact: true }).click();
	await expect(page.getByLabel(labels.enabled)).toBeChecked();
	await page.evaluate((id) => { const store = wp.data.dispatch('core/block-editor');store.updateBlockAttributes(id, { odWebgl: { ...wp.data.select('core/block-editor').getBlock(id).attributes.odWebgl, effect: 'waves' } }); }, result.id);
	await page.evaluate(() => wp.data.dispatch('core/editor').undo());
	await expect.poll(() => page.evaluate(() => wp.data.select('core/block-editor').getBlocks()[0]?.attributes.odWebgl?.effect)).toBe('aurora');
	await page.evaluate(() => wp.data.dispatch('core/editor').redo());
	await expect.poll(() => page.evaluate(() => wp.data.select('core/block-editor').getBlocks()[0]?.attributes.odWebgl?.effect)).toBe('waves');
	await page.evaluate(() => wp.data.dispatch('core/editor').undo());
	await expect.poll(() => page.evaluate(() => wp.data.select('core/block-editor').getBlocks()[0]?.attributes.odWebgl?.effect)).toBe('aurora');
	result.id = await page.evaluate(() => wp.data.select('core/block-editor').getBlocks()[0].clientId);
	await page.evaluate((id) => wp.data.dispatch('core/block-editor').duplicateBlocks([id]), result.id);
	await expect(frame.locator('.has-od-webgl')).toHaveCount(5);
	await page.evaluate((id) => wp.data.dispatch('core/block-editor').removeBlock(id), result.id);
	await expect(frame.locator('.has-od-webgl')).toHaveCount(4);
	await cleanup(page, data.id);
});
test('version 1 settings survive REST save, re-edit and server validation', async ({ page }) => {
	await editor(page);
	const data = await page.evaluate(async () => {
		const raw = {version: 1, enabled: true, effect: 'aurora', preset: '', settings: {speed: 1.25, intensity: 0.8, opacity: 0.7, scale: 3, glow: 0.4, direction: 45, colors: ['var(--wp--preset--color--contrast)', '#abc']}, performance: {quality: 'medium', mobileQuality: 'low', maxFps: 24, paused: true}, fallback: {color: '#123456'}};
		const block = wp.blocks.createBlock('core/group', {odWebgl: raw}, [wp.blocks.createBlock('core/paragraph', {content: 'Schema round trip'})]);
		const content = wp.blocks.serialize([block]);
		const post = await wp.apiFetch({path: '/wp/v2/posts', method: 'POST', data: {title: 'OD schema fixture', content, status: 'publish'}});
		return {id: post.id, url: post.link, raw, content};
	});
	try {
		await page.goto('/wp-admin/post.php?post=' + data.id + '&action=edit');
		await page.waitForFunction(() => wp.data.select('core/block-editor').getBlocks().length > 0);
		expect(await page.evaluate(() => wp.data.select('core/block-editor').getBlocks()[0].attributes.odWebgl)).toEqual(data.raw);
		expect(await page.evaluate(() => wp.blocks.serialize(wp.data.select('core/block-editor').getBlocks()))).toBe(data.content);
		await page.goto(data.url);
		const rendered = JSON.parse(await page.locator('[data-od-webgl]').getAttribute('data-od-webgl'));
		expect(rendered).toEqual(data.raw);
	} finally {
		await cleanup(page, data.id);
	}
});
test('public effects, responsive sizes, links, no errors and reduced motion', async ({ page }) => {
	await editor(page); const data = await fixture(page); const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto(data.url);
	await expect(page.locator('[data-od-webgl]')).toHaveCount(4);
	for (const width of [1440, 768, 390]) {
		await page.setViewportSize({ width, height: 1000 });
		for (const root of await page.locator('[data-od-webgl]').all()) {
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('.od-webgl-background > canvas').first()).toBeVisible();
			const box = await root.boundingBox(); const canvas = await root.locator(':scope > .od-webgl-background > canvas').boundingBox();
			expect(Math.abs(box.width - canvas.width)).toBeLessThan(2);
			expect(Math.abs(box.y - canvas.y)).toBeLessThan(2);
			expect(Math.abs(box.height - canvas.height)).toBeLessThan(2);
		}
	}
	await page.locator('[data-od-webgl] a').first().click(); expect(page.url()).toContain('#example');
	await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
	await expect(page.locator('.od-webgl-background canvas')).toHaveCount(0);
	await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
	await page.locator('[data-od-webgl]').first().scrollIntoViewIfNeeded();
	await expect(page.locator('.od-webgl-background canvas').first()).toBeVisible();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(page.locator('.od-webgl-background canvas')).toHaveCount(0);
	expect(await page.locator('[data-od-webgl]').first().evaluate((el) => getComputedStyle(el, '::before').backgroundColor)).toBe('rgb(18, 52, 86)');
	expect(errors).toEqual([]);
	await cleanup(page, data.id);
});
test('WebGL disabled and JavaScript disabled retain fallback and content', async ({ page, browser }) => {
	await editor(page); const data = await fixture(page);
	await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : original.call(this, type, ...args); }; });
	await page.goto(data.url);
	await expect(page.locator('.od-webgl-background canvas')).toHaveCount(0);
	await expect(page.getByText('Readable content', { exact: false }).first()).toBeVisible();
	const context = await browser.newContext({ javaScriptEnabled: false });
	const plain = await context.newPage(); await plain.goto(data.url);
	expect(await plain.locator('[data-od-webgl]').first().evaluate((el) => getComputedStyle(el, '::before').backgroundColor)).toBe('rgb(18, 52, 86)');
	await expect(plain.getByText('Readable content', { exact: false }).first()).toBeVisible();
	await context.close(); await cleanup(page, data.id);
});
test('ten backgrounds bound WebGL resources and recover lost context', async ({ page }) => {
	await editor(page); const data = await fixture(page, 10);
	await page.setViewportSize({ width: 1280, height: 1000 }); await page.goto(data.url);
	await expect(page.locator('.od-webgl-background canvas').first()).toBeVisible();
	expect(await page.locator('.od-webgl-background canvas').count()).toBeLessThanOrEqual(4);
	const canvas = page.locator('.od-webgl-background canvas').first();
	await canvas.evaluate((el) => { const ext = el.getContext('webgl').getExtension('WEBGL_lose_context'); if(ext) { ext.loseContext(); setTimeout(() => ext.restoreContext(), 80); } });
	await page.waitForTimeout(300);
	await page.locator('[data-od-webgl]').last().scrollIntoViewIfNeeded();
	await expect(page.locator('[data-od-webgl]').first().locator('canvas')).toHaveCount(0);
	await expect(page.locator('.od-webgl-background canvas').first()).toBeVisible();
	expect(await page.locator('.od-webgl-background canvas').count()).toBeLessThanOrEqual(4);
	await cleanup(page, data.id);
});
