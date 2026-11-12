const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
	testDir: './tests/e2e', timeout: 45000, fullyParallel: false, workers: 1,
	use: { baseURL: process.env.WP_BASE_URL || 'http://localhost:8888', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
	outputDir: 'tests/artifacts/results',
});
