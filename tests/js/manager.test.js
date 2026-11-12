const mockRenderers = [];
jest.mock('../../src/effects', () => ({ effects: { get: (id) => id === 'aurora' ? { id, defaults: { speed: 1, opacity: 1 }, controls: [], createRenderer(element) {
	const renderer = { update: jest.fn(), resize: jest.fn(), setSettings: jest.fn(), pause: jest.fn(), resume: jest.fn(), destroy: jest.fn() };
	mockRenderers.push(renderer); return renderer;
} } : null } }));
import { Manager } from '../../src/frontend/manager';
let intersection;
let media;
let manager;
beforeEach(() => {
	mockRenderers.length = 0;
	window.IntersectionObserver = class { constructor(cb) { intersection = cb; } observe() {} unobserve() {} disconnect() {} };
	window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
	media = { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
	window.matchMedia = () => media;
	window.requestAnimationFrame = jest.fn(() => 1);
	window.cancelAnimationFrame = jest.fn();
	manager = new Manager(document, 2);
});
afterEach(() => manager.destroy());
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function mount() { const root = document.createElement('div'); document.body.append(root); manager.mount(root, { enabled: true, effect: 'aurora' }); return root; }
test('initializes lazily and caps contexts', async () => {
	const roots = Array.from({ length: 10 }, mount);
	expect(mockRenderers).toHaveLength(0);
	intersection(roots.map((target) => ({ target, isIntersecting: true }))); await flush();
	expect(mockRenderers).toHaveLength(2);
	intersection([{ target: roots[0], isIntersecting: false }]); await flush();
	expect(mockRenderers[0].destroy).toHaveBeenCalled(); expect(mockRenderers).toHaveLength(3);
});
test('reuses instance for updates, stops and tears down', async () => {
	const root = mount(); intersection([{ target: root, isIntersecting: true }]); await flush();
	manager.update(root, { enabled: true, effect: 'aurora', settings: { speed: 2 } }, false);
	expect(mockRenderers).toHaveLength(1); expect(mockRenderers[0].setSettings).toHaveBeenCalled();
	expect(manager.entries.get(root).active).toBe(false);
	manager.remove(root); expect(mockRenderers[0].destroy).toHaveBeenCalled(); expect(root.childElementCount).toBe(0);
});
test('reduced motion releases contexts and never schedules animations', async () => {
	media.matches = true;
	const root = mount(); intersection([{ target: root, isIntersecting: true }]); await flush();
	expect(mockRenderers).toHaveLength(0); expect(window.requestAnimationFrame).not.toHaveBeenCalled();
	media.matches = false; manager.sync(); await flush(); expect(mockRenderers).toHaveLength(1);
	media.matches = true; manager.sync(); expect(mockRenderers[0].destroy).toHaveBeenCalled();
});
test('hidden tabs release resources, visible tabs resume, and FPS is bounded', async () => {
	const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	const root = mount(); intersection([{ target: root, isIntersecting: true }]); await flush();
	const renderer = mockRenderers[0]; renderer.update.mockClear();
	manager.tick(1000); manager.tick(1010); manager.tick(1040);
	expect(renderer.update).toHaveBeenCalledTimes(2);
	expect(renderer.update.mock.calls[1][0]).toBeCloseTo(0.04);
	hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); await flush();
	expect(renderer.destroy).toHaveBeenCalled();
	hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); await flush();
	expect(mockRenderers).toHaveLength(2);
	hidden.mockRestore();
});

test('removed blocks never create a renderer when the module resolves', async () => {
 const root = mount(); intersection([{target:root,isIntersecting:true}]); manager.remove(root); await flush();
 expect(mockRenderers).toHaveLength(0);
});
