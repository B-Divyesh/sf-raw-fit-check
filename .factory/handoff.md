# RAW Fit Check v0.1.0 — verification handoff

## Release status: **FAIL**

Independent verification completed 2026-08-28 on candidate commit `a26ed95792ce3593cee6374e4fee400424c546b2` and live URL `https://raw-fit-check.sociobot.in/`. See `.factory/verification-2.md` for exact commands and evidence.

The core Rust CLI, the package artifact, the static production build, and the visible live site all work. The live document is byte-for-byte identical to the fresh `dist/site/index.html`; accessibility, privacy/outbound-request, keyboard, mobile, interaction, warm offline, and Lighthouse checks passed.

This is nevertheless a release **FAIL**:

1. `cargo clippy --all-targets -- -D warnings` fails on two source warnings.
2. The PWA fails a cold functional offline reload: after HTTP cache is cleared, its worker does not have hashed JS/CSS precached, resource loads fail, and the local-file checker stays disabled.
3. Production ignores the shipped immutable caching and privacy/security response-policy rules: hashed assets receive only 30-second caching; `no-referrer` and Permissions-Policy are absent/drifted.

## Commands that passed

```sh
npm ci
cargo fmt --check
cargo test
npm test
npm run build
cargo package
npm run package:cli
```

The crate was also unpacked and installed into a clean consumer prefix. Its `--help`, `registry --json`, successful registry-supported RAW flow, preview-only boundary, explicit unsupported rule, extraction, JSON, and invalid-input exit paths were exercised successfully.

## Required next steps

- Resolve both Clippy diagnostics and require a clean lint run.
- Precache versioned Vite JS/CSS assets and re-test the local file checker offline with HTTP cache cleared.
- Correct production cache and response-header configuration, then re-run live verification.

No product code was changed by the verifier. Do not publish the package or promote this deployment until the defects in `.factory/verification-2.md` are resolved.
