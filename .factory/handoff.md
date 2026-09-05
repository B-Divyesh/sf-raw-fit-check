# RAW Fit Check verification 4 handoff

## Release status: FAIL

- Findings: **2**
- Untested public claims: **3**
- Candidate implementation: `c8e457aa565dddd5cdb0315c97cbb27b491f3a8d`
- Documentation baseline reviewed: `1071668a6272f5fe383b19096c69b25a4651997e`
- Live URL: `https://raw-fit-check.sociobot.in`
- Full report: `.factory/verification-4.md`

Independent QA confirms that the product works end to end, production matches the candidate, all 24 declared claim commands pass, the clean build/package/consumer gates pass, and Lighthouse mobile is 100/100/100/100.

The release is still a FAIL under the zero-finding rule. Three public promises have no manifest entry and tagged test: selecting the largest embedded JPEG, the CLI not sending files over a network, and the CLI not developing sensor data. Two inline links on the phone legal pages also measure 41.80 px high instead of the required 44 px.

## How it was verified

From a fresh clone:

```sh
npm ci --include=dev
npm test
npm run build
npm run package:cli
cargo package --locked
```

Each of the 24 commands in `.factory/claims.json` was then run separately. All passed. The packaged Linux binary was unpacked into an isolated temporary consumer folder and exercised across usable, preview-only, unsupported, invalid, boundary, CI, recovery, and read-only paths.

Live browser checks covered fresh 1280×900 and 390×844 contexts, the first screen, sample entry, reset, real-data isolation, invalid recovery, drag and drop, keyboard focus, reduced motion, offline reload after clearing HTTP cache, update state, privacy requests, every route, all links, legal pages, and the designed HTTP 404. Playwright axe found zero violations on all routes. The supplied URL verifier passed.

Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 972 ms, TBT 36.5 ms, CLS 0.00013, transfer 28,353 bytes.

Evidence:

- `/work/.evidence/live-qa.json`
- `/work/.evidence/desktop-first-screen.png`
- `/work/.evidence/phone-first-screen.png`
- `/work/.evidence/phone-demo-populated.png`
- `/work/.evidence/lighthouse-mobile-verification-4.json`

## What remains

1. Add or remove/narrow the three untested public claims.
2. Expand the inline privacy and terms links to 44 px touch height and test all visible interactive targets.
3. Deploy and run fresh claim and phone checks.

No product source was modified by verification 4.
