import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const index = await read('dist/site/index.html');
const worker = await read('dist/site/sw.js');
const headers = await read('dist/site/_headers');
const azurePolicy = JSON.parse(await read('dist/site/staticwebapp.config.json'));
const assetPaths = [...index.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match => match[1]);
const shell = JSON.parse(worker.match(/const SHELL = (\[[^;]+\]);/)?.[1] ?? 'null');
const emittedAssets = (await readdir('dist/site/assets')).filter(name => /\.(?:js|css)$/.test(name)).map(name => `/assets/${name}`);

assert.ok(assetPaths.length >= 2, 'the production document should reference hashed JavaScript and CSS');
assert.match(worker, /const CACHE = 'raw-fit-check-shell-[a-f0-9]{12}'/);
assert.ok(Array.isArray(shell), 'the service worker should contain a generated precache list');
for (const assetPath of emittedAssets) assert.ok(shell.includes(assetPath), `${assetPath} must be precached`);
for (const path of shell) await access(`dist/site${path.endsWith('/') ? `${path}index.html` : path}`);
assert.match(worker, /caches\.match\(event\.request\)/, 'the worker should read the precache before the network');
assert.match(headers, /\/assets\/\*[\s\S]*max-age=31536000, immutable/);
assert.match(headers, /\/sw\.js[\s\S]*Cache-Control: no-cache/);
assert.equal(azurePolicy.globalHeaders['Referrer-Policy'], 'no-referrer');
assert.equal(azurePolicy.globalHeaders['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
assert.equal(azurePolicy.routes[0].headers['Cache-Control'], 'public, max-age=31536000, immutable');
assert.equal(azurePolicy.routes[2].headers['Cache-Control'], 'no-cache');
