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

**Add a venue.** Add a key to `venues.yml` that matches the paper's `abbr`:

```yaml
"TCI":
  url: https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6745852
  color: "#1F257F"
```

Both fields are optional. Without `color`, the badge uses the site's accent color. A paper whose `abbr` is missing from `venues.yml` gets a gray badge and a build warning.

**Mark a venue selective.** Add `selective: true` to the venue. Its `@inproceedings` papers then move from Conference to Selective Conference.

**Move a preprint to published.** Edit the existing entry: change `abbr` from `arXiv` to the venue's key, replace the `journal={arXiv:...}` line with the real `journal` (for `@article`) or `booktitle` (and change the entry type to `@inproceedings` for a conference), update `year`, add `volume`, `pages`, `doi`, etc. as available, and keep the `arxiv` field so the arXiv button stays. Then move the entry from the preprints part of the file to its year.
