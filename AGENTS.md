# Project guide

Website for the Computational Imaging Group (CIG) at UW–Madison. Built with Astro and Tailwind v4 (`@tailwindcss/vite`, plus `@tailwindcss/typography`). Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`, which runs `npm run check` (`astro check`) before `npm run build`, so a type error stops the deploy.

## Where content lives

| File | Controls |
| --- | --- |
| `src/data/site.yml` | Group/university names, default page `description`, address, email, Scholar URL, footer links, optional `google_site_verification` and optional `goatcounter` (analytics site code). Read by `src/utils/site.ts` and used in the header, footer, tab titles, meta tags and the homepage JSON-LD. |
| `src/data/home.yml` | `mission` paragraph on the homepage. |
| `src/data/research.yml` | Homepage research tabs: title, summary, image (filename in `src/assets/research/`), optional `query` for the "Related publications" link. |
| `src/data/team.yml` | PI, postdocs, PhD students and alumni (`team` collection). Photos are in `public/images/team/`. |
| `src/data/students.yml` | BS/MS student researchers. Terms look like "Fall 2026", and `mentor` must match a name in team.yml. |
| `src/data/visitors.yml` | Visiting PhD students, visiting students and interns (`visitors` collection): name, type (`phd`/`student`/`intern`), affiliation, optional country, start/end years, optional website. |
| `src/data/papers.bib` | Publications, parsed by `src/loaders/bibtex.ts` (al-folio-style fields: `abbr`, `arxiv`, `pdf`, `code`, `award`, …). |
| `src/data/venues.yml` | Keyed by BibTeX `abbr`: venue URL, badge color, `selective` flag. |
| `src/data/group-photo.yml` | Team-page banner: photo (in `src/assets/group/`), alt, caption, crop position. |
| `src/content/teaching/*.md` | al-folio course files (`teaching` collection): title, course code, institution, description, year, semester, optional links. |
| `src/content/join/*.md` | Join-page sections (`join` collection), one per position type: title, order, status (open/closed), status_label, form. |
| `src/data/projects.yml` | Student project cards under Student Researchers on /join/. Mentors must match team.yml, and reserved projects need `student`. Square `media` (alias `image`) goes in `src/assets/projects/`: GIF/MP4/WebM are served as-is via `?url`, and static images go through astro:assets. |
| `src/content/news/*.md` | al-folio news files. A file with a `title` gets its own page; one without a title (or with `inline: true`) is a one-line item. |

Each YAML file starts with a comment header that documents its fields. Keep that header up to date when you change a schema.

## Pages and components

- `src/layouts/BaseLayout.astro` holds the header, the mobile nav toggle, the main nav (marks the current page with `aria-current`) and the contact footer. Its `<head>` has the meta description, canonical URL, Open Graph/Twitter tags (`twitter:site` comes from the X link in site.yml), the optional Google verification tag, the GoatCounter script (only when `goatcounter` is set and only in production builds) and, on the homepage, `ResearchOrganization` JSON-LD. Props: `title`, `description` (default from site.yml), `image`/`imageAlt` (default `public/og-default.png`), `type` (`article` for news posts) and `noindex`.
- Every page passes a one-sentence `description`. News posts use the first sentence of the body (`newsSummary` in `src/utils/news.ts`), and course pages use their `description` field.
- `src/pages/404.astro` is the GitHub Pages 404 page (`noindex`, no canonical): links to the main pages and a search form that submits `q` to /publications/.
- `src/pages/index.astro` shows the mission, `ResearchTabs` and the latest 5 news items (`NewsItem`, via `src/utils/news.ts`).
- `src/pages/team.astro` shows `GroupPhoto`, then `TeamCard`s grouped by role, student researchers and alumni. Under Alumni, Former Student Researchers and Visitors are compact tables that become stacked rows on phones; each is hidden when empty.
- `src/pages/publications.astro` lists papers (`PaperEntry`) as Preprints and Published by year. It has a type filter and a search box that syncs `?q=` and `?type=` to the URL; `|` in `q` means OR.
- `src/pages/news.astro` (grouped by year) and `src/pages/news/[...slug].astro` (full posts).
- `src/pages/teaching.astro` lists courses by term, newest first (via `src/utils/teaching.ts`). `src/pages/teaching/[...slug].astro` shows one course; it renders `rendered.html` with the "Course Information" section stripped, so local images in course files aren't supported.
- `src/pages/join.astro` shows the open `join` sections in order, with jump links, status badges and Apply buttons. The `student-researchers` section also gets a list of `ProjectCard`s (square media on the left) with All/Available/Reserved filter pills.

## Design conventions

- Colors are theme variables in `src/styles/global.css` (`@theme`): `background` #ffffff, `ink` #1a1a1a, `muted` #6b6b6b, `surface` #f7f7f7, `line` #e5e5e5, `accent` #9b0000, `gold` #8b6508, `green` #2e7d32 (the "Available" badge). Use them as `text-accent`, `border-line` and so on. Don't hard-code hex values in components.
- Section headings: `mb-6 border-b border-line pb-2 text-xl font-semibold`. The homepage uses a smaller uppercase variant (`text-sm tracking-wide text-muted uppercase`). Each page has one `h1`; it is `sr-only` on the homepage.
- Links and active states use `hover:text-accent` and `hover:underline`. Selected tabs and filters are filled with the accent color.
- Accessibility patterns:
  - **Tabs** (`ResearchTabs`): `role="tablist"`, `tab` and `tabpanel` with `aria-selected`/`aria-controls`. Without JS, all panels show.
  - **Lightbox** (`GroupPhoto`): a native `<dialog>` with `showModal()`, a labeled close button, close on backdrop click, and focus returned to the opener. The full-size image loads lazily on open.
  - **Photo links** (`TeamCard`): the photo links to the same URL as the name, with `tabindex="-1"` and `aria-hidden` so it isn't announced twice.
  - Toggle buttons use `aria-expanded` and `aria-controls`. Decorative icons get `aria-hidden`.
- Images in `src/assets/` go through `astro:assets` (`Picture`/`getImage`, AVIF/WebP), loaded with `import.meta.glob` so filenames can come from YAML. Team photos are static files served from `public/images/team/`.

## Rules

- Validate all data with Zod: collection schemas in `src/content.config.ts`, and inline schemas for site.yml, home.yml and group-photo.yml. A bad entry must fail the build with an error that names the file, the entry and the field (use `superRefine` with custom messages).
- Don't edit content files (`src/data/*`, `src/content/news/*`, images) unless asked.
- Placeholder files and entries (in `projects.yml`, `src/content/join/`, `src/assets/`) are intentional, even when unreferenced; never delete them. Ask before deleting any other file.
- Keep news files compatible with al-folio front matter (`date`, `title`, `inline`; other fields are ignored), and keep papers.bib valid BibTeX with al-folio fields, so both can be copied from or to an al-folio site.

## Workflow

- Astro 7 renders Markdown with Sätteri, so `markdown.remarkPlugins` doesn't work without adding `@astrojs/markdown-remark`.
- Restart the dev server after changing `src/content.config.ts` or adding a new data file. Hot reload doesn't pick these up.
- The build warns about Markdown links with an empty URL (`[text]()`) in news and join files, naming the file and line (`src/loaders/empty-links.ts`). Ask for the URL rather than guessing one.
- Before finishing, run `npm run check` (0 errors, warnings and hints) and `npm run build`, and check that both pass.
- `@types/node` is pinned to the Node 22 line to match `engines`; keep it in step if the minimum Node version changes.
- `@astrojs/sitemap` (pinned exactly) writes `sitemap-index.xml` from `site` in `astro.config.mjs`; `public/robots.txt` points to it, so update both if the domain changes.
- `public/og-default.png` is generated by `node scripts/make-og-image.mjs` (sharp; names from site.yml, colors from global.css). Regenerate and commit it when those change.

## Known issues

- `npm audit` reports a moderate advisory in `postcss-selector-parser` 6.0.10, pinned by `@tailwindcss/typography` 0.5.20 (the latest). It only runs at build time, on Tailwind's own selectors. Don't run `npm audit fix --force`: it downgrades typography to 0.5.4.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
