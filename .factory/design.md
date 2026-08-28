# RAW Fit Check — visual thesis

## Direction

**Neo-brutalist field utility.** RAW compatibility is normally buried in release notes and vague forum answers. This interface borrows the visual language of a photographer's contact sheet and a repair-bench test label: blunt borders, stamped verdicts, exposed metadata, and one sharp yellow inspection light. It should feel like a tool that tells the truth, not a camera-company campaign.

The direction is intentionally single-mode. A pale warm paper background keeps long diagnostic output legible, while near-black ink, not shadows or glass, establishes hierarchy.

## Tokens

| Role | Token | Value | Rationale |
| --- | --- | --- | --- |
| Background | `--paper` | `#F2EEDF` | Warm contact-sheet paper; lower glare than white. |
| Surface | `--panel` | `#FFFDF4` | Raises work areas without a drop-shadow. |
| Ink | `--ink` | `#171813` | Dense technical-label black. |
| Muted ink | `--muted` | `#55584D` | Secondary metadata, 7:1+ on paper. |
| Inspection accent | `--signal` | `#FFD43B` | Darkroom work light / checked frame. |
| Action | `--blue` | `#1558D6` | A precise, accessible control color. |
| Success | `--good` | `#177245` | Usable; always paired with text/icon. |
| Warning | `--warn` | `#9A5200` | Preview-only; always paired with text/icon. |
| Danger | `--bad` | `#B42318` | Unsupported/error; always paired with text/icon. |

Borders are 2px ink; primary controls use a 4px hard offset shadow. Corners are 0–4px, never pill-shaped. Spacing follows a 4/8px rhythm: 4, 8, 12, 16, 24, 32, 48, 72.

## Type

- Display and interface: `Arial Black`, `Arial Narrow Bold`, system sans-serif. Uppercase is reserved for small instrument labels, not paragraphs.
- Data and commands: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace. Tabular figures are enabled.
- No webfont payload or third-party font request. The contrast between compressed display copy and machine output is the pairing.
- Scale: 14 metadata, 16 body minimum, 20 lead, 28 section, clamp(40–72) hero. Reading measure stays under 72 characters.

## Layout and interaction grammar

The site uses a numbered vertical test sequence: **01 sample → 02 inspect → 03 decide**. A contact-sheet rail and registration marks carry the camera world into the page. Components look operable: hard borders, visible labels, immediate pressed displacement, and status stamps with both words and symbols. On 390px screens, the specimen/terminal stacks below the copy and dense result rows become labeled blocks.

The CLI uses the same grammar in text: concise stage names, explicit evidence, actionable verdicts, stable JSON keys, and no decorative spinner.

## Motion policy

Only state changes move: the result drawer enters 12px from its originating form over 180ms, and pressed buttons move into their hard shadow over 80ms. Nothing loops. Under `prefers-reduced-motion: reduce`, transitions and smooth scrolling are removed; hierarchy remains through border, scale, and color.

## Asset plan and provenance

- `site/public/raw-bench.webp` and responsive `raw-bench-720.webp`: original generated hero still life—an opened RAW file cartridge, camera memory card, contact-sheet crop marks, and a small diagnostic oscilloscope trace. It explains “inspect the file before the workflow.” Generated for this product with `/opt/fleet/lib/gen-image.sh`, factory-image model, then converted locally to WebP. Prompt: “Neo-brutalist editorial still life for a RAW photo compatibility diagnostic; overhead view of an unbranded black camera memory card, a cream contact sheet with crop marks, a small waveform/diagnostic strip, hard ink outlines, warm paper, inspection yellow and cobalt blue, coarse screenprint texture, asymmetrical horizontal composition, no people, no logos, no readable text, no gradients, generous negative space.” Original generation; project use.
- Inline SVG marks (logo aperture/check and verdict symbols) are hand-authored geometric assets in the site source; no external icon set.

All assets ship locally. No stock art, remote font, runtime CDN, or tracking asset is used.
