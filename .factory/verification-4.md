# Verification 4 — Check RAW compatibility before changing editors

## Verdict: FAIL

- Findings: **2**
- Untested public claims: **3**
- Candidate implementation: `c8e457aa565dddd5cdb0315c97cbb27b491f3a8d`
- Documentation baseline: `1071668a6272f5fe383b19096c69b25a4651997e`
- Live URL: `https://raw-fit-check.sociobot.in`
- Verified: 5 September 2026

The product works end to end, the deployed files match the implementation candidate, all 24 declared claim commands pass, and the main quality gates pass. It does not qualify for PASS because three public claims are absent from the claim manifest and two legal-page links still miss the required 44 px touch height.

No product code was changed during this verification.

## First screen before scrolling

- **Job:** check RAW compatibility before changing editors.
- **Audience:** photographers on older or modest computers deciding whether a camera file will work.
- **First action:** `Try it with sample data`; the adjacent text says it loads a Sony sample and shows its local report.

Fresh 1280×900 and 390×844 contexts showed all three before scrolling. The first screen also showed the three short facts: files stay in the browser, offline use after the first visit, and free use. Screenshots are `/work/.evidence/desktop-first-screen.png` and `/work/.evidence/phone-first-screen.png`.

## Findings

### M1 — Three public claims are missing from the claim manifest

The 24 entries in `.factory/claims.json` all pass, but the public product still makes three additional promises without the required one-to-one manifest entry and tagged sandbox test:

1. The landing page says it finds the **largest embedded JPEG**. The only related unit test uses one JPEG candidate, so it does not prove selection among candidates. A manual two-candidate check selected the larger image, but manual evidence does not replace a declared claim test.
2. Installed `raw-fit-check --help` says **“Files never leave this computer.”** `browser-private-file` covers the browser, while `cli-read-only` checks the input hash and hardware-advice text. Neither tests CLI network behavior.
3. The same CLI help says **“sensor data is not developed.”** No manifest entry or tagged test covers that behavior.

These promises appear in the live page or installed artifact, so they are public claims. They are not false in the paths inspected: source and dependency review found no CLI network implementation or sensor-development path. They remain untested under the required claims contract.

### M2 — Two legal-page links are shorter than 44 px on a phone

At 390 px, the inline `GitHub project repository` link on `/privacy/` measures 293.48×41.80 CSS px. The inline `MIT License` link on `/terms/` measures 306.83×41.80 CSS px. Both are visible interactive targets with no padding or minimum height.

Header and footer links now meet 44×44 px, and the 1×1 file input is correctly operated through a much larger labeled drop zone. The remaining two inline links still fail the supplied accessibility baseline that every touch target be at least 44 px.

## Clean checkout, build, and package

Verification used a fresh clone at `/tmp/raw-fit-check-v4.wxytEv`. Its initial HEAD was the documentation baseline, and the worktree was clean. Node was 22.23.2, npm was 10.9.8, and Rust/Cargo was 1.98.0.

| Check | Result |
| --- | --- |
| `npm ci --include=dev` | PASS — 20 packages installed, 0 vulnerabilities |
| `npm test` | PASS — format, Clippy, 4 Rust library tests, 3 CLI tests, 3 browser unit tests, build policy, browser E2E, 24 claims, and consumer install |
| `npm run build` | PASS — release binary and `dist/site/` produced |
| `npm run package:cli` | PASS — 517,043-byte Linux x64 archive produced |
| `cargo package --locked` | PASS — crate packaged and verified |

The production JS is 8,106 bytes and CSS is 11,435 bytes. The phone hero is 17,066 bytes, the desktop hero is 91,812 bytes, and there are no font files. The 1200×630 social image and 180×180 touch icon have the required dimensions.

## Declared claim commands

Every `test` command in `.factory/claims.json` was run separately from the fresh clone. This was in addition to the aggregate `npm test` run.

