# Verification 3 — FAIL

**Independently verified 2026-08-28 against candidate `fa95b70bf957be224db91e9ff58c939aa724baa4`.**

- Repository: `https://github.com/B-Divyesh/sf-raw-fit-check.git`, branch `main`
- Live URL: `https://raw-fit-check.sociobot.in/`
- Acceptance contract: `.factory/brief.json`, root `AGENTS.md`, and the supplied CLI, accessibility, design, and performance requirements
- Result: **FAIL**. The previous deployment-only defects are repaired and the build, package, browser, offline, privacy, accessibility, and performance gates largely pass. Fresh end-to-end testing found release-blocking CLI correctness and automation defects, including a `usable` claim whose cited evidence does not establish the claimed OS version.

No product code was changed during this verification.

## Candidate and clean-checkout evidence

The repository worktree began clean at the exact candidate SHA. All executable checks ran in a new detached worktree created with:

```sh
git worktree add --detach /tmp/raw-fit-check-qa.zGId1a \
  fa95b70bf957be224db91e9ff58c939aa724baa4
```

Toolchain: Node `22.23.2`, npm `10.9.8`, rustc/cargo `1.98.0`.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 20 packages installed, 0 vulnerabilities |
| `cargo test --locked --all-targets` | PASS — 4 library tests + 3 CLI integration tests |
| `npm test` | PASS — `cargo fmt --check`, Clippy with warnings denied, 3 browser-analyzer tests, site production build, build-policy tests, and repository Playwright suite |
| `npm run build` | PASS — release CLI plus `dist/site/` |
| `cargo package --locked` | PASS — 39 files; crate 161,530 B |
| `npm run package:cli` | PASS — Linux x64 archive 502,963 B |

There is no separate JavaScript type-check script. Rust formatting and typed linting are part of `npm test` and passed.

The release binary is 1,046,640 B. The binary extracted from `dist/raw-fit-check-0.1.0-linux-x64.tar.gz` had the same SHA-256 as `target/release/raw-fit-check` (`71a7a2a08edcb0faaa930eeff35b161ce2636c92c3e2fb3aaf0b36310b0455b9`).

## Package and clean-consumer evidence

The packaged crate was unpacked outside the repository and installed into an isolated prefix:

```sh
tar -xzf target/package/raw-fit-check-0.1.0.crate -C /tmp/rawfit-consumer.YNRwBU/crate
cargo install \
  --path /tmp/rawfit-consumer.YNRwBU/crate/raw-fit-check-0.1.0 \
  --root /tmp/rawfit-consumer.YNRwBU/install --locked
```

The installed CLI reported `raw-fit-check 0.1.0`; `--help` documented the real workflow and local-only behavior. `registry --json` returned schema 1, registry version `2026.08.1`, four rules, and nonempty HTTPS evidence URLs/access dates for all four.

A separate clean Rust consumer compiled against the unpacked package and exercised the public library API (`load_registry`, `is_raw_path`, and `Verdict::exit_code`); it completed with `public API smoke: 4 rules`.

## CLI product-flow evidence

I generated two minimal TIFF-based camera specimens with real decodable 32×24 JPEG previews: Sony `ILCE-6700` `.ARW` and Nikon `NIKON Z 6_2` `.NEF`. These exercise metadata extraction, preview discovery/decoding, registry matching, version/platform boundaries, JSON, recursion, extraction, and exit codes without distributing proprietary sensor data.

| Case | Observed | Exit |
| --- | --- | ---: |
| Sony + darktable 4.6.0/Linux, 1 benchmark run, preview extraction | `usable`; exact rule/evidence; camera/container/32×24 preview reported | 0 |
| Sony + darktable 999.999/Linux, 25 benchmark runs | `usable` | 0 |
| Sony + darktable 4.5.99/Linux | `preview-only` | 2 |
| Sony + Apple Photos/macOS 12.99 | `unsupported` | 3 |
| Sony + Apple Photos/macOS 13.0 | `usable` | 0 |
| No editor | `preview-only` | 2 |
| Unknown editor | `preview-only` | 2 |
| Corrupt `.DNG` without a JPEG | `unsupported` | 3 |
| Recursive folder with corrupt DNG + valid Nikon/Sony | three sorted reports; overall `unsupported` | 3 |
| Duplicate file path | deduplicated to one report | 0 |
| Second extraction to the same directory | wrote `sony-preview-2.jpg`; did not overwrite | 2 |
| Missing path | actionable error | 1 |
| `.txt` input or empty folder | actionable supported-extension error | 1 |
| Invalid registry JSON / schema 2 / missing registry path | actionable error | 1 |
| Benchmark bounds 1 and 25 | accepted | expected verdict |
| Benchmark values 0 and 26 | Clap usage error | 2 |
| Missing paired `--editor` or `--editor-version` | Clap usage error | 2 |

