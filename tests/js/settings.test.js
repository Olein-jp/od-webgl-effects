import { definitions, normalize, sanitizeSettings, sanitizeConfig, switchEffect, applyPreset } from '../../src/effects/settings';
import fixtures from '../fixtures/settings.json';
import { EffectRegistry, RendererRegistry, checkLifecycle } from '../../src/effects/registry';
const engines = new RendererRegistry();
engines.register('ogl', () => {});
const effects = new EffectRegistry(engines);
for (const [id, def] of Object.entries(definitions)) effects.register({ ...def, id, renderer: 'ogl', createRenderer() {} });
test('rejects invalid versions and disabled/unknown effects', () => {
	for (const raw of [null, { version: 2, enabled: true, effect: 'aurora' }, { enabled: true, effect: 'unknown' }, { enabled: false, effect: 'waves' }]) expect(normalize(raw, effects)).toBeNull();
});
test('clamps settings and strips arbitrary shader/unknown keys', () => {
	const s = sanitizeSettings(effects.get('aurora'), { speed: 999, intensity: -5, glow: NaN, opacity: 'bad', arbitraryShader: 'x', colors: ['javascript:x', 'var(--wp--preset--color--accent)', '#aabbcc'] });
	expect(s.speed).toBe(3); expect(s.intensity).toBe(0); expect(s.glow).toBe(0.6); expect(s.opacity).toBe(1); expect(s.arbitraryShader).toBeUndefined(); expect(s.colors).toEqual(['#01273e', 'var(--wp--preset--color--accent)', '#aabbcc']);
});
test('performance values and colors have bounded defaults', () => {
	const s = normalize({ enabled: true, effect: 'waves', performance: { maxFps: 1000, quality: 'custom' }, settings: { colors: ['#fff'] } }, effects);
	expect(s.performance.maxFps).toBe(60); expect(s.performance.quality).toBe('auto'); expect(s.settings.colors).toHaveLength(3);
});
test('registry rejects duplicates, unknown engines and malformed lifecycle', () => {
	expect(() => engines.register('ogl', () => {})).toThrow();
	expect(() => effects.register({ id: 'aurora' })).toThrow();
	expect(() => effects.register({ ...definitions.aurora, id: 'custom', renderer: 'missing', createRenderer() {} })).toThrow();
	expect(() => checkLifecycle({ destroy() {} })).toThrow();
	effects.unregister('missing'); expect(effects.getAll()).toHaveLength(3);
});
test('all schema control types validate', () => {
	const def = { defaults: { choice: 'a', flag: false, label: 'default', color: '#fff' }, controls: [{ id: 'choice', type: 'select', options: [{ value: 'a' }] }, { id: 'flag', type: 'toggle' }, { id: 'label', type: 'text' }, { id: 'color', type: 'color' }] };
	const s = sanitizeSettings(def, { choice: 'bad', flag: 1, label: 'a'.repeat(500), color: 'url(x)' });
	expect(s.choice).toBe('a'); expect(s.flag).toBe(false); expect(s.label.length).toBe(200); expect(s.color).toBe('#fff');
});
test.each(fixtures.configs)('PHP/JS shared config: $name', ({ raw, expected }) => {
	expect(sanitizeConfig(raw, effects)).toEqual(expected);
});
test.each(fixtures.controls)('PHP/JS shared controls: $name', ({ input, expected }) => {
	expect(sanitizeSettings(fixtures.definition, input)).toEqual(expected);
});
test('nonfinite numbers never enter any numeric control', () => {
	for (const value of [NaN, Infinity, -Infinity]) {
		const s = sanitizeConfig({ enabled: true, settings: { speed: value }, performance: { maxFps: value } }, effects);
		expect(s.settings.speed).toBe(0.4);
		expect(s.performance.maxFps).toBe(30);
	}
});
test('effect changes preserve common controls; presets reset only effect settings', () => {
	const old = sanitizeConfig({enabled: true, effect: 'aurora', preset: 'warm', settings: {speed: 2, opacity: 0.5, glow: 1.2, colors: ['#fff', 'var(--wp--preset--color--accent)']}, performance: {quality: 'high'}, fallback: {color: '#abc'}}, effects);
	const changed = switchEffect(old, 'waves', effects);
	expect(changed.preset).toBe('');
	expect(changed.settings.speed).toBe(2);
	expect(changed.settings.opacity).toBe(0.5);
	expect(changed.settings.colors).toEqual(old.settings.colors);
	expect(changed.settings.glow).toBeUndefined();
	expect(changed.settings.count).toBe(5);
	const applied = applyPreset(changed, {id: 'example', settings: {count: 99, shader: 'x', colors: ['#fff', '#000']}}, effects);
	expect(applied.settings.count).toBe(12);
	expect(applied.settings.speed).toBe(0.4);
	expect(applied.settings.shader).toBeUndefined();
	expect(applied.performance).toEqual(old.performance);
	expect(applied.fallback).toEqual(old.fallback);
	expect(old.settings.glow).toBe(1.2);
});
