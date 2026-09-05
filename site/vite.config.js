import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const siteOutput = resolve(root, '../dist/site');

function generatedServiceWorker() {
  return {
    name: 'raw-fit-check-generated-service-worker',
    apply: 'build',
    writeBundle() {
      const precacheAssets = readdirSync(resolve(siteOutput, 'assets'), { withFileTypes: true })
        .filter(file => file.isFile() && /\.(?:js|css)$/.test(file.name))
        .map(file => `/assets/${file.name}`)
        .sort();
      const shell = ['/', '/demo/', '/privacy/', '/terms/', '/404.html', '/raw-bench-720.webp', '/raw-bench.webp', '/social-card.png', '/apple-touch-icon.png', '/favicon.svg', '/examples/sony-ilce-6700-sample.ARW', ...precacheAssets];
      const shellDocuments = ['index.html', 'demo/index.html', 'privacy/index.html', 'terms/index.html', '404.html']
        .map(path => readFileSync(resolve(siteOutput, path)));
      const cacheVersion = createHash('sha256')
        .update(shell.join('\n'))
        .update(Buffer.concat(shellDocuments))
        .digest('hex')
        .slice(0, 12);
      const template = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
      const worker = template
        .replace('__CACHE_VERSION__', cacheVersion)
        .replace('__PRECACHE_URLS__', JSON.stringify(shell));
      writeFileSync(resolve(siteOutput, 'sw.js'), worker);
    }
  };
}

export default defineConfig({
  root,
  publicDir: resolve(root, 'public'),
  plugins: [generatedServiceWorker()],
  build: {
    outDir: siteOutput,
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        demo: resolve(root, 'demo/index.html'),
        privacy: resolve(root, 'privacy/index.html'),
        terms: resolve(root, 'terms/index.html'),
        notFound: resolve(root, '404.html')
      }
    }
  }
});
