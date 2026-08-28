import { inspectRawFile } from './analyzer.js';

const form = document.querySelector('#check-form');
const input = document.querySelector('#raw-file');
const selected = document.querySelector('#selected-file');
const button = document.querySelector('#inspect-button');
const panel = document.querySelector('#result-panel');
const drop = document.querySelector('#drop-zone');
const network = document.querySelector('#network-status');
const formatBytes = (n) => n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

function updateNetwork() {
  const online = navigator.onLine;
  network.classList.toggle('offline', !online);
  network.innerHTML = `<span aria-hidden="true">●</span> ${online ? 'Online · files stay local' : 'Offline · checker still works'}`;
}
updateNetwork();
addEventListener('online', updateNetwork); addEventListener('offline', updateNetwork);

function selectFile(file) {
  if (!file) { selected.textContent = 'No sample selected.'; button.disabled = true; return; }
  const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
  selected.textContent = `${file.name} · ${formatBytes(file.size)} · ready for local inspection`;
  button.disabled = false;
}
input.addEventListener('change', () => selectFile(input.files[0]));
for (const type of ['dragenter','dragover']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('dragging'); });
for (const type of ['dragleave','drop']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('dragging'); });
drop.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));

form.addEventListener('submit', async event => {
  event.preventDefault(); const file = input.files[0];
  if (!file) { selected.textContent = 'Choose one RAW file to continue.'; input.focus(); return; }
  button.disabled = true; button.textContent = 'Inspecting…';
  panel.className = 'result busy'; panel.innerHTML = '<p class="result-label">Reading locally</p><p>Scanning container metadata and embedded JPEG markers. Nothing is being uploaded.</p><div class="meter" aria-hidden="true"><span></span></div>';
  try {
    const report = await inspectRawFile(file);
    const hasCamera = [report.make, report.model].filter(Boolean).join(' ') || 'Not found in TIFF header';
    const preview = report.preview ? `${report.preview.width} × ${report.preview.height} · ${(report.preview.width * report.preview.height / 1e6).toFixed(2)} MP` : 'No decodable preview found';
    const copy = report.verdict === 'preview-only' ? {
      label:'◐ Preview-only', title:'The viewing path works.', reason:'This browser decoded the embedded JPEG. Full sensor-data support still needs an exact editor/version registry check in the CLI.', next:'Next: run the CLI with your editor and version, then test one edit and export.'
    } : { label:'× Unsupported', title:'No local viewing path proven.', reason:'This sample has no embedded JPEG that the browser can identify and decode.', next:'Next: try another compression mode or run the CLI for a detailed report.' };
    panel.className = `result ${report.verdict === 'preview-only' ? 'preview' : 'unsupported'}`;
    panel.innerHTML = `<p class="status">${copy.label}</p><h3>${copy.title}</h3><p>${copy.reason}</p><dl><dt>File</dt><dd>${escapeHtml(report.name)} · ${formatBytes(report.size)}</dd><dt>Container</dt><dd>${escapeHtml(report.container)}</dd><dt>Camera ID</dt><dd>${escapeHtml(hasCamera)}</dd><dt>Preview</dt><dd>${preview}</dd><dt>Local timing</dt><dd>${report.decodeMs == null ? 'Not run' : `${report.decodeMs.toFixed(1)} ms preview decode · ${report.scanMs.toFixed(1)} ms total`}</dd></dl><p class="next"><strong>${copy.next}</strong></p>`;
  } catch (error) {
    panel.className = 'result unsupported';
    panel.innerHTML = `<p class="status">× Could not check</p><h3>This sample needs another route.</h3><p>${escapeHtml(error.message)}</p><p class="next"><strong>Next: choose another representative RAW or use the CLI.</strong></p>`;
  } finally { button.disabled = false; button.textContent = 'Inspect locally'; }
});

document.querySelectorAll('[data-copy]').forEach(copy => copy.addEventListener('click', async () => {
  const previous = copy.textContent;
  try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = 'Copied'; }
  catch { copy.textContent = 'Select command below'; }
  setTimeout(() => { copy.textContent = previous; }, 1800);
}));

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
