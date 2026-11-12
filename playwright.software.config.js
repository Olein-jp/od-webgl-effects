const base=require('./playwright.config');
module.exports={...base,projects:[{name:'chromium-software',use:{browserName:'chromium',launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}}]};
