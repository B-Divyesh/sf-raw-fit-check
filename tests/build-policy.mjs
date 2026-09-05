import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const requiredPages = ['index.html', 'demo/index.html', 'privacy/index.html', 'terms/index.html', '404.html'];
for (const page of requiredPages) await access(`dist/site/${page}`);
for (const asset of ['apple-touch-icon.png', 'social-card.png', 'examples/sony-ilce-6700-sample.ARW', 'staticwebapp.config.json', 'sw.js']) await access(`dist/site/${asset}`);

const worker = await read('dist/site/sw.js');
const shell = JSON.parse(worker.match(/const SHELL = (\[[^;]+\]);/)?.[1] ?? 'null');
assert.ok(Array.isArray(shell), 'the built service worker should expose its precache list');
for (const path of ['/', '/demo/', '/privacy/', '/terms/', '/404.html', '/examples/sony-ilce-6700-sample.ARW']) assert.ok(shell.includes(path), `${path} should work from the precache`);
const emittedAssets = (await readdir('dist/site/assets')).filter(name => /\.(?:js|css)$/.test(name)).map(name => `/assets/${name}`);
for (const path of emittedAssets) assert.ok(shell.includes(path), `${path} should work from the precache`);

const policy = JSON.parse(await read('dist/site/staticwebapp.config.json'));
assert.equal(policy.globalHeaders['Referrer-Policy'], 'no-referrer');
assert.equal(policy.globalHeaders['X-Frame-Options'], 'DENY');
assert.match(policy.globalHeaders['Content-Security-Policy'], /frame-ancestors 'none'/);
assert.equal(policy.responseOverrides['404'].rewrite, '/404.html');

const jsSizes = await Promise.all(emittedAssets.filter(path => path.endsWith('.js')).map(path => stat(`dist/site${path}`)));
const cssSizes = await Promise.all(emittedAssets.filter(path => path.endsWith('.css')).map(path => stat(`dist/site${path}`)));
assert.ok(jsSizes.reduce((total, file) => total + file.size, 0) <= 200 * 1024, 'initial JavaScript must stay inside the static-product budget');
assert.ok(cssSizes.reduce((total, file) => total + file.size, 0) <= 50 * 1024, 'CSS must stay inside the static-product budget');
