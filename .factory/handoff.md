# RAW Fit Check v0.1.0 — handoff

## What shipped

- Rust single-binary CLI with recursive file/folder input, helpful `--help`, human and `--json` output, CI-safe behavior, stable exit codes, preview extraction without overwrites, and a local JPEG decode benchmark.
- Conservative RAW inspection for common camera extensions. The implementation reads TIFF/EXIF camera IDs, compression and DNG version where present, recognizes ISO BMFF containers, and scans/decode-checks embedded JPEGs without interpreting proprietary sensor data.
- Versioned JSON compatibility registry with evidence URLs and access dates. Initial claims cover the brief's Sony ILCE-6700 and Nikon Z6 II cases across darktable and Apple RAW support. Custom reviewed registries are accepted with `--registry`.
- Static Vite site at `dist/site/` with a functional local-only browser preflight, empty/loading/error/offline states, install and usage docs, clear verdict semantics, privacy and terms pages, and a versioned service-worker cache.
- Product-specific neo-brutalist field-utility design. The original factory-generated contact-sheet workbench art is recorded in `.factory/design.md` and `.factory/raw-bench-generation.json`; responsive WebP outputs are 17 KB and 90 KB.
- README, MIT License, changelog, package script, cache/security header hints, robots and sitemap files.

## Verification performed

All checks passed on 2026-08-28:

```sh
cargo fmt --check
cargo test
npm test
npm run build
cargo package
npm run package:cli
```

- Rust: 7 tests passed (4 core/unit, 3 CLI integration); doc tests passed.
- Browser: 3 unit tests plus Playwright smoke tests at 390 px for `/`, `/privacy/`, and `/terms/`; one `<h1>` and `<main>` per page; no console/page errors; zero serious or critical axe violations; invalid-file error flow passed.
- Build output: `dist/site/index.html` at the deploy root; initial JS 7.25 KB, CSS 10.06 KB, hero 17 KB at 720w / 90 KB at 1440w. Release CLI is 1.0 MB.
- Lighthouse 13 mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.2 s, CLS 0, total blocking time 0 ms. INP is not available in a synthetic no-interaction run; the interaction smoke path passed.
- Registry evidence URLs returned HTTP 200 and camera names were checked against the cited vendor/release pages.
- `cargo package` produced a verified crate (`target/package/raw-fit-check-0.1.0.crate`). `npm run package:cli` produced `dist/raw-fit-check-0.1.0-linux-x64.tar.gz`. Do not publish here; factory credentials own publishing.

## Run and deploy

```sh
npm ci
npm test
npm run build:site
```

Deploy exactly `dist/site/`. For the CLI, `cargo build --release` produces `target/release/raw-fit-check`; run `raw-fit-check --help` for the workflow.

## Known boundaries and next steps

- The initial registry intentionally has only four narrow rules. Unknown camera/editor combinations return `preview-only`, not a guessed full-support claim. Expand through evidence-reviewed contributions.
- The preview scanner reads one file at a time into memory. The browser quick check caps files at 512 MB; the CLI has no arbitrary cap. A future large-file streaming scanner would further reduce memory pressure.
- Some ISO BMFF/CR3 files store previews in structures that are not exposed as a contiguous JPEG, so they may conservatively report unsupported. Adding a licensed container parser is the next compatibility expansion.
- A usable verdict proves an embedded preview plus a registry match; users are still told to test one real edit/export. The tool does not develop RAW sensor data or recommend hardware.
- The packaged archive produced in this environment is Linux x64. Release automation should build the same binary for macOS and Windows before public distribution.
