import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const server = process.env.BASE_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--config', 'site/vite.config.js', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'ignore' });
const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${base}/`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('preview server did not start');
};

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  const notFoundRoute = process.env.BASE_URL ? '/missing-raw-fit-check-route' : '/404.html';
  for (const route of ['/', '/demo/', '/privacy/', '/terms/', notFoundRoute]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push({ text: message.text(), url: message.location().url }); });
    page.on('pageerror', error => errors.push({ text: error.message, url: '' }));
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (route === notFoundRoute && process.env.BASE_URL) assert.equal(response?.status(), 404, 'the designed not-found page keeps HTTP 404');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('h1').count(), 1, `${route} has one page heading`);
    assert.equal(await page.locator('main').count(), 1, `${route} has one main landmark`);
    assert.ok((await page.title()).length > 0, `${route} has a title`);
    assert.ok(await page.locator('link[rel="canonical"]').count(), `${route} has a canonical URL`);
    assert.ok(await page.locator('meta[property="og:image"]').count(), `${route} has a sharing image`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} does not overflow on a phone`);
    const axe = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(axe.violations, [], `${route} has no axe violations`);
    const unexpectedErrors = route === notFoundRoute && process.env.BASE_URL
      ? errors.filter(error => !(error.url && error.text.includes('status of 404') && new URL(error.url).pathname === notFoundRoute))
      : errors;
    assert.deepEqual(unexpectedErrors, [], `${route} has no unexpected console errors`);
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${base}/`);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    for (const link of await page.locator('.topbar a, footer a').all()) {
      const box = await link.boundingBox();
      assert.ok(box && box.height >= 44 && box.width >= 44, 'persistent links meet the 44px target');
    }
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${base}/`);
    const sample = await readFile('examples/sony-ilce-6700-sample.ARW');
    await page.locator('#raw-file').setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('not raw') });
    await page.locator('#inspect-button').click();
    await page.locator('.result.unsupported').waitFor();
    assert.match(await page.locator('#result-panel').textContent(), /supported camera RAW extension/);
    await page.locator('#raw-file').setInputFiles({ name: 'sony.ARW', mimeType: 'application/octet-stream', buffer: sample });
    await page.locator('#inspect-button').click();
    await page.locator('.result.preview').waitFor();
    assert.match(await page.locator('#result-panel').textContent(), /SONY ILCE-6700/);
    const duration = await page.locator('.result').evaluate(element => getComputedStyle(element).animationDuration);
    assert.ok(parseFloat(duration) <= 0.01, `reduced motion duration should be effectively instant, got ${duration}`);
    await context.close();
  }

  await browser.close();
} finally {
  server?.kill('SIGTERM');
}
