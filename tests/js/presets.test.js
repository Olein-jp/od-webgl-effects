import {definitions,sanitizeConfig,saveUserPreset,sanitizeUserPresets,applyPreset} from '../../src/effects/settings';
const effects={get:id=>definitions[id]};
test('saved presets retain theme colors and isolate unrelated settings',()=>{
 const state=sanitizeConfig({enabled:true,settings:{colors:['var(--wp--preset--color--accent)','#abc']},performance:{quality:'high'},fallback:{color:'#fff'}},effects);
 const saved=saveUserPreset(state,' Example ','user-demo',effects);expect(saved.userPresets[0].name).toBe('Example');
 expect(saved.userPresets[0].settings.colors).toEqual(state.settings.colors);const applied=applyPreset({...saved,settings:{}},saved.userPresets[0],effects);
 expect(applied.settings).toEqual(state.settings);expect(applied.performance).toEqual(state.performance);expect(applied.fallback).toEqual(state.fallback);
 expect(state.userPresets).toBeUndefined();
});
test('block preset input is bounded and discards shader payloads',()=>{
 const presets=Array.from({length:100},(_,i)=>({id:'user-'+i,name:'😀'.repeat(100),effect:'aurora',settings:{shader:'attack'}}));
 const out=sanitizeUserPresets(presets,effects);expect(out).toHaveLength(10);expect(Array.from(out[0].name)).toHaveLength(80);expect(out[0].settings.shader).toBeUndefined();
});
