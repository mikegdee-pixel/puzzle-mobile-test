# PuzzleNook GitHub Pages Public Test — V101.4

This package is the static GitHub Pages QA build derived from PuzzleWebsite V101.4.
It preserves the GitHub Pages static-data adapter used by the prior V100.60 test package.

QA baseline: V101.4 — Homepage Completion Status
Generated for testing-team QA.

# PuzzleWebsite V100.60 — GitHub Pages Public Test

Static GitHub Pages testing build generated from the official PuzzleWebsite V100.60 baseline.

Upload the **contents of this folder** to the root of the GitHub Pages repository.

- Includes the current V100.60 public HTML, CSS, JavaScript, assets, and puzzle data.
- Includes the proven static GitHub Pages data adapter used by the prior V100.8 public test package.
- Local `/public/...` asset references are converted to repository-relative paths for GitHub Pages.
- Root `/data/...` and `/api/...` gameplay requests are handled by the static data adapter.
- CSS, JavaScript, and the adapter use `?v=100.60` cache-busting for physical-device/browser testing.
- `.nojekyll` is included.
- This is a public-site testing package only; it does not include the Node admin/server runtime.

Baseline source: PuzzleWebsite V100.60 — InCommon Arial Black Pill.
