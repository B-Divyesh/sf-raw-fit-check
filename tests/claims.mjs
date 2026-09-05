import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { access, copyFile, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4174';
const samplePath = 'examples/sony-ilce-6700-sample.ARW';
const binary = process.platform === 'win32' ? 'target/debug/raw-fit-check.exe' : 'target/debug/raw-fit-check';
let server;
let browser;

function command(args, options = {}) {
  return spawnSync(binary, args, { encoding: 'utf8', timeout: 20_000, ...options });
}

async function tempSample(name = 'sony-ilce-6700-sample.ARW') {
  const directory = await mkdtemp(join(tmpdir(), 'raw-fit-check-claim-'));
  const file = join(directory, name);
  await copyFile(samplePath, file);
  return { directory, file };
}

async function nikonSample() {
  const sony = await readFile(samplePath);
  const jpeg = sony.subarray(65);
  const make = Buffer.from('NIKON CORPORATION\0');
  const model = Buffer.from('NIKON Z 6_2\0');
  const dataOffset = 50;
  const raw = Buffer.alloc(dataOffset + make.length + model.length + jpeg.length);
  raw.set([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
  raw.writeUInt16LE(3, 8);
  const entry = (at, tag, type, count, value) => {
    raw.writeUInt16LE(tag, at); raw.writeUInt16LE(type, at + 2);
    raw.writeUInt32LE(count, at + 4); raw.writeUInt32LE(value, at + 8);
  };
  entry(10, 271, 2, make.length, dataOffset);
  entry(22, 272, 2, model.length, dataOffset + make.length);
  entry(34, 259, 3, 1, 7);
  make.copy(raw, dataOffset); model.copy(raw, dataOffset + make.length); jpeg.copy(raw, dataOffset + make.length + model.length);
  return raw;
}

async function newPage(options = {}) {
  const context = await browser.newContext(options);
  return { context, page: await context.newPage() };
}

before(async () => {
  const build = spawnSync('cargo', ['build', '--locked'], { encoding: 'utf8', timeout: 120_000 });
  assert.equal(build.status, 0, build.stderr);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--config', 'site/vite.config.js', '--host', '127.0.0.1', '--port', '4174'], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(`${base}/`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
    if (attempt === 49) throw new Error('preview server did not start');
  }
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  server.kill('SIGTERM');
});

test('@claim:demo-one-click The demo opens with a realistic populated sample report', async () => {
  const { context, page } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/`);
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.locator('.result.preview').waitFor();
  assert.match(await page.locator('#result-panel').textContent(), /SONY ILCE-6700/);
  assert.match(await page.locator('#result-panel').textContent(), /320 × 240/);
  await context.close();
});

test('@claim:demo-sandbox The demo labels, resets, and clears its separate storage namespace', async () => {
  const { context, page } = await newPage();
  await page.goto(`${base}/demo/`);
  await page.locator('.result.preview').waitFor();
  assert.match(await page.locator('.demo-banner').textContent(), /Demo — sample data, nothing is saved/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('demo:raw-fit-check:mode')), 'sample');
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.locator('.result.preview').waitFor();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.waitForURL(`${base}/#test`);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('demo:raw-fit-check:mode')), null);
  await context.close();
});

test('@claim:browser-raw-extensions The browser accepts the documented RAW extensions', async () => {
  const { context, page } = await newPage();
  const bytes = await readFile(samplePath);
  await page.goto(`${base}/`);
  for (const extension of ['nef', 'arw', 'cr2', 'cr3', 'dng', 'orf', 'raf', 'rw2', 'pef', 'srw']) {
    await page.locator('#raw-file').setInputFiles({ name: `representative.${extension.toUpperCase()}`, mimeType: 'application/octet-stream', buffer: bytes });
    await page.getByRole('button', { name: 'Inspect locally' }).click();
    await page.locator('.result.preview').waitFor();
    assert.doesNotMatch(await page.locator('#result-panel').textContent(), /supported camera RAW extension/);
  }
  await context.close();
});

test('@claim:browser-local-inspection The browser reports container, camera, preview, and local timing', async () => {
  const { context, page } = await newPage();
  const bytes = await readFile(samplePath);
  await page.goto(`${base}/`);
  await page.locator('#raw-file').setInputFiles({ name: 'representative.ARW', mimeType: 'application/octet-stream', buffer: bytes });
  await page.getByRole('button', { name: 'Inspect locally' }).click();
  await page.locator('.result.preview').waitFor();
  const output = await page.locator('#result-panel').textContent();
  assert.match(output, /TIFF-based RAW/);
  assert.match(output, /SONY ILCE-6700/);
  assert.match(output, /320 × 240/);
  assert.match(output, /ms preview decode/);
  await context.close();
});

test('@claim:browser-conservative-result The browser returns preview-only instead of a full editor verdict', async () => {
  const { context, page } = await newPage();
  const bytes = await readFile(samplePath);
  await page.goto(`${base}/`);
  await page.locator('#raw-file').setInputFiles({ name: 'representative.ARW', mimeType: 'application/octet-stream', buffer: bytes });
  await page.getByRole('button', { name: 'Inspect locally' }).click();
  await page.locator('.result.preview').waitFor();
  assert.match(await page.locator('#result-panel').textContent(), /Preview-only/);
  assert.match(await page.locator('#result-panel').textContent(), /Use the CLI to check an editor and version/);
  await context.close();
});

test('@claim:browser-private-file A selected file is not uploaded or persisted', async () => {
  const { context, page } = await newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  const bytes = await readFile(samplePath);
  await page.goto(`${base}/`);
  requests.length = 0;
  await page.locator('#raw-file').setInputFiles({ name: 'private-never-upload.ARW', mimeType: 'application/octet-stream', buffer: bytes });
  await page.getByRole('button', { name: 'Inspect locally' }).click();
  await page.locator('.result.preview').waitFor();
  assert.deepEqual(requests, []);
  const storage = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
    indexed: await indexedDB.databases().then(items => items.length),
    cachedPaths: (await Promise.all((await caches.keys()).map(async name => (await caches.open(name)).keys()))).flat().map(request => new URL(request.url).pathname)
  }));
  assert.equal(storage.local, 0);
  assert.equal(storage.session, 0);
  assert.equal(storage.cookies, '');
  assert.equal(storage.indexed, 0);
  assert.ok(storage.cachedPaths.every(path => !path.includes('private-never-upload')));
  await context.close();
});

