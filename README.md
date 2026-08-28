# RAW Fit Check

RAW Fit Check is a local preflight for photographers deciding whether real camera files will be viewable on a particular editor and machine. It identifies TIFF-based RAW containers, camera metadata and embedded JPEG previews, checks a versioned evidence registry, measures preview decoding, and produces a plain-text or JSON report.

Files never leave the computer. RAW Fit Check does not develop RAW sensor data or recommend hardware; its `usable`, `preview-only`, and `unsupported` verdicts are deliberately bounded by the evidence it can inspect.

## Install

Download a release binary for your platform, or build with Rust 1.85+:

```sh
cargo install --path .
```

## Usage

Check a representative folder before importing the whole shoot:

```sh
raw-fit-check check ~/Pictures/sample \
  --editor darktable --editor-version 4.8.1
```

Save extracted previews and a machine-readable report:

```sh
raw-fit-check check DSC_0042.NEF DSC_0043.NEF \
  --editor rawtherapee --editor-version 5.10 \
  --preview-dir ./previews --json > fit-report.json
```

Inspect the transparent built-in claims and their sources:

```sh
raw-fit-check registry
raw-fit-check registry --json
```

Use a reviewed custom registry (same schema as `registry/compatibility.json`):

```sh
raw-fit-check check sample.ARW --registry team-registry.json --json
```

Registry changes should be narrow: use the exact camera make/model strings written by the file, a normalized editor slug, an explicit version range and platform list, and a first-party evidence URL with an access date. Unsupported claims require affirmative evidence or a clearly dated absence from an exhaustive vendor list. Increment `registry_version` whenever a claim changes.

Exit codes are `0` when every file is usable, `2` when any file is preview-only, `3` when any file is unsupported, and `1` for invalid input or an unreadable registry. `--ci` disables decorative output; the CLI never prompts.

## What a verdict means

- `usable`: the file contains an identifiable supported container and the selected editor/version/platform matches an evidence-backed registry rule.
- `preview-only`: RAW Fit Check can extract and decode an embedded JPEG, but full RAW support is not proven for that exact combination.
- `unsupported`: the file cannot be inspected, lacks a usable embedded preview, or a matching registry rule explicitly excludes the combination.

Start with 2–5 representative files, including each compression mode used in-camera. A green result is a preflight, not a replacement for testing edits and exports in the chosen editor.

## Develop and verify

```sh
cargo test
cargo build --release
npm ci
npm run lint             # cargo fmt + Clippy with warnings denied
npm test
npm run build:site       # static site -> dist/site
npm run build            # release CLI + static site
npm run package:cli      # archives the local release binary in dist/
```

The browser preflight on the landing page performs the same conservative header/preview checks entirely in-browser. It is useful for a quick sample; the CLI adds directory traversal, registry overrides, extraction, benchmarking, and stable JSON. The production build generates a versioned service-worker precache that includes the emitted hashed JavaScript and CSS, so the local checker still works after an offline reload.

Deploy the contents of `dist/site/` unchanged. It includes both `_headers` and `staticwebapp.config.json`, which set immutable caching for hashed assets, keep `sw.js` updateable, and apply the site’s `no-referrer` and permissions policies.

## Repository map

- `src/` — Rust CLI and library
- `registry/compatibility.json` — versioned, evidence-backed compatibility claims
- `site/` — dependency-light landing page and local browser preflight
- `.factory/design.md` — visual system and asset provenance

## Privacy and limitations

There is no telemetry, account, upload, or network request in the CLI or site. See the site privacy page for the complete policy. Proprietary RAW sensor data is not reverse-engineered; the tool reads TIFF/EXIF metadata and embedded JPEG previews and makes only registry-backed editor claims.

## License

MIT. See [LICENSE](LICENSE).
