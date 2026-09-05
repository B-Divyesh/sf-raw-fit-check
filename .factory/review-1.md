# Review 1 — Check RAW compatibility before changing editors

## Verdict: FAIL

- Findings: **14**
- Untested public claims: **32**
- Live URL: `https://raw-fit-check.sociobot.in`
- Implementation reviewed: `7b15055729de4708776740963b273b30ac53fb34`
- Documentation baseline reviewed: `f8e5106dc1a8dac8d8261a3b03be74f41f6b2632`
- Review date: 5 September 2026

The live files match the implementation candidate byte for byte. Later commits only changed review and handoff documents. The build, package, local browser checker, offline cache, privacy behavior, and performance gates pass. The product fails because it has no required sample demo or claims manifest, three release-blocking CLI correctness defects remain, and the live site has unresolved accessibility and structure defects.

## First screen before scrolling

- **Job shown:** determine whether a real camera RAW is workable, preview-only, or unsupported before changing an editor or importing a shoot.
- **Audience shown:** the page implies photographers through RAW-file language and imagery. It does not name photographers on older or modest computers.
- **First action shown:** `Check a RAW sample`. It only scrolls to an empty file chooser. It does not load sample data.

The title is `RAW Fit Check — test the file before the workflow`, and the `h1` is `Test the file. Then the workflow.` Both rely on “the file” and “the workflow” instead of naming the RAW compatibility job. The first screen has one privacy fact, not the required three short privacy, offline, and price facts.

## Review setup

The repository began clean on `main` at `f8e5106dc1a8dac8d8261a3b03be74f41f6b2632`. Executable checks ran in a detached clean worktree. Node was `22.23.2`, npm was `10.9.8`, and Rust was `1.98.0`.

The implementation SHA is the newest commit affecting product files after excluding Markdown, `.factory`, and Graphify output. Fresh build hashes matched production:

| File | SHA-256 |
| --- | --- |
| `/` | `924ed589dab764a0bccf5783d8a58836efe442f669ce6e56ccd0b8f1b3028f1f` |
| `/privacy/` | `0e678aef420e1783cf670f4061aee4bd45aba832dc451bd7c9ab72c2eb97f343` |
| `/terms/` | `91e13b3907e99e16933459d94c7b5cc015eaf0a46a319ea656b3029ded62f4c3` |
| `/sw.js` | `99b199bc3d6dec9171b577570b7bcd5b9359148962ca0ae8bb89bb0bdc2561f5` |
| main JavaScript | `10c5fb40d2203b576bae27e7b89d3918cc44e6fecd34171fa3cc0943b5e2a04d` |
| main CSS | `53370171c880abcb43097883438e57610339f849e4d35db8dfd5fcd3c282b7e3` |

## Findings

### M1-1 — The required one-click sample demo does not exist

The first action scrolls to an empty file input. `/demo` returns the host's generic 404. `/?demo=1` shows `No sample selected.` The page has no persistent `Demo — sample data, nothing is saved` label, `Reset demo`, or `Start for real`. The installed CLI returns exit 2 for `raw-fit-check demo`; there is no `--demo`, bundled `examples/` sample, terminal recording of the real binary, or `.factory/demo.md`. A realistic populated demo, reset, sandbox namespace, and proof that demo use cannot touch real data are therefore unavailable.

### M1-2 — No public claim is declared or tagged

`.factory/claims.json` is missing and `rg '@claim:'` finds no tests. There are no declared claim commands to run. The 32 observable claims inventoried below therefore have no required one-to-one sandbox test, even when an ordinary unit test or this review supplies partial evidence.

### M1-3 — The Apple Photos macOS 13 usable verdict is still unsupported by its source

The installed artifact returns `usable` and exit 0 for Sony `ILCE-6700`, Apple Photos `13.0`, and macOS. The cited Apple page returns 200 and lists the camera, but it is for macOS Sonoma and contains seven `Sonoma` references and zero `Ventura` references. It does not establish the registry's macOS 13 minimum. This is a false positive in the core decision path.

### M1-4 — Malformed editor versions still return usable

`banana-4.6.0`, `4.6.0-beta`, and `4.6x` each match the darktable `>=4.6.0` rule and return `usable` with exit 0. A wholly nonnumeric `banana` returns `preview-only` with exit 2 instead of invalid input. The comparator still discards nondigits instead of validating the value.

### M1-5 — Usage failures still share the preview-only exit code

Missing `--editor-version`, `--benchmark-runs 0`, an unknown subcommand, and the absent `demo` command all return 2. README promises exit 2 only for `preview-only` and exit 1 for invalid input. Automation still cannot distinguish a completed preview-only diagnosis from a parser failure.

### M1-6 — The live 404 page is broken and not product-specific

A missing URL correctly returns HTTP 404, but the body is the Azure Static Web Apps default. It has no `h1`, `main`, product header/footer, or way back. It loads remote Azure/Bootstrap/jQuery assets, logs a failed CORS stylesheet request and failed-resource errors, and axe reports a critical missing image alternative plus three moderate structure violations. This is a defective 404 page, not a finding about the deliberate 404 status.

