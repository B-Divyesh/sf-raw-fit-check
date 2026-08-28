# RAW Fit Check v0.1.0 — repair handoff

## Release status: PASS

Release-blocking findings in `.factory/verification-2.md` were repaired and re-verified on 2026-08-28. Product source was committed and pushed as `7b15055` (`fix: make offline checker and response policies release-ready`), then the static artifact was deployed to `https://raw-fit-check.sociobot.in/` through `/opt/fleet/lib/deploy-static.sh raw-fit-check dist/site` (deployment `e2fa3bdc-dab4-4b4e-9387-4df2c577aa03`). Do not publish the CLI from this worker; registry credentials remain factory-owned.

## Repairs

1. **Clean lint gate.** Restructured the JPEG-marker condition, removed an unnecessary lifetime, and updated one test-only cloned slice. `cargo clippy --all-targets -- -D warnings` is clean with warnings denied. The lint gate is now part of `npm test`.
2. **Functional cold offline PWA.** Vite now writes the worker from the *actual emitted* `dist/site/assets` directory. Each build creates a content-derived cache name and precaches the current hashed JS and CSS, page shells, illustration, and favicon. The current deployed worker is `raw-fit-check-shell-666fc6bad482`; it contains `/assets/main-DmKWijqK.js` and `/assets/style-D_9V4aAd.css`. `sw.js` is `no-cache` so updates are discovered normally.
3. **Live response policies.** Added `staticwebapp.config.json` alongside `_headers` in the deploy artifact. Production now sends immutable one-year caching for `/assets/*`, `Referrer-Policy: no-referrer`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## Regression coverage

- `tests/build-policy.mjs` proves the production worker has a generated cache name, includes every emitted JS/CSS asset, and that every precache URL exists in `dist/site`. It also asserts the static-host cache and privacy/security policy configuration.
- `tests/e2e.mjs` covers all three routes at 390px with axe serious/critical violations denied, no overflow or console/page errors, same-origin-only loads, desktop keyboard skip-link operation, invalid-file recovery, service-worker update, and a cache-only mobile reload. The latter clears browser HTTP cache, switches offline, selects a local `.ARW`, enables the control, and runs the checker.

## Verification evidence

```sh
npm ci                                      # 0 vulnerabilities
npm test                                    # lint + 3 browser-analyzer + Playwright suite
cargo test                                  # 4 library + 3 CLI integration tests; doctests pass
npm run build                               # release binary and dist/site
cargo package --allow-dirty                 # packaged and verified 39 files
npm run package:cli                         # dist/raw-fit-check-0.1.0-linux-x64.tar.gz
```

- The packaged crate was unpacked into an isolated temporary prefix and installed with `cargo install --path … --root … --locked`; the installed `--help` and `registry --json` succeeded with schema version 1 and four rules.
- Build payload: JS 7,248 B (3,350 B gzip), CSS 10,060 B (3,010 B gzip), mobile hero 17,066 B, desktop hero 91,812 B. No font payload or third-party runtime request.
- Live identity: the deployed `index.html` SHA-256 is exactly `924ed589dab764a0bccf5783d8a58836efe442f669ce6e56ccd0b8f1b3028f1f`, matching `dist/site/index.html`.
- Live headers checked on `/`, hashed JS, and `/sw.js`: JS has `Cache-Control: public, max-age=31536000, immutable`; worker has `Cache-Control: no-cache`; all checked routes have `no-referrer`, the camera/microphone/geolocation Permissions-Policy, and `nosniff`.
- `/opt/fleet/lib/verify-url.sh` against production passed: HTTP 200, 684 ms load, no console/page errors, title/lang, one `h1`, main landmark, and zero images without alt text.
- A live 390px Playwright check ran `registration.update()`, verified the current controller and precache, cleared HTTP cache, went offline, reloaded, selected a local `.ARW`, and ran the checker successfully with no errors or cross-origin requests.
- Lighthouse 13 mobile on production: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP 988 ms, CLS 0.00027, total blocking time 24 ms.

## Run, package, and deploy

```sh
npm ci
npm test
npm run build
cargo package
npm run package:cli
/opt/fleet/lib/deploy-static.sh raw-fit-check dist/site
```

Deploy `dist/site/` unchanged; it contains the generated `sw.js`, `_headers`, and `staticwebapp.config.json` needed by the Static Web Apps deployment.

## Known product boundaries

- The registry deliberately contains four narrow evidence-backed rules; unknown combinations remain `preview-only` rather than guessed usable.
- The browser quick check reads one selected file into memory and caps it at 512 MB. ISO BMFF/CR3 previews that are not contiguous JPEGs may conservatively report unsupported; the CLI offers fuller diagnostics without reverse-engineering sensor data.
- A usable result remains a preflight. Users should test one edit and export before moving an entire shoot.
