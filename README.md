# RAW Fit Check

RAW Fit Check is a local CLI for photographers who need to check a camera RAW file before changing editors. It reads container metadata and an embedded JPEG preview, then compares the camera, editor, version, and platform with a dated registry.

## Try the demo

Run the bundled synthetic Sony ILCE-6700 sample without touching your own files:

```sh
cargo run -- demo
```

The command copies the sample into a new temporary folder, prints that folder, extracts its preview, and reports the result. The web demo is at `https://raw-fit-check.sociobot.in/demo/`.

## Install

Build and install from a checkout with Rust:

```sh
cargo install --path .
```

## Check a folder

```sh
raw-fit-check check ~/Pictures/sample \
  --editor darktable --editor-version 4.8.1
```

Write extracted previews and a JSON report:

```sh
raw-fit-check check DSC_0042.NEF DSC_0043.NEF \
  --editor darktable --editor-version 4.8.1 \
  --preview-dir ./previews --json > fit-report.json
```

`--editor-version` accepts one to four numeric parts, such as `4.8.1`. Use `--platform linux`, `windows`, or `macos` to test a different platform. The CLI rejects malformed versions and unsupported platform names as invalid input.

## Read a result

- `usable` means the embedded preview decodes and a registry rule matches the selected editor details.
- `preview-only` means the embedded preview decodes, but the editor combination lacks a matching rule.
- `unsupported` means there is no local preview or a matching rule explicitly excludes the combination.

Exit code `0` means usable, `1` invalid input, `2` preview-only, and `3` unsupported. `--ci` prints the report without prompts.

## Inspect the registry

```sh
raw-fit-check registry
raw-fit-check registry --json
```

The built-in registry includes a source date, HTTPS source URL, and numeric version range for every rule. Use a reviewed custom registry with the same schema:

```sh
raw-fit-check check sample.ARW --registry team-registry.json --json
```

## Browser check and privacy

The landing-page checker reads a selected file in the browser. It reports the container, camera ID, preview dimensions, and local timing. It returns `preview-only` rather than an editor verdict. The selected file is not uploaded or saved as a report.

After the first visit, the public app shell and bundled demo sample work offline. The demo uses its own `demo:` session-storage key and never reads a real selected file. It requires no account or payment step.

## Develop, test, package, and deploy

```sh
npm ci
npm test
npm run build
npm run package:cli
npm run test:consumer
```

`npm test` runs formatting, Clippy, Rust tests, browser checks, and every public claim. The claim manifest is `.factory/claims.json`; run one claim with its documented command. `npm run build` creates `target/release/raw-fit-check` and `dist/site/`. `npm run package:cli` produces the Linux archive in `dist/`. `npm run test:consumer` packages the crate, installs it into a fresh temporary prefix, and runs the installed binary.

Deploy the contents of `dist/site/` unchanged. It contains the response policy, service worker, `404.html`, and all static assets.

## Repository map

- `src/` — Rust CLI and library
- `examples/` — synthetic bundled RAW sample
- `registry/compatibility.json` — versioned compatibility rules
- `site/` — static landing page and browser sample check
- `.factory/claims.json` — public claims and their sandbox checks
- `.factory/demo.md` — demo isolation details

## License

MIT. See [LICENSE](LICENSE).