### M2-1 — Invalid platform values are accepted as a diagnosis

`--platform typo` is accepted and returns `preview-only`/2. Help names only `linux`, `windows`, and `macos`. This should be rejected as invalid input, with the invalid-input exit status.

### M2-2 — The first screen misses required plain information

The title and `h1` do not name RAW compatibility directly. The audience and older/modest-computer situation are absent. Only one of the three required facts appears. The first action says it checks a sample but supplies none.

### M2-3 — Mobile touch targets remain below 44 px

At 390 px, the home link is 32 px high. The source link and footer Privacy, Terms, and GitHub links are about 24.8 px high. The visually hidden 1×1 file input is operated through a large label and is not counted as a separate defect. The persistent navigation and footer targets still fail the 44×44 px baseline.

### M2-4 — Required route and sharing metadata is missing

The landing, privacy, and terms documents have no canonical link, Open Graph title/description/image, Twitter card, or 180 px apple-touch icon. No product-specific 1200×630 sharing image is present. The legal titles, language, descriptions, and favicon do pass.

### M2-5 — Header and footer do not follow the required site skeleton

The header has no Demo or Privacy link. The footer does not say `Built by Param Factory` and has no version/build ID. The sitemap cannot list the required demo because that route is absent.

### M2-6 — Required CSP and anti-framing response headers are absent

Production sends HSTS, `nosniff`, `no-referrer`, and camera/microphone/geolocation restrictions. It does not send a Content Security Policy or `frame-ancestors` response policy. The checked-in host configuration omits both as well.

### M3-1 — The existing axe landmark issue remains

The landing page's nested complementary landmark still triggers `landmark-complementary-is-top-level` at desktop and phone sizes. Privacy and terms have no axe violations.

### M3-2 — The required copy audit is absent and three sentences exceed the limit

`.factory/copy-audit.md` is missing. Automated sentence extraction found one 23-word landing sentence and one 24-word sentence on each legal page. The required hard cap is 22 words. No banned marketing words were found.

## Claims audit

The following 32 distinct public promises need exactly one `.factory/claims.json` entry and one `@claim:<id>` test each. `Untested` below means missing the required claim test; it does not erase the manual evidence noted in the last column.

| # | Public promise | Current evidence |
| ---: | --- | --- |
| 1 | `Check a RAW sample` supplies a sample | False; action only scrolls to an empty picker |
| 2 | Browser accepts the listed RAW extensions | Unit evidence; no claim test |
| 3 | Browser limit is 512 MB per file | Source only; boundary not exercised |
| 4 | Browser identifies the RAW container | Manual synthetic RAW passed |
| 5 | Browser reads camera make and model | Manual Sony sample passed |
| 6 | Browser finds embedded JPEG dimensions | Manual 32×24 sample passed |
| 7 | Browser decodes and times the preview locally | Manual sample passed |
| 8 | Browser returns conservative preview-only/unsupported results | Normal and invalid flows passed |
| 9 | The chosen file is not uploaded | Same-origin request log passed |
| 10 | Filename, metadata, and result are not persisted | Cookies and browser data stores stayed empty |
| 11 | The checker remains usable offline after first load | Cold-cache offline check passed |
| 12 | No accounts, ads, analytics, cookies, fingerprinting, or third-party runtime scripts | Product routes passed; the broken 404 loads third parties |
| 13 | CLI recursively checks files and folders | Installed artifact passed with two nested files |
| 14 | CLI extracts JPEG previews | Installed artifact passed |
| 15 | Preview extraction never overwrites | Second extraction created `-2.jpg` |
| 16 | CLI runs 1–25 local benchmark passes | Normal/boundary evidence is not claim-tagged |
| 17 | CLI emits stable JSON | Installed artifact JSON parsed |
| 18 | CLI accepts a reviewed custom registry | Invalid-schema recovery passed; no claim test |
| 19 | Every built-in rule has a date, source, and version range | Structurally present; Apple evidence is false |
| 20 | Matching is exact for camera, editor, version, and platform | False for malformed versions; invalid platform accepted |
| 21 | Exit codes are 0 usable, 2 preview-only, 3 unsupported, 1 invalid | False for parser/usage failures |
| 22 | `--ci` has no prompts | Source/help evidence only |
| 23 | CLI makes no network or telemetry requests | Source/manual evidence; no claim test |
| 24 | Sensor data is not developed or reverse-engineered | Source/manual evidence; no claim test |
| 25 | The product is free | Site/repository evidence; no claim test |
| 26 | Rust 1.85+ produces a single installable binary | Clean build and install passed |
| 27 | Sony ILCE-6700 is usable in darktable 4.6+ | Installed boundary passed; no claim test |
| 28 | Nikon Z 6_2 is usable in darktable 3.6+ | Existing unit/earlier evidence only; no claim test |
| 29 | Sony ILCE-6700 is usable in Apple Photos on macOS 13+ | False; source establishes Sonoma, not Ventura |
| 30 | Sony ILCE-6700 is unsupported in Apple Photos through macOS 12.99 | Installed boundary and source absence checked; no claim test |
| 31 | The tool does not recommend hardware | Copy/source evidence only |
| 32 | The browser uses the same conservative header/preview checks as the CLI | Similar behavior observed; no equivalence test |