| Claim ID | Result | Observable evidence |
| --- | --- | --- |
| `demo-one-click` | PASS | Primary action opened a populated Sony ILCE-6700, 320×240 report. |
| `demo-sandbox` | PASS | Label, reset, `demo:` session key, and real-mode exit passed. |
| `browser-raw-extensions` | PASS | All ten listed extensions reached a report. |
| `browser-local-inspection` | PASS | Container, camera, preview dimensions, and timing appeared. |
| `browser-conservative-result` | PASS | Browser returned preview-only and directed the user to the CLI. |
| `browser-private-file` | PASS | No upload request or persisted filename/report was observed. |
| `browser-offline` | PASS | Demo reloaded and checked the sample offline. |
| `browser-no-third-parties` | PASS | Requests stayed same-origin and cookies stayed empty. |
| `free-demo` | PASS | No account or payment step appeared. |
| `cli-demo` | PASS | Demo wrote and reported its sample and preview folder. |
| `cli-recursive` | PASS | A nested RAW file was found and checked. |
| `cli-preview-extraction` | PASS | A second extraction created a new file instead of overwriting. |
| `cli-benchmark-bounds` | PASS | Runs 1 and 25 were accepted. |
| `cli-json` | PASS | JSON parsed with the documented stable top-level fields. |
| `cli-custom-registry` | PASS | A copied reviewed registry was accepted. |
| `cli-registry-evidence` | PASS | All rules had HTTPS evidence, dates, and numeric bounds. |
| `cli-exact-input` | PASS | Malformed versions, platforms, benchmark bounds, and schema failed with exit 1. |
| `cli-exit-codes` | PASS | Usable 0, invalid 1, preview-only 2, and unsupported 3 were distinct. |
| `cli-ci` | PASS | Empty stdin did not block `--ci`. |
| `darktable-sony` | PASS | Sony ILCE-6700 matched darktable 4.6/Linux. |
| `darktable-nikon` | PASS | Nikon Z 6_2 matched darktable 3.6/Linux. |
| `apple-sonoma` | PASS | Sony ILCE-6700 matched Apple Photos/macOS 14. |
| `apple-monterey` | PASS | Apple Photos/macOS 12.99 returned unsupported. |
| `cli-read-only` | PASS | The input hash stayed unchanged and no hardware advice appeared. |

Declared claim result: **24 passed, 0 failed**. Because the three public claims in M1 are not declared, the overall untested claim count is **3**.

All four registry source URLs returned 200. The Sony and Nikon camera names appeared in their positive sources. The Monterey exclusion source did not list the later Sony ILCE-6700, as expected.

## Installed CLI checks

The Linux archive was unpacked into `/tmp/raw-fit-check-artifact.UBRr3H`, outside the repository. The installed artifact reported version 0.1.0 and useful `check`, `registry`, and `demo` help. `raw-fit-check demo --json` created a new operating-system temporary directory, a 7,536-byte Sony sample, a 320×240 preview, and a usable darktable 4.6 report.

| Case | Expected exit | Observed exit |
| --- | ---: | ---: |
| darktable 4.6.0/Linux | 0 | 0 |
| darktable 4.5.99/Linux | 2 | 2 |
| Apple Photos 12.99/macOS | 3 | 3 |
| Apple Photos 13.0/macOS gap | 2 | 2 |
| Apple Photos 14.0/macOS | 0 | 0 |
| no editor | 2 | 2 |
| three malformed versions | 1 | 1 each |
| invalid platform | 1 | 1 |
| benchmark 0 and 26 | 1 | 1 each |
| missing paired option | 1 | 1 |
| unknown command | 1 | 1 |
| missing file | 1 | 1 |
| corrupt DNG without a preview | 3 | 3 |
| `--ci` with empty stdin | 0 | 0 |
| valid run after invalid input | 0 | 0 |

The representative RAW hash was unchanged after checking. The clean packaged-consumer install in `npm test` also passed.

## Live browser, demo, and privacy checks

The clean production build matched the live files byte for byte for `/`, `/demo/`, `/privacy/`, `/terms/`, the designed 404 body, `sw.js`, and both hashed JS/CSS assets. Later commits changed only documentation and the E2E test, so no fresh product image is required beyond candidate `c8e457a`.

- The sample action worked in one click. The first populated view showed Sony ILCE-6700, TIFF-based RAW, a 320×240 preview, local timings, and `Preview-only`.
- The banner remained visible through reset and said `Demo — sample data, nothing is saved`.
- A seeded `real:sentinel` local-storage value remained unchanged through entry, reset, and `Start for real`. Leaving removed only `sessionStorage['demo:raw-fit-check:mode']`.
- Runtime demo requests stayed on `https://raw-fit-check.sociobot.in`, with no cookies.
- Invalid `.txt` input produced an actionable message. Selecting a valid `.ARW` next recovered to the populated report. The result uses `aria-live="polite"`.
- File selection, drag and drop, Enter activation, copy-to-clipboard, and the skip link worked. The skip link showed a 4 px blue focus outline and moved focus to `main`.
- Reduced motion changed animation and transition durations to 0.01 ms and scrolling to `auto`.
- A 640 px layout, equivalent to 200% zoom from a 1280 px desktop viewport, had no horizontal overflow or lost primary controls.
- The active service worker had no waiting update. After clearing the HTTP browser cache and going offline, `/demo/` reloaded and produced the populated sample result.