The `usable` specimen JSON correctly included `SONY`, `ILCE-6700`, `TIFF-based RAW`, preview offset/size/dimensions/timing, `darktable-4.6-sony-ilce-6700`, and its evidence URL. CLI/library source review found no networking implementation; evidence URLs are output data only.

## Registry evidence audit

All four evidence URLs returned HTTP 200 during this run. The darktable pages contain `Sony ILCE-6700` and `Nikon Z 6_2` in the cited release notes. The Apple Monterey page contains no `Sony Alpha ILCE-6700`, consistent with the explicit Monterey exclusion.

The positive Apple rule is not supported by its cited page, however. Rule `apple-raw-macos13-sony-a6700` has `min_version: 13.0` and says the evidence establishes macOS Ventura support. Fresh retrieval of `https://support.apple.com/en-us/105094` returned an archived page titled:

> Digital camera RAW formats supported by iOS 17, iPadOS 17, macOS Sonoma, and visionOS

The page contains `Sony Alpha ILCE-6700` but has zero occurrences of `Ventura`. It establishes Sonoma/macOS 14 support, not the rule's macOS 13 minimum. Despite that mismatch, the installed candidate returns `usable`/exit 0 for Apple Photos 13.0. This violates the brief's requirement that claims be versioned and evidence-backed.

## Live deployment identity and response policy

The live production artifact matches the clean candidate build byte-for-byte:

| Artifact | Local/live SHA-256 |
| --- | --- |
| `/` | `924ed589dab764a0bccf5783d8a58836efe442f669ce6e56ccd0b8f1b3028f1` |
| `/assets/main-DmKWijqK.js` | `10c5fb40d2203b576bae27e7b89d3918cc44e6fecd34171fa3cc0943b5e2a04d` |
| `/assets/style-D_9V4aAd.css` | `53370171c880abcb43097883438e57610339f849e4d35db8dfd5fcd3c282b7e3` |
| `/sw.js` | `99b199bc3d6dec9171b577570b7bcd5b9359148962ca0ae8bb89bb0bdc2561f5` |
| `/privacy/` and `/terms/` | exact local/live matches |

HTTP redirects to HTTPS. Live cache policy is correct: HTML/legal pages use `public, must-revalidate, max-age=30`; hashed JS/CSS use `public, max-age=31536000, immutable`; `sw.js` uses `no-cache`. Checked routes send HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Missing paths return 404. No CSP or anti-framing header is sent; that is noted as hardening, not treated as a release blocker for this local-only static page.

## Browser, accessibility, privacy, and offline evidence

Independent Playwright checks ran against production for `/`, `/privacy/`, and `/terms/` at 1280×800 and 390×844:

- Correct nonempty titles, `lang="en"`, exactly one `h1`, one `main`, header/footer landmarks, and no image missing alt text.
- No horizontal overflow, console errors, page errors, failed requests, or HTTP error responses.
- Runtime origins remained exactly `https://raw-fit-check.sociobot.in`; no third-party request, upload, analytics, or font/CDN request occurred.
- Axe found zero serious or critical issues on all six route/viewport combinations. It found one moderate `landmark-complementary-is-top-level` issue on the checker page.
- The first Tab exposes a 181×53 px skip link with a 4 px blue outline; Enter moves focus to `main`. Keyboard-only traversal reaches the file input, Space opens the file chooser, selection enables the button, and Enter runs the check. The file input's parent has the designed 4 px focus outline. No trap occurred.
- A valid local `.ARW` produced `preview-only` with Sony camera ID, TIFF container, 32×24 preview, and timing. A `.txt` produced the supported-extension recovery message; selecting the valid sample again recovered successfully. Results are in a polite, atomic live region.
- With reduced motion, result animation/transition duration was `0.01ms`, iteration count 1, and scrolling was `auto`.
- Cookies, local storage, session storage, and IndexedDB remained empty after a real check. Cache Storage contained only the public app shell/assets; no RAW filename, bytes, metadata, or report was persisted.
- Service-worker `registration.update()` completed with an activated controller and no waiting worker. Cache `raw-fit-check-shell-666fc6bad482` contained both hashed JS/CSS files and all shell resources. After clearing the ordinary browser cache and going offline, the live page reloaded and diagnosed the valid `.ARW` with no request, console, or page errors.

