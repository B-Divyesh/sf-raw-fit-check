# RAW Fit Check demo

## Web demo

Open `/demo/` or choose **Try it with sample data** on the landing page. It fetches the shipped synthetic `sony-ilce-6700-sample.ARW`, runs the local browser inspection, and shows a populated preview-only report.

The banner stays visible while the demo is open. **Reset demo** fetches a clean bundled copy. **Start for real** removes `sessionStorage['demo:raw-fit-check:mode']` and opens the real file chooser.

The browser demo stores only the `demo:` mode label in session storage. It does not read local-storage keys, real selected files, reports, filenames, or metadata. The sample and public shell are precached for offline use.

## CLI demo

Run:

```sh
raw-fit-check demo
```

The binary embeds the same synthetic sample from `examples/sony-ilce-6700-sample.ARW`. It writes the sample and preview to a new operating-system temporary folder, prints that folder, and runs the normal inspection with darktable 4.6.0. `raw-fit-check demo --json` includes both generated paths and the normal report.

The sample contains a TIFF-style Sony `ILCE-6700` header and a synthetic 320×240 JPEG preview. It is test data, not a proprietary camera file.