Evidence is in `/work/.evidence/live-qa.json`, `/work/.evidence/phone-demo-populated.png`, and the first-screen screenshots.

## Routes, accessibility, links, and response policy

| Route | Status | Title | Axe violations |
| --- | ---: | --- | ---: |
| `/` | 200 | `RAW Fit Check — check RAW compatibility` | 0 |
| `/demo/` | 200 | `Demo — RAW Fit Check` | 0 |
| `/privacy/` | 200 | `Privacy — RAW Fit Check` | 0 |
| `/terms/` | 200 | `Terms — RAW Fit Check` | 0 |
| `/missing-verification-4` | 404 | `Page not found — RAW Fit Check` | 0 |

Every route had `lang=en`, one `h1`, one `main`, header, navigation, footer, canonical metadata, sharing metadata, and no missing image alternative. There were no page errors or unexpected console errors. Chromium's failed-resource message for the deliberate 404 navigation is expected and is not a defect.

All same-origin links and the GitHub repository/license links returned 200. `robots.txt` and `sitemap.xml` are present. `verify-url.sh` passed in 598 ms with no errors.

Live responses send the checked-in CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, permissions restrictions, HSTS, and `nosniff`. HTML uses 30-second revalidation, hashed assets use one-year immutable caching, and `sw.js` uses `no-cache`.

Lighthouse 13 mobile results: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP 972 ms, TBT 36.5 ms, CLS 0.00013, and total transfer 28,353 bytes. Report: `/work/.evidence/lighthouse-mobile-verification-4.json`.

## Earlier finding disposition

### Review 1

| Earlier finding | Current disposition |
| --- | --- |
| M1-1 missing one-click sample and sandbox | Fixed; web and CLI demos are populated, labeled, resettable, and isolated. |
| M1-2 no claims manifest or tagged tests | Partly fixed; 24 declared tests pass, but M1 identifies three remaining public claims. |
| M1-3 unsupported Apple/macOS 13 claim | Fixed; the positive rule starts at macOS 14 and 13.0 is preview-only. |
| M1-4 malformed versions return usable | Fixed; malformed and prerelease values return exit 1. |
| M1-5 usage failures share exit 2 | Fixed; all exercised parser and usage failures return exit 1. |
| M1-6 broken generic 404 | Fixed; a product-specific page returns the deliberate HTTP 404 and has working return actions. |
| M2-1 invalid platforms accepted | Fixed; Clap restricts the platform and returns exit 1. |
| M2-2 first screen misses plain information | Fixed; job, audience, action, outcome, and three facts are visible before scrolling. |
| M2-3 mobile targets below 44 px | Partly fixed; persistent navigation/footer targets pass, but the two legal-page links in M2 remain short. |
| M2-4 route and sharing metadata missing | Fixed on all five checked routes. |
| M2-5 header/footer skeleton incomplete | Fixed on all five checked routes. |
| M2-6 CSP and anti-framing absent | Fixed in live response headers. |
| M3-1 nested complementary landmark | Fixed; all five live axe scans report zero violations. |
| M3-2 copy audit absent and long sentences | Fixed; the audit is present and its current landing sentences pass. |

### Verifications 2 and 3

| Earlier finding | Current disposition |
| --- | --- |
| Rust lint gate failed | Fixed; formatting and Clippy with warnings denied pass. |
| Cold offline reload failed | Fixed; functional demo reload passed after clearing HTTP cache. |
| Deployed cache/privacy policies drifted | Fixed; live policy matches the intended cache and privacy headers. |
| Apple/macOS 13 evidence mismatch | Fixed as described above. |
| Malformed versions accepted | Fixed as described above. |
| Invalid and preview-only exits collided | Fixed as described above. |
| Mobile targets below 44 px | Partly fixed; M2 records the remaining legal links. |
| Moderate axe landmark finding | Fixed; axe is clean. |
| Phone fetched both hero variants | Fixed; Lighthouse transfer is 28,353 bytes and the phone hero is 17,066 bytes. |

## Backend and AI checks

This product is a static site and local CLI. Tenant isolation, SQLite persistence, health endpoints, and 429/`Retry-After` behavior do not apply. The deterministic file and registry check does not benefit from a model call, so missing AI is not a finding.

## Required next work

1. Add one manifest entry and one tagged sandbox test for each of the three public claims in M1, or remove/narrow those statements.
2. Give the two inline legal links at least a 44×44 px interactive area and add them to the mobile target test.
3. Re-run all declared claim commands and the live 390 px target audit after deployment.