## End-to-end evidence

### Clean checkout and package

| Command | Result |
| --- | --- |
| `npm ci` | PASS on the repeat clean install; 20 packages, 0 vulnerabilities |
| `cargo test --locked --all-targets` | PASS; 4 library and 3 CLI tests |
| `npm test` | PASS; format, Clippy, unit, build-policy, and Playwright checks |
| `npm run build` | PASS; release CLI and `dist/site/` |
| `cargo package --locked` | PASS; package verified |
| `npm run package:cli` | PASS; Linux x64 archive |
| clean `cargo install --path ... --locked` | PASS; installed `raw-fit-check 0.1.0` outside the repository |

On the first dependency attempt, `npm ci` exited 0 but the next `npm test` could not find Vite and `npm ls` showed all three dev dependencies missing. `npm ci --include=dev` repaired that run. A later exact `npm ci && npm ls && npm test` passed, so the anomaly was not reproducible and is not counted as a product finding.

The installed artifact passed normal `usable`/0, `preview-only`/2, and `unsupported`/3 paths using a TIFF-based Sony sample with a decodable 32×24 JPEG. It also passed recursive input, missing input, wrong extension, invalid registry schema, JSON parsing, extraction, and no-overwrite recovery. The invalid cases in M1-4, M1-5, and M2-1 failed their contracts.

### Live browser, accessibility, and privacy

- Fresh Chromium contexts covered 1280×800 desktop and 390×844 phone layouts.
- Product routes had one `h1`, one `main`, `lang=en`, no missing image alternatives, no overflow, no page errors, and same-origin runtime requests only.
- Keyboard use passed: the first Tab exposes the skip link with a 4 px blue focus ring, Enter focuses `main`, and file selection and checking work without a pointer.
- Invalid `.txt` input gave an actionable message. A valid Sony sample then recovered to a populated preview-only report.
- Reduced motion changed animations and transitions to `0.01ms`.
- A 640 px layout, equivalent to 200% zoom from a 1280 px desktop viewport, had no horizontal overflow or lost controls. The 390 px mobile layout also reflowed without overflow.
- The local check created no cookie, local/session storage, or IndexedDB entry. Cache Storage contained only the public app shell.
- Privacy and terms returned 200 and their links worked. GitHub source and license links returned 200. Privacy requests are directed to the public repository; the product stores no account data to export or delete.
- `verify-url.sh` passed the product landing page. Axe found zero serious/critical issues on product routes, with M3-1 remaining. The designed-404 failure is recorded separately.

### Offline, update, response policy, and performance

- The active worker had no waiting update. After clearing ordinary HTTP cache and going offline, the page reloaded and decoded the representative sample.
- HTML uses 30-second revalidation, hashed assets use one-year immutable caching, and `sw.js` uses `no-cache`.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP/LCP 989 ms, TBT 56 ms, CLS 0.00027, transfer 119,719 B.
- JavaScript is 7,248 B, CSS is 10,060 B, the phone hero is 17,066 B, the desktop hero is 91,812 B, and there are no font files.
- The earlier minor observation remains: the phone fetches both hero variants because the desktop image is preloaded. The measured transfer stays inside budget, so it is not counted as a separate finding.

### Backend and AI checks

This is a static site and local CLI. Tenant isolation, SQLite restart persistence, health endpoints, rate limits, 429 responses, and live backend allowances do not apply. The job does not benefit from a model call; missing AI is not a finding.

## Earlier finding disposition

| Earlier item | Current result |
| --- | --- |
| Rust Clippy failure | Fixed; `npm test` passes |
| Cold offline checker failure | Fixed; functional cold-cache reload passes |
| Deployment cache/privacy header drift | Fixed for the previously specified headers |
| Apple/macOS 13 evidence mismatch | Open; M1-3 |
| Malformed editor versions | Open; M1-4 |
| Exit-code collision | Open; M1-5 |
| Mobile touch targets | Open; M2-3 |
| Moderate axe landmark | Open; M3-1 |
| Phone downloads both hero variants | Still present; measured within budget |
| Missing CSP/anti-framing noted as hardening | Open and required by the current contract; M2-6 |

## Required next work

1. Add the real CLI demo, bundled realistic sample, web terminal recording, sandbox controls, and `.factory/demo.md`.
2. Add `.factory/claims.json` and one tagged sandbox test for each public claim. Remove or narrow claims that cannot be proved.
3. Correct the Apple rule, validate versions and platforms, and reserve exit 1 for all invalid invocations.
4. Build and route a product-specific accessible 404 page.
5. Repair the first screen, touch targets, landmark, metadata, navigation/footer, CSP, and copy audit.
6. Deploy the implementation and repeat every claim command, package test, live identity check, browser path, offline test, and evidence-source audit.

No product code was changed during this review.
