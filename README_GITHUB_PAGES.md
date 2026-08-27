# GitHub Pages Public Mobile Test — V65

This is a **public-only static test build**. It does not include the dashboard/admin and does not require Node.js, Render, or any paid hosting.

## Included scheduled puzzle data

- Scheduled puzzles: **16**
- Date range: **2026-08-23 to 2026-08-29**

- five: 2
- mini: 7
- trail: 7

Your current V65 data does not contain scheduled puzzles for every game, so games without a scheduled record on the selected date will show the normal “no puzzle scheduled” state.

## Publish for free with GitHub Pages

1. Create a new **public** GitHub repository.
2. Unzip this package.
3. Upload **all files and folders inside the ZIP directly to the repository root**. `index.html` should be visible at the root.
4. Commit the upload.
5. In GitHub, open **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Choose `main` (or your default branch) and `/ (root)`.
8. Click **Save**.
9. Wait for GitHub Pages to provide the published URL.
10. Open that URL on your phone.

Typical URL:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## What was changed for GitHub Pages

The normal site reads puzzles and dictionary validation through the local Node server. GitHub Pages is static, so this package includes `static-data-adapter.js`, which reproduces the public read-only gameplay API in the browser.

It supports scheduled puzzle lookup, Six to Five archive/testing lookup, ORT bonus-word validation, ELL validation, and ELL dead-board checks.

Player progress remains stored in the browser through localStorage.

## Updating the online test later

The public scheduled-puzzle database is `data/puzzles.json`.

When you schedule more puzzles locally, the cleanest approach is to create a refreshed Pages package from the latest project and push the changed files to the same GitHub repository.
