import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await mkdir('.impeccable/review',{recursive:true});
 for(const [name,width,height] of [['mobile',375,900],['desktop',1440,900]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:3114/');await page.evaluate(()=>Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r;}))));
  await page.screenshot({path:`.impeccable/review/${name}.png`,fullPage:true});
  await page.getByLabel('Escenario').selectOption('saved');
  await page.getByRole('button',{name:'Quitar portada'}).waitFor({state:'visible'});
  await page.getByRole('region',{name:'Gestión de prueba'}).screenshot({path:`.impeccable/review/editor-${name}.png`});
 }
 await page.setViewportSize({width:375,height:900});await page.addStyleTag({content:'html {font-size:200%}'});
 console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,classes:e.className,text:e.textContent.slice(0,80),right:e.getBoundingClientRect().right})).slice(0,20)}))));
 await page.screenshot({path:'.impeccable/review/enlarged.png',fullPage:true});
} finally {await browser.close();}
