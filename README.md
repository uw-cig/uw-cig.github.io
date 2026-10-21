# uw-cig.github.io
Website of the Computational Imaging Group (CIG) at UW–Madison

## Publications

The Publications page (`/publications/`) is built from `src/data/papers.bib` and `src/data/venues.yml`. Free-text lines between entries (e.g. `--- 2025`) are ignored, so you can keep using them to organize the file. Unknown venues and duplicate BibTeX keys show up as warnings in the build output.

**Add a paper.** Add a BibTeX entry to `papers.bib`, keeping newer papers above older ones (entries from the same year appear in file order). Besides the usual fields, the site reads:

- `abbr` — venue key from `venues.yml`, shown as the badge (required for the badge)
- `arxiv` (ID only, e.g. `2505.11853`), `pdf`, `html`, `code`, `website` — link buttons; without `html`, a `doi` is used for the HTML button
- `award` — shown under the venue line
- `category` — `journal`, `selective`, or `conference`, to override the automatic category

These site-only fields (plus `bibtex_show`, `selected`) are removed from the BibTeX shown by the Bib button.

Categories are assigned automatically: `abbr={arXiv}` is a **Preprint**, `@article` is a **Journal**, `@inproceedings` at a selective venue is a **Selective Conference**, and anything else is a **Conference**.

**Searching.** The search box matches titles, authors, venues, and years, ignoring case and accents. Each term matches at the start of a word, so `score` finds "score-based" and `CT` does not match "reconstruction". A term in double quotes matches only whole words: `"SPECT"` finds "SPECT" but not "spectral", and `"phase retrieval"` finds that exact phrase. Words separated by spaces must all match; `|` separates alternatives, any of which may match: `diffusion | posterior sampling` finds papers with "diffusion", or with both "posterior" and "sampling". The search and the type filter are kept in the URL (`/publications/?q=diffusion%20%7C%20score&type=journal`), so a filtered view can be linked. The homepage "Related publications" links are built this way from the `query` lists in `src/data/research.yml`.

**Add a venue.** Add a key to `venues.yml` that matches the paper's `abbr`:

```yaml
"TCI":
  url: https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6745852
  color: "#1F257F"
```

Both fields are optional. Without `color`, the badge uses the site's accent color. A paper whose `abbr` is missing from `venues.yml` gets a gray badge and a build warning.

**Mark a venue selective.** Add `selective: true` to the venue. Its `@inproceedings` papers then move from Conference to Selective Conference.

**Move a preprint to published.** Edit the existing entry: change `abbr` from `arXiv` to the venue's key, replace the `journal={arXiv:...}` line with the real `journal` (for `@article`) or `booktitle` (and change the entry type to `@inproceedings` for a conference), update `year`, add `volume`, `pages`, `doi`, etc. as available, and keep the `arxiv` field so the arXiv button stays. Then move the entry from the preprints part of the file to its year.

## News

News items are Markdown files in `src/content/news/`, shown on `/news/` newest first and grouped by year. Name files `YYYY-MM-DD-short-name.md` (e.g. `2027-01-04-new-student-harry.md`). For full posts the file name becomes the URL (`/news/2027-01-04-new-student-harry/`).

**One-line item** (the common case): only a `date`, and the body is shown in the list.

```markdown
---
date: 2027-01-04
---

Welcome to [Harry Mellow](https://www.linkedin.com/in/harrymellow), who has joined CIG as a PhD student!
```

**Full post**: add a `title`. The list shows the title, linking to a page with the full body.

```markdown
---
date: 2027-01-04
title: NSF awards nearly $1M for collaborative project
---

First paragraph...

More paragraphs, lists, links...
```

`date` can also be written as `2027-01-04 08:00:00-0400`, as in the older al-folio files, and the date shown is the one written. Items dated in the future still appear, at the top of the list. In older files, `inline: true` makes an item one-line even if it has a title. Other front-matter fields (`layout`, `related_posts`) are ignored. A missing or malformed `date` fails the build with an error naming the file.
