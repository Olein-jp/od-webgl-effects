import {sanitizeFallback,fallbackImageValue} from '../../src/effects/settings';
test('fallback image CSS rejects executable URLs and escapes delimiters',()=>{
 for(const url of ['javascript:alert(1)','data:image/svg+xml,test','https://host/a\nb'])expect(fallbackImageValue(url)).toBe('none');
 const value=fallbackImageValue('https://host/image"\');color:red;/*');expect(value).not.toContain("');");expect(value).toContain('%22');
});
test('image IDs must be finite positive integers; old color data is unchanged',()=>{
 for(const id of [null,1.5,-1,Infinity,'2',2147483648])expect(sanitizeFallback({imageId:id})).toEqual({color:'#01273e'});
 expect(sanitizeFallback({imageId:2,fit:'bad',position:'bad'})).toEqual({color:'#01273e',imageId:2,fit:'cover',position:'center'});
});
