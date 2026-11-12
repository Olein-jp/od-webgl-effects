import {AutoQuality,budgets,allocation,requestedQuality} from '../../src/frontend/quality';
test('auto degrades with sustained load, recovers slowly, and excludes pauses',()=>{
 const q=new AutoQuality();let now=0;for(let i=0;i<32;i++) q.observe(now+=40,25);
 expect(q.level).toBe(0);q.reset();q.observe(now+=10000);expect(q.level).toBe(0);
 for(let i=0;i<302;i++)q.observe(now+=16,1);expect(q.level).toBe(1);
 for(let i=0;i<301;i++)q.observe(now+=16,1);expect(q.level).toBe(1);
 for(let i=0;i<320;i++)q.observe(now+=16,1);expect(q.level).toBe(2);
});
test('resolution respects DPR, area and longest side limits',()=>{
 for(const budget of Object.values(budgets)){const rect={width:1440,height:20000};const dpr=allocation(rect,3,budget);
 expect(dpr*rect.height).toBeLessThanOrEqual(4096);expect(dpr*dpr*rect.width*rect.height).toBeLessThanOrEqual(budget.pixels+1);}
});
test('mobile override is authoritative, including mobile auto',()=>{
 const c={performance:{quality:'high',mobileQuality:'low'}};expect(requestedQuality(c,390)).toBe('low');expect(requestedQuality(c,1440)).toBe('high');
});
