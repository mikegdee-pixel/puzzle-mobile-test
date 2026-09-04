# PuzzleNook V103.29 — GitHub Pages Final QA

Upload the CONTENTS of this ZIP to the root of the GitHub Pages testing repository.

This build is adapted from the current V103.29 project for static GitHub Pages.
The admin dashboard and Node server are intentionally excluded.

Archive routing fix:
GitHub project pages are hosted below a repository path. Root-relative links such
as `/?date=...` or `/archive.html` jump to the domain root and can produce 404s.
This QA build uses repository-relative navigation so Archive dates, game links,
home navigation, and date navigation remain inside the GitHub Pages project.

Cache-bust: 103.29-finalqa