test('@claim:browser-offline The demo reloads and checks the bundled sample offline after the first visit', async () => {
  const { context, page } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/demo/`, { waitUntil: 'networkidle' });
  await page.locator('.result.preview').waitFor();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await registration.update();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.result.preview').waitFor();
  assert.match(await page.locator('#network-status').textContent(), /Offline/);
  await context.close();
});

test('@claim:browser-no-third-parties The demo uses same-origin requests and no cookies', async () => {
  const { context, page } = await newPage();
  const origins = new Set();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto(`${base}/demo/`, { waitUntil: 'networkidle' });
  await page.locator('.result.preview').waitFor();
  assert.deepEqual([...origins], [base]);
  assert.equal(await page.evaluate(() => document.cookie), '');
  await context.close();
});

test('@claim:free-demo The sample runs without an account or payment step', async () => {
  const { context, page } = await newPage();
  await page.goto(`${base}/demo/`);
  await page.locator('.result.preview').waitFor();
  assert.equal(await page.locator('input[type="password"], input[name*="card" i], [data-payment]').count(), 0);
  assert.match(await page.locator('body').textContent(), /Free to use|Demo — sample data/);
  await context.close();
});

test('@claim:cli-demo The CLI demo writes a bundled sample to a temporary folder and reports it', async () => {
  const result = command(['demo', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  await access(output.sample_file);
  await access(output.demo_directory);
  assert.equal(output.report.overall, 'usable');
  assert.equal(output.report.files[0].camera_model, 'ILCE-6700');
});

test('@claim:cli-recursive The CLI checks a nested folder of RAW files', async () => {
  const { directory, file } = await tempSample();
  const nested = join(directory, 'nested');
  await (await import('node:fs/promises')).mkdir(nested);
  await (await import('node:fs/promises')).rename(file, join(nested, 'sony.ARW'));
  const result = command(['check', directory, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).files.length, 1);
});

test('@claim:cli-preview-extraction The CLI extracts a JPEG preview without overwriting an earlier one', async () => {
  const { directory, file } = await tempSample();
  const previews = join(directory, 'previews');
  const args = ['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--preview-dir', previews, '--json'];
  assert.equal(command(args).status, 0);
  assert.equal(command(args).status, 0);
  const extracted = (await readdir(previews)).filter(name => name.endsWith('.jpg')).sort();
  assert.deepEqual(extracted, ['sony-ilce-6700-sample-preview-2.jpg', 'sony-ilce-6700-sample-preview.jpg']);
});

test('@claim:cli-benchmark-bounds The CLI accepts one through twenty-five preview benchmark passes', async () => {
  const { file } = await tempSample();
  for (const runs of ['1', '25']) {
    const result = command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--benchmark-runs', runs, '--json']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).files[0].preview.benchmark_runs, Number(runs));
  }
});

test('@claim:cli-json The CLI emits a parseable report with stable top-level fields', async () => {
  const { file } = await tempSample();
  const result = command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(report).sort(), ['editor', 'editor_version', 'files', 'machine', 'overall', 'registry_version', 'report_version', 'tool_version']);
  assert.equal(report.files[0].matched_rule, 'darktable-4.6-sony-ilce-6700');
});

test('@claim:cli-custom-registry The CLI accepts a reviewed custom registry file', async () => {
  const { directory, file } = await tempSample();
  const registry = join(directory, 'registry.json');
  await copyFile('registry/compatibility.json', registry);
  const result = command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--registry', registry, '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).overall, 'usable');
});

test('@claim:cli-registry-evidence Every built-in rule has a dated HTTPS source and numeric version range', () => {
  const result = command(['registry', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const registry = JSON.parse(result.stdout);
  for (const rule of registry.rules) {
    assert.match(rule.evidence.url, /^https:\/\//);
    assert.match(rule.evidence.accessed, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(rule.min_version || rule.max_version);
    for (const version of [rule.min_version, rule.max_version].filter(Boolean)) assert.match(version, /^\d+(\.\d+){0,3}$/);
  }
});

test('@claim:cli-exact-input The CLI rejects malformed versions and unsupported platforms as invalid input', async () => {
  const { directory, file } = await tempSample();
  const invalidRegistry = join(directory, 'invalid-registry.json');
  await writeFile(invalidRegistry, '{"schema_version":2,"registry_version":"test","updated":"2026-09-05","rules":[]}');
  for (const args of [
    ['check', file, '--editor', 'darktable', '--editor-version', 'banana-4.6.0', '--platform', 'linux'],
    ['check', file, '--editor', 'darktable', '--editor-version', '4.6.0-beta', '--platform', 'linux'],
    ['check', file, '--editor', 'darktable', '--editor-version', '4.6x', '--platform', 'linux'],
    ['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'typo'],
    ['check', file, '--benchmark-runs', '0'],
    ['check', file, '--benchmark-runs', '26'],
    ['check', file, '--registry', invalidRegistry]
  ]) {
    const result = command(args);
    assert.equal(result.status, 1, result.stderr);
  }
});

test('@claim:cli-exit-codes The CLI reserves exit codes for usable, invalid, preview-only, and unsupported outcomes', async () => {
  const { directory, file } = await tempSample();
  assert.equal(command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux']).status, 0);
  assert.equal(command(['check', file, '--editor', 'darktable', '--editor-version', '4.5.9', '--platform', 'linux']).status, 2);
  assert.equal(command(['check', file, '--editor', 'apple-photos', '--editor-version', '12.99', '--platform', 'macos']).status, 3);
  assert.equal(command(['check', join(directory, 'missing.ARW'), '--json']).status, 1);
  assert.equal(command(['unknown-command']).status, 1);
  assert.equal(command(['check', file, '--editor', 'darktable']).status, 1);
});

test('@claim:cli-ci The CLI finishes without reading interactive input when --ci is set', async () => {
  const { file } = await tempSample();
  const result = command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--ci'], { input: '', timeout: 5_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OVERALL: usable/);
});

test('@claim:darktable-sony Sony ILCE-6700 is usable in darktable 4.6 or later on Linux', async () => {
  const { file } = await tempSample();
  const result = command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux', '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).files[0].matched_rule, 'darktable-4.6-sony-ilce-6700');
});

test('@claim:darktable-nikon Nikon Z 6_2 is usable in darktable 3.6 or later on Linux', async () => {
  const { directory } = await tempSample('unused.ARW');
  const file = join(directory, 'nikon.NEF');
  await writeFile(file, await nikonSample());
  const result = command(['check', file, '--editor', 'darktable', '--editor-version', '3.6.0', '--platform', 'linux', '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).files[0].matched_rule, 'darktable-3.6-nikon-z6ii');
});

test('@claim:apple-sonoma Sony ILCE-6700 is usable in Apple Photos on macOS 14 or later', async () => {
  const { file } = await tempSample();
  const result = command(['check', file, '--editor', 'apple-photos', '--editor-version', '14.0', '--platform', 'macos', '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).files[0].matched_rule, 'apple-raw-macos14-sony-a6700');
});

test('@claim:apple-monterey Sony ILCE-6700 is unsupported in Apple Photos through macOS 12.99', async () => {
  const { file } = await tempSample();
  const result = command(['check', file, '--editor', 'apple-photos', '--editor-version', '12.99', '--platform', 'macos', '--json']);
  assert.equal(result.status, 3, result.stderr);
  assert.equal(JSON.parse(result.stdout).files[0].matched_rule, 'apple-raw-macos12-sony-a6700');
});

test('@claim:cli-read-only The CLI leaves the checked RAW sample unchanged and does not offer hardware advice', async () => {
  const { file } = await tempSample();
  const before = await readFile(file);
  const result = command(['check', file, '--editor', 'darktable', '--editor-version', '4.6.0', '--platform', 'linux']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await readFile(file), before);
  assert.doesNotMatch(result.stdout, /buy|purchase|hardware recommendation/i);
});
