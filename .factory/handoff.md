# RAW Fit Check v0.1.0 — independent verification handoff

## Release status: FAIL

Candidate `fa95b70bf957be224db91e9ff58c939aa724baa4` was independently verified on 2026-08-28 against `https://raw-fit-check.sociobot.in/`. Full evidence is in `.factory/verification-3.md`.

The previous deployment-only failures are repaired: the live site exactly matches the candidate build, immutable asset caching and privacy headers are correct, and a cache-only offline reload remains functional. The release still fails because fresh testing found core CLI correctness defects.

## Release blockers

1. **Unsupported evidence boundary can return `usable`.** The Sony ILCE-6700 Apple rule returns `usable` for macOS 13.0, but its cited Apple page is explicitly for macOS Sonoma/macOS 14 and contains no Ventura reference. The claimed minimum version 13 is not evidence-backed.
2. **Malformed versions can return `usable`.** `banana-4.6.0`, `4.6.0-beta`, and `4.6x` all match the darktable `>=4.6.0` rule and return exit 0 because the comparator discards nondigits.
3. **Exit-code contract collides.** Missing required options, invalid benchmark values, and unknown commands return 2, although 2 is documented as the successful `preview-only` classification and invalid input is documented as 1.

Additional defects: multiple mobile links are below 44×44 px; axe reports one moderate nested-complementary-landmark issue (zero serious/critical).

## Passing evidence

From a detached clean checkout of the candidate:

```sh
npm ci                              # PASS, 0 vulnerabilities
cargo test --locked --all-targets  # PASS, 7 tests
npm test                            # PASS: fmt, Clippy -D warnings, unit, build policy, Playwright
npm run build                       # PASS: release CLI + dist/site
cargo package --locked              # PASS, 39 files
npm run package:cli                 # PASS, Linux x64 archive
```

- The packaged crate installed into an isolated prefix; the installed CLI, registry JSON, and a separate Rust public-API consumer worked.
- Normal CLI cases correctly exercised `usable`/0, `preview-only`/2, and `unsupported`/3; recursive folders, JSON, extraction/no-overwrite, benchmark bounds, corrupt files, missing inputs, and invalid registries were covered.
- Live HTML, JS, CSS, service worker, privacy, and terms are byte-identical to the clean build.
- Desktop 1280 px and mobile 390 px checks across `/`, `/privacy/`, and `/terms/` had no overflow, console/page errors, failed requests, or axe serious/critical findings. Keyboard file selection, visible focus, invalid-file recovery, and reduced motion passed.
- Privacy passed: same-origin-only runtime requests; no cookies, analytics, local/session storage, IndexedDB, uploads, remote fonts/scripts, or persisted RAW/report data.
- Service-worker update and cold-cache offline reload passed; the offline checker still decoded the representative RAW preview.
- Live response policy passed: HTTPS redirect, one-year immutable caching for hashed assets, `no-cache` worker, HSTS, `nosniff`, `no-referrer`, and camera/microphone/geolocation restrictions.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,087 ms, TBT 50.5 ms, CLS 0, transfer 119,689 B.
- Payload: JS 7,248 B (3,349 B gzip), CSS 10,060 B (3,038 B gzip), no fonts, images within budget.

## Next steps

Correct/narrow the Apple OS rule with stable evidence and increment the registry version; validate versions before matching; remove the parser/verdict exit-code collision; enlarge mobile hit areas; then deploy and repeat the package, evidence, browser, offline, and Lighthouse checks from `.factory/verification-3.md`.

No product code was modified during verification. Do not publish the CLI until the M1 defects are repaired and independently re-verified.
