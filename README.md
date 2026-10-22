# uw-cig.github.io
Website of the Computational Imaging Group (CIG) at UW–Madison

## Development

Requires Node 22 or later. Run `npm install` once, then:

- `npm run dev` starts a local server with live reload.
- `npm run check` type-checks the site (`astro check`).
- `npm run build` builds the site into `dist/`. Data errors (for example a misspelled mentor name) fail the build with a message naming the file and entry.

Every push to `main` runs `npm run check` and `npm run build` on GitHub Actions, then deploys to GitHub Pages. If either fails, the site isn't updated.

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

## Teaching

Courses are Markdown files in `src/content/teaching/`, shown on `/teaching/` grouped by term, newest first. Name files `YYYY-term-coursecode.md` (e.g. `2027-spring-ece532.md`); the file name becomes the course page URL (`/teaching/2027-spring-ece532/`).

```markdown
---
title: Matrix Methods in Machine Learning
course: ECE 532
institution: University of Wisconsin–Madison
description: Undergraduate course on matrix methods and their applications in machine learning.
year: 2027
semester: Spring
links:
  - label: Canvas
    url: https://canvas.wisc.edu/courses/123456
---

## Course Description

...

## Lecture Topics

1. ...
```

All fields except `links` are required, and `semester` must be `Spring`, `Summer`, or `Fall`. The `links` show as buttons under the course header. A section headed `## Course Information` is not shown on the course page, since the header already gives the course code, term, and institution. Older al-folio files may keep `semester_id` (`"Spring 2027"`) and `semester_sort` (`"2027-1"` for Spring, `"2027-2"` for Fall), but they must agree with `year` and `semester`, or the build fails with an error naming the file. Summer courses must omit `semester_sort`. Other front-matter fields (`layout`) are ignored. Images in course files are not supported.

## Join

The Join page (`/join/`) has one section per position type, from the Markdown files in `src/content/join/`, and student project cards from `src/data/projects.yml`.

**Positions.** Each file is one section (`postdoc.md`, `phd.md`, `student-researchers.md`, `interns.md`), shown in `order`. Edit the Markdown body for the description, and the front matter for the rest:

```markdown
---
title: PhD Students
order: 2
status: open                         # open | closed; closed sections are hidden
status_label: Recruiting for Fall 2027   # badge text; default "Recruiting"
form: "https://forms.gle/..."        # Google Form; "" for no Apply button
---
```

Closed sections and their jump links are hidden. If every section is closed, the page says there are no open positions. When Student Researchers has available projects, its badge shows "N projects available" instead of `status_label`.

**Projects.** Each entry in `projects.yml` becomes a card under Student Researchers (the field reference is at the top of the file). Available projects are shown first, then reserved ones (dimmed); completed projects are hidden. Mentors must match names in `team.yml`, and a reserved project needs a `student`. The student's name is linked if they are in `students.yml` with a `website`. For a card animation or image, put the file in `src/assets/projects/` and set `media` to its filename (the older name `image` still works). It is shown as a square on the left of the card, or above the text on phones.

- **Animations:** MP4 is preferred (smaller and smoother than GIF); WebM and GIF also work. They are served as-is, without conversion. Videos play muted on a loop, load only when scrolled into view, and stay on the first frame for visitors who have turned on reduced motion.
- **Static images:** PNG, JPG, WebP or AVIF, resized and converted automatically.
- **Recommended:** 600×600 px, a 2–5 second loop, and GIFs under about 2 MB. The build warns about GIFs over 3 MB and videos over 5 MB.

**Each semester:**

1. Update `status` and `status_label` in each position file, and the `form` links.
2. In `projects.yml`, mark taken projects `status: reserved` with the `student`, set finished ones to `status: completed` (or delete them), and add new projects with `status: available`.
3. Add new student researchers to `students.yml`, and move finished ones to former students, as described at the top of that file.
4. Run `npm run build`; a typo in a mentor name, semester or status fails the build with an error naming the project.
