import { inspectRawFile } from './analyzer.js';

const form = document.querySelector('#check-form');
const input = document.querySelector('#raw-file');
const selected = document.querySelector('#selected-file');
const button = document.querySelector('#inspect-button');
const panel = document.querySelector('#result-panel');
const drop = document.querySelector('#drop-zone');
const network = document.querySelector('#network-status');
const demo = document.body.dataset.demo === 'true';
const demoStorageKey = 'demo:raw-fit-check:mode';
const formatBytes = (number) => number < 1024 * 1024 ? `${(number / 1024).toFixed(0)} KB` : `${(number / 1024 / 1024).toFixed(1)} MB`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

function updateNetwork() {
  const online = navigator.onLine;
  network.classList.toggle('offline', !online);
  network.innerHTML = `<span aria-hidden="true">●</span> ${online ? 'Online · local check' : 'Offline · local check'}`;
}

function selectFile(file, { isDemo = false } = {}) {
  if (!file) {
    selected.textContent = 'Choose one RAW file to inspect.';
    button.disabled = true;
    return;
  }
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  selected.textContent = `${isDemo ? 'Sample: ' : ''}${file.name} · ${formatBytes(file.size)} · ready for local inspection`;
  button.disabled = false;
}

function showResult(report) {
  const camera = [report.make, report.model].filter(Boolean).join(' ') || 'Not found in TIFF header';
  const preview = report.preview ? `${report.preview.width} × ${report.preview.height} · ${(report.preview.width * report.preview.height / 1e6).toFixed(2)} MP` : 'No decodable preview found';
  const copy = report.verdict === 'preview-only' ? {
    label: '◐ Preview-only',
    title: 'The embedded preview works.',
    reason: 'This browser decoded the embedded JPEG. Use the CLI to check an editor and version.',
    next: 'Next: run the CLI, then test one edit and export.'
  } : {
    label: '× Unsupported',
    title: 'No local preview was proven.',
    reason: 'This file has no embedded JPEG that this browser can identify and decode.',
    next: 'Next: try another representative RAW or run the CLI.'
  };
  panel.className = `result ${report.verdict === 'preview-only' ? 'preview' : 'unsupported'}`;
  panel.innerHTML = `<p class="status">${copy.label}</p><h2>${copy.title}</h2><p>${copy.reason}</p><dl><dt>File</dt><dd>${escapeHtml(report.name)} · ${formatBytes(report.size)}</dd><dt>Container</dt><dd>${escapeHtml(report.container)}</dd><dt>Camera ID</dt><dd>${escapeHtml(camera)}</dd><dt>Preview</dt><dd>${preview}</dd><dt>Local timing</dt><dd>${report.decodeMs == null ? 'Not run' : `${report.decodeMs.toFixed(1)} ms preview decode · ${report.scanMs.toFixed(1)} ms total`}</dd></dl><p class="next"><strong>${copy.next}</strong></p>`;
}

async function inspectSelectedFile() {
  const file = input.files[0];
  if (!file) {
    selected.textContent = 'Choose one RAW file to continue.';
    input.focus();
    return;
  }
  button.disabled = true;
  button.textContent = 'Inspecting…';
  panel.className = 'result busy';
  panel.innerHTML = '<p class="result-label">Reading locally</p><p>Scanning the file header and embedded JPEG. Nothing is uploaded.</p><div class="meter" aria-hidden="true"><span></span></div>';
  try {
    showResult(await inspectRawFile(file));
  } catch (error) {
    panel.className = 'result unsupported';
    panel.innerHTML = `<p class="status">× Could not check</p><h2>Choose another RAW file.</h2><p>${escapeHtml(error.message)}</p><p class="next"><strong>Next: choose another representative RAW or use the CLI.</strong></p>`;
  } finally {
    button.disabled = false;
    button.textContent = 'Inspect locally';
  }
}

async function loadDemo() {
  try { sessionStorage.setItem(demoStorageKey, 'sample'); } catch {}
  selected.textContent = 'Loading the sample file.';
  button.disabled = true;
  try {
    const response = await fetch('/examples/sony-ilce-6700-sample.ARW');
    if (!response.ok) throw new Error('The bundled sample could not be loaded. Reload the page and try again.');
    const sample = new File([await response.arrayBuffer()], 'sony-ilce-6700-sample.ARW', { type: 'application/octet-stream' });
    selectFile(sample, { isDemo: true });
    await inspectSelectedFile();
  } catch (error) {
    panel.className = 'result unsupported';
    panel.innerHTML = `<p class="status">× Sample unavailable</p><h2>The sample could not load.</h2><p>${escapeHtml(error.message)}</p><p class="next"><strong>Next: reload while online, then try the demo again.</strong></p>`;
  }
}

updateNetwork();
addEventListener('online', updateNetwork);
addEventListener('offline', updateNetwork);
input.addEventListener('change', () => selectFile(input.files[0]));
for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('dragging'); });
for (const type of ['dragleave', 'drop']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('dragging'); });
drop.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));
form.addEventListener('submit', event => { event.preventDefault(); inspectSelectedFile(); });

document.querySelectorAll('[data-copy]').forEach(copy => copy.addEventListener('click', async () => {
  const previous = copy.textContent;
  try {
    await navigator.clipboard.writeText(copy.dataset.copy);
    copy.textContent = 'Copied';
  } catch {
    copy.textContent = 'Select command below';
  }
  setTimeout(() => { copy.textContent = previous; }, 1800);
}));

if (demo) {
  document.querySelector('#reset-demo').addEventListener('click', loadDemo);
  document.querySelector('#start-real').addEventListener('click', () => {
    try { sessionStorage.removeItem(demoStorageKey); } catch {}
    location.assign('/#test');
  });
  loadDemo();
}

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
