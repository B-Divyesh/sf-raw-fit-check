import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--config','site/vite.config.js','--host','127.0.0.1','--port','4173'], { stdio:'ignore' });
const waitForServer = async () => { for(let i=0;i<40;i++){ try { const r=await fetch('http://127.0.0.1:4173/'); if(r.ok)return; } catch {} await new Promise(r=>setTimeout(r,100)); } throw new Error('preview server did not start'); };
try {
  await waitForServer(); const browser=await chromium.launch({headless:true});
  for (const route of ['/', '/privacy/', '/terms/']) {
    const context=await browser.newContext({viewport:{width:390,height:844}}); const page=await context.newPage(); const errors=[]; const origins=new Set(); page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())}); page.on('pageerror',e=>errors.push(e.message)); page.on('request',request=>origins.add(new URL(request.url()).origin));
    await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'networkidle'}); assert.equal(await page.locator('h1').count(),1); assert.equal(await page.locator('main').count(),1); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); assert.deepEqual([...origins],['http://127.0.0.1:4173']);
    const results=await new AxeBuilder({page}).analyze(); const serious=results.violations.filter(v=>['serious','critical'].includes(v.impact)); assert.deepEqual(serious.map(v=>v.id),[]); assert.deepEqual(errors,[]); await context.close();
  }
  const context=await browser.newContext({viewport:{width:1280,height:800}}); const page=await context.newPage(); await page.goto('http://127.0.0.1:4173/'); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link'); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(()=>document.activeElement.id),'main'); await page.locator('#raw-file').setInputFiles({name:'sample.txt',mimeType:'text/plain',buffer:Buffer.from('not raw')}); await page.locator('#inspect-button').click(); await page.locator('.result.unsupported').waitFor(); assert.match(await page.locator('#result-panel').textContent(),/supported camera RAW extension/); await context.close();

  // Regression: Cache Storage alone must contain the shell's hashed assets and keep the local checker usable.
  const offlineContext=await browser.newContext({viewport:{width:390,height:844}}); const offlinePage=await offlineContext.newPage(); const errors=[]; offlinePage.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())}); offlinePage.on('pageerror',e=>errors.push(e.message));
  await offlinePage.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const serviceWorker=await offlinePage.evaluate(async () => { const registration=await navigator.serviceWorker.ready; await registration.update(); if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once:true })); return {scope:registration.scope,waiting:Boolean(registration.waiting)}; }); assert.match(serviceWorker.scope,/\/$/); assert.equal(serviceWorker.waiting,false);
  await offlinePage.reload({waitUntil:'networkidle'});
  const cachedAssets=await offlinePage.evaluate(async () => {
    const names=await caches.keys(); const requests=await Promise.all(names.filter(name=>name.startsWith('raw-fit-check-shell-')).map(async name=>(await caches.open(name)).keys()));
    return requests.flat().map(request=>new URL(request.url).pathname);
  });
  for (const path of await offlinePage.locator('script[src], link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(node=>new URL(node.src || node.href, location.href).pathname))) assert.ok(cachedAssets.includes(path), `${path} should be in Cache Storage`);
  const cdp=await offlineContext.newCDPSession(offlinePage); await cdp.send('Network.clearBrowserCache'); await offlineContext.setOffline(true);
  await offlinePage.reload({waitUntil:'domcontentloaded'}); await offlinePage.locator('#raw-file').setInputFiles({name:'offline.ARW',mimeType:'application/octet-stream',buffer:Buffer.from([0x49,0x49,42,0,8,0,0,0])}); await assert.equal(await offlinePage.locator('#inspect-button').isDisabled(),false); await offlinePage.locator('#inspect-button').click(); await offlinePage.locator('.result.unsupported').waitFor(); assert.match(await offlinePage.locator('#result-panel').textContent(),/No local viewing path proven/); assert.match(await offlinePage.locator('#network-status').textContent(),/Offline/); assert.deepEqual(errors,[]); await offlineContext.close(); await browser.close();
} finally { server.kill('SIGTERM'); }