`/opt/fleet/lib/verify-url.sh` passed production: HTTP 200, 818 ms load, no console/page errors, title/lang, one `h1`, main landmark, no missing alt, and no unlabeled button.

### Mobile touch targets

At 390 px, several visible links do not meet the supplied 44×44 CSS px target rule. Examples on `/` are the 160×32 header home link, the 358×24.8 source link, and the Privacy/Terms/GitHub footer links at about 24.8 px high. The legal routes repeat the 32 px home link and 24.8 px footer links. There is adequate page reflow, but the hit-area contract is not met.

## Performance and bundle budgets

Fresh Lighthouse 13 mobile production results (simulated throttling):

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP / LCP | 1,087 ms / 1,087 ms |
| TBT | 50.5 ms |
| CLS | 0 |
| Speed Index | 1,721 ms |
| Total transfer | 119,689 B |

Bundle sizes are well within contract: JS 7,248 B raw / 3,349 B gzip; CSS 10,060 B raw / 3,038 B gzip; responsive hero 17,066 B; desktop hero 91,812 B; no font payload. The mobile page currently fetches both hero variants because the desktop image is preloaded while `srcset` selects the mobile image, but the total remains far below budget.

## Defects by severity

### M1 — Apple/macOS 13 `usable` verdict is not supported by the cited evidence

`apple-raw-macos13-sony-a6700` claims macOS 13/Ventura support, but the cited current Apple page is explicitly for macOS Sonoma and contains no Ventura reference. The candidate nevertheless returns `usable`/0 for a Sony ILCE-6700 sample with `--editor apple-photos --editor-version 13.0 --platform macos`. A false positive in the evidence-backed decision path defeats the core job-to-be-done.

### M1 — malformed or prerelease editor versions can produce false `usable` results

Version comparison extracts up to four digit groups and ignores all other characters. The following all matched the darktable `>=4.6.0` rule and returned `usable`/0:

```text
banana-4.6.0
4.6.0-beta
4.6x
```

An entirely nonnumeric `banana` becomes `preview-only`/2 instead of an invalid-input error. Inputs must be validated before registry matching; prerelease semantics must be conservative unless a rule explicitly covers them.

### M1 — usage errors collide with the documented `preview-only` exit code

README documents exit 1 for invalid input and exit 2 for `preview-only`. Clap returns 2 for missing paired editor/version options, out-of-range benchmark values, and unknown commands. Thus an invocation that never performed a diagnosis is indistinguishable by exit status from the product's `preview-only` verdict, breaking the promised scripting contract.

### M2 — mobile links miss the 44×44 target baseline

Multiple persistent navigation/source/legal links measure 24.8–41.8 px high at 390 px. Increase their padding/minimum block size without disturbing reflow.

### M3 — one moderate axe landmark finding

The result-panel `aside` triggers `landmark-complementary-is-top-level` on the checker. Serious/critical findings remain zero; naming or changing the nested landmark would remove the moderate finding.

## Required remediation and re-verification

1. Correct or narrow the Apple rule to the exact OS versions established by stable evidence; increment the registry version and add regression coverage at both sides of every OS boundary.
2. Parse and validate editor versions explicitly. Reject malformed values and treat prereleases conservatively; add false-positive tests for typo/suffix inputs.
3. Normalize parser/usage failures to exit 1 (or change the documented verdict codes without collisions) and test every invalid invocation.
4. Expand mobile link hit areas to at least 44×44 px and rerun the 390 px audit.
5. Re-run the packaged consumer, evidence audit, production identity check, axe, offline cold reload, and Lighthouse after deploying the corrected candidate.
