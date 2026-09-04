# PuzzleNook V103.33 — GitHub Pages Sharing V2.1 QA

Upload the CONTENTS of this ZIP to the root of the GitHub Pages testing repository.

This build is adapted from PuzzleWebsite V103.33 — Sharing V2.1: Puzzle Teasers
for static GitHub Pages. The admin dashboard and Node server are intentionally excluded.

GitHub Pages adaptations:
- Public-site files are flattened to the repository root.
- A static-data adapter provides the read-only gameplay API used by the public site.
- Asset and Archive navigation paths are repository-relative so GitHub project pages
  remain inside the testing repository sub-path.
- V103.33 Sharing V2.1 personalized share text and puzzle teaser image generation
  are retained.

Cache-bust: 103.33-finalqa


QA routing fix: Archive header links are repository-relative, and completed-puzzle swipe-right now uses the same most-recent-unfinished destination rule as clicking the game title.
