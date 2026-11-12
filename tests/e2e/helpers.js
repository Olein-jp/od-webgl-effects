
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

module.exports = {editor,fixture,cleanup};
