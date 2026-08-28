# Verification 2 — FAIL

**Verified 2026-08-28 against candidate `a26ed95792ce3593cee6374e4fee400424c546b2`.**

- Repository: `https://github.com/B-Divyesh/sf-raw-fit-check.git`, branch `main`
- Live URL: `https://raw-fit-check.sociobot.in/`
- Result: **FAIL**. The core CLI and live web experience work, but the candidate fails its lint quality gate and the PWA is not functionally offline after the ordinary browser cache is cleared. The deployed response policies also do not match the checked-in policy file.

## Clean-checkout build and package evidence

Starting state was clean and `git rev-parse HEAD` was exactly the candidate SHA. `npm ci` completed with 0 vulnerabilities.

| Check | Result |
| --- | --- |
| `cargo fmt --check` | PASS |
| `cargo test` | PASS — 4 library tests, 3 CLI integration tests, 0 doctests failed |
| `npm test` | PASS — 3 browser-analyzer tests; production site build and supplied Playwright smoke test passed |
| `npm run build` | PASS — release Rust binary and `dist/site/` produced |
| `cargo package` | PASS — `target/package/raw-fit-check-0.1.0.crate` produced |
| `npm run package:cli` | PASS — `dist/raw-fit-check-0.1.0-linux-x64.tar.gz` produced |
| `cargo clippy --all-targets -- -D warnings` | **FAIL** — `clippy::collapsible_if` at `src/lib.rs:459` and `clippy::needless_lifetimes` at `src/lib.rs:639` |

No standalone TypeScript checker or lint script is defined in `package.json`; the Rust lint above is available and fails under warnings-as-errors.

The resulting first-load static assets are comfortably within budget: JS 7,248 B (3,350 B gzip), CSS 10,060 B (3,010 B gzip), mobile hero WebP 17,066 B, and desktop hero WebP 91,812 B. There are no font files.

## CLI consumer and product-flow evidence

I installed the packaged crate into an isolated temporary consumer prefix with:

```sh
tar -xzf target/package/raw-fit-check-0.1.0.crate -C /tmp/rawfitqa.XXXXXX/crate
cargo install --path /tmp/rawfitqa.XXXXXX/crate/raw-fit-check-0.1.0 \
  --root /tmp/rawfitqa.XXXXXX/install --locked
```

The installed binary's `--help` and `registry --json` worked; registry JSON had schema version 1 and four evidence-backed rules. A synthetic TIFF-based Sony `ILCE-6700` `.ARW` containing a real decodable JPEG preview exercised the public CLI end-to-end:

| Case | Expected / observed verdict | Exit |
| --- | --- | --- |
| darktable 4.6.0 on Linux, preview extraction, one benchmark run | `usable` | 0 |
| darktable 4.5.9 (below 4.6.0 boundary) | `preview-only` | 2 |
| Apple Photos/macOS 12.7 exclusion rule | `unsupported` | 3 |
| no editor supplied | `preview-only` | 2 |
| missing `.NEF` | actionable error | 1 |
| `.txt` path | actionable no-supported-RAW error | 1 |

This validates the brief's usable / preview-only / unsupported classification, registry matching, JSON surface, extraction, benchmark option, boundary version handling, and invalid-input recovery. It also confirms the CLI has no runtime network dependency in these paths.

## Site, accessibility, privacy, and live-deployment evidence

The fresh build's `dist/site/index.html` SHA-256 is exactly the live document SHA-256:

```text
e033538a3f077f0ccd540c19a497b31e7012a9e03ebb488097ef8ef40903b830
```

The live document references the same `main-DmKWijqK.js` and `style-D_9V4aAd.css` files generated locally. On both the fresh production preview and the live URL, automated Playwright checks passed at desktop 1280px and mobile 390px for `/`, `/privacy/`, and `/terms/`:

- Correct language, non-empty title, exactly one `h1`, and one `main` per route.
- Zero axe serious or critical violations, zero console errors, zero page errors, and no horizontal overflow.
- No runtime third-party/outbound requests; request origins remained the page's own origin. Source review found no analytics, telemetry, cookies, browser storage, uploads, remote fonts, or runtime CDN scripts. The only external URLs are user-activated GitHub/evidence links.
- Keyboard-first check passed: first Tab reaches the skip link, its designed focus outline is visible, and the skip target is `#main`.
- `prefers-reduced-motion: reduce` reduced the result animation to 0.01 ms.
- A valid local RAW test file produced the expected browser `preview-only` result; a `.txt` input produced the supported-extension error and recovered with no page error.
- Live service-worker registration and `registration.update()` passed: active controller, scope `/`, cache `raw-fit-check-shell-v1`, no waiting worker.
- A normal warm offline reload passes.

Lighthouse 13 mobile against the live URL: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP 905 ms, CLS 0.00027, TBT 27 ms. (The initial run required the Playwright Chromium path plus `--disable-dev-shm-usage`; the successful report is from that retry.)

## Defects

### M1 — Rust lint gate fails

`cargo clippy --all-targets -- -D warnings` does not pass. It reports a collapsible nested `if` at `src/lib.rs:459` and needless explicit lifetimes at `src/lib.rs:639`. This violates the required clean quality gate and prevents an unqualified release PASS.

### M1 — PWA cold offline reload is not a functional checker

`site/public/sw.js` precaches `/`, legal pages, hero image, and favicon, but not the hashed `/assets/main-DmKWijqK.js` and `/assets/style-D_9V4aAd.css` files. Fresh evidence: after installing/activating the live worker, clearing the ordinary browser HTTP cache (while retaining Cache Storage), switching offline, and reloading, the document shell rendered but three resources failed with `net::ERR_FAILED`. Selecting a local `.ARW` then left `#inspect-button` disabled because the application JavaScript had not loaded.

This contradicts the privacy page's claim that the checker remains available offline and fails the requested functional offline-reload check. The previous warm-reload result is not sufficient because it relies on ordinary browser cache or dynamically cached assets.

### M2 — deployed cache and privacy/security response policies drift from the shipped policy file

The live HTML matches the candidate exactly, but all checked live paths (`/`, hashed JS/CSS, `/sw.js`, `/privacy/`, `/terms/`) return `Cache-Control: public, must-revalidate, max-age=30`. This fails the required long-lived immutable caching for hashed assets and differs from checked-in `dist/site/_headers`, which specifies `max-age=31536000, immutable` for `/assets/*`.

The deployment also returns `Referrer-Policy: strict-origin-when-cross-origin` rather than the checked-in `no-referrer`, and omits the checked-in `Permissions-Policy: camera=(), microphone=(), geolocation=()`. HSTS and `X-Content-Type-Options: nosniff` are present. The deployment must be configured to honor the supplied header rules (or equivalent infrastructure policy) before release.

## Required remediation and re-verification

1. Make `cargo clippy --all-targets -- -D warnings` clean.
2. Precache the hashed build JS and CSS (or generate the precache manifest during the Vite build), version that cache, and re-test an offline reload after clearing HTTP cache; selecting a local file must still enable and run the checker.
3. Configure the production host to send immutable caching for hashed assets and the intended `no-referrer` and Permissions-Policy headers, then re-check live headers.

No product source code was changed during this verification. Only this report and the handoff were updated.
