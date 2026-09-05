# RAW Fit Check repair 2 handoff

## Release status: PASS

- Deployed implementation SHA: `c8e457aa565dddd5cdb0315c97cbb27b491f3a8d`
- Later verification/test SHA: `8699a467f5c766a10a632d75e854142bb13505ec`
- Documentation SHA: recorded with this handoff commit
- Live URL: `https://raw-fit-check.sociobot.in`
- Deployment: Static Web Apps production upload completed on 5 September 2026. The existing single static app was reused.

## What changed

- Added a bundled synthetic Sony ILCE-6700 RAW fixture, `raw-fit-check demo`, and `/demo/` with a populated one-click browser report.
- Added a persistent demo banner, reset action, real-data exit, and separate `demo:` session-storage namespace.
- Added `.factory/claims.json`, `.factory/demo.md`, and 24 tagged outcome tests. They cover every current public product claim.
- Corrected the unsupported Apple evidence rule to macOS Sonoma 14+. macOS 13 no longer gets a false `usable` verdict.
- Rejected malformed editor versions and invalid platforms. All parser and usage errors now return exit `1`, separate from preview-only `2`.
- Added the designed `/404.html` response override, route metadata, sharing image, apple-touch icon, CSP/frame protection, navigation/footer requirements, and 44 px persistent link targets.
- Removed the nested complementary landmark, fixed the first screen wording, and recorded the landing copy audit.

## Verification

From the documented clean setup:

```sh
npm ci --include=dev
npm test
npm run build
npm run package:cli
cargo package --locked
```

All commands pass. `npm test` includes Rust formatting and Clippy, Rust tests, browser tests, all 24 public claim tests, and a clean packaged-consumer installation test.

Additional completed checks:

- `BASE_URL=https://raw-fit-check.sociobot.in node tests/e2e.mjs` passed against fresh 390 px and 1280 px production contexts.
- The live flow checked the first screen, sample demo, reset/start-real isolation, invalid input recovery, keyboard skip link, focus, reduced motion, mobile targets, cold offline reload, privacy requests, legal routes, and the real HTTP 404.
- `/opt/fleet/lib/verify-url.sh https://raw-fit-check.sociobot.in /work/.evidence` passed: 631 ms load, no console errors, one `h1`, main landmark, language, title, and image alt text all present.
- Live Playwright axe checks found zero violations on `/`, `/demo/`, `/privacy/`, `/terms/`, and the designed missing route.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 930 ms, CLS 0.00013, total transfer 28,287 B. Report: `/work/.evidence/lighthouse-mobile-repair-2.json`.
- Live headers include immutable hashed assets, no-cache service worker, `Referrer-Policy: no-referrer`, permissions restrictions, CSP with `frame-ancestors 'none'`, and `X-Frame-Options: DENY`.
- The product-specific 404 intentionally returns HTTP 404. Chromium reports that navigation status as a console resource message; the designed page, structure, assets, and return links all work.

## Earlier-review disposition

| Earlier finding | Current disposition |
| --- | --- |
| Missing sample demo and sandbox | Fixed and claim-tested in browser and CLI. |
| Missing claims manifest | Fixed; 24 current claims have one tagged sandbox test each. |
| Apple macOS 13 false positive | Fixed; supported rule starts at macOS 14. |
| Malformed version matching | Fixed; invalid values return exit 1. |
| Usage/preview exit collision | Fixed; invalid invocation returns exit 1. |
| Invalid platform accepted | Fixed; Clap accepts only linux, windows, or macos. |
| Generic broken 404 | Fixed; product page and deliberate 404 response deployed. |
| First-screen plain words and facts | Fixed. |
| Mobile targets below 44 px | Fixed and browser-measured. |
| Missing metadata/navigation/footer | Fixed on every route. |
| Missing CSP and anti-framing | Fixed in deployed response headers. |
| Nested complementary landmark | Fixed; live axe is clean. |
| Missing copy audit | Fixed in `.factory/copy-audit.md`. |
| Double hero image transfer | Fixed by removing the conflicting preload. |

## Known gaps

No known product gaps remain in the requested scope. `@axe-core/cli` could not locate a Selenium Chrome binary in this worker; the equivalent `@axe-core/playwright` checks ran locally and live with zero violations.

## Next steps

- Keep registry updates narrow and evidence-backed. Run `npm test` before changing a rule or public sentence.
- The CLI archive is ready to publish with `npm run package:cli`; do not publish it from this worker.
