import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--config','site/vite.config.js','--host','127.0.0.1','--port','4173'], { stdio:'ignore' });
const waitForServer = async () => { for(let i=0;i<40;i++){ try { const r=await fetch('http://127.0.0.1:4173/'); if(r.ok)return; } catch {} await new Promise(r=>setTimeout(r,100)); } throw new Error('preview server did not start'); };
try {
  await waitForServer(); const browser=await chromium.launch({headless:true});
  for (const route of ['/', '/privacy/', '/terms/']) {
    const context=await browser.newContext({viewport:{width:390,height:844}}); const page=await context.newPage(); const errors=[]; page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())}); page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'networkidle'}); assert.equal(await page.locator('h1').count(),1); assert.equal(await page.locator('main').count(),1);
    const results=await new AxeBuilder({page}).analyze(); const serious=results.violations.filter(v=>['serious','critical'].includes(v.impact)); assert.deepEqual(serious.map(v=>v.id),[]); assert.deepEqual(errors,[]); await context.close();
  }
  const context=await browser.newContext({viewport:{width:1280,height:800}}); const page=await context.newPage(); await page.goto('http://127.0.0.1:4173/'); await page.locator('#raw-file').setInputFiles({name:'sample.txt',mimeType:'text/plain',buffer:Buffer.from('not raw')}); await page.locator('#inspect-button').click(); await page.locator('.result.unsupported').waitFor(); assert.match(await page.locator('#result-panel').textContent(),/supported camera RAW extension/); await context.close(); await browser.close();
} finally { server.kill('SIGTERM'); }
