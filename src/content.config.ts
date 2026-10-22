import { readFileSync } from "node:fs";
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";
import { bibtexLoader } from "./loaders/bibtex";
import { markdownWithLinkCheck } from "./loaders/empty-links";
import { SEASONS, TERM, termKey } from "./utils/terms";

const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_]+/g, "-");

const TEAM_FILE = "src/data/team.yml";

const team = defineCollection({
	// The file loader skips array items without an `id`, so derive one from the name.
	loader: file(TEAM_FILE, {
		parser: (text) =>
			(parse(text) as Record<string, unknown>[]).map((item, i) => ({
				id: typeof item?.name === "string" ? slugify(item.name) : `entry-${i + 1}`,
				...item,
			})),
	}),
	schema: z
		.object({
			name: z.string().min(1),
			type: z.enum(["pi", "postdoc", "phd"]),
			current: z.boolean().default(false),
			institution: z.string().optional(),
			photo: z.string().min(1),
			website: z.url().optional(),
			current_role: z
				.union([z.string(), z.array(z.string()).min(1)])
				.transform((v) => (typeof v === "string" ? [v] : v))
				.optional(),
			thesis: z.string().optional(),
			year: z.number().int().optional(),
			focus: z.string().optional(),
		})
		.superRefine((m, ctx) => {
			if (m.current && !m.institution) {
				ctx.addIssue({
					code: "custom",
					path: ["institution"],
					message: `${m.name}: current members require "institution"`,
				});
			}
			if (!m.current && m.year === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["year"],
					message: `${m.name}: alumni (current: false or omitted) require "year"`,
				});
			}
		}),
});

// Mentor names are checked against team.yml directly, since a schema
// cannot query another collection while it is being validated.
const teamNames = new Set(
	(parse(readFileSync(TEAM_FILE, "utf8")) as Record<string, unknown>[])
		.map((m) => m?.name)
		.filter((n): n is string => typeof n === "string"),
);

const students = defineCollection({
	loader: file("src/data/students.yml", {
		parser: (text) =>
			((parse(text) as Record<string, unknown>[] | null) ?? []).map((item, i) => ({
				id:
					typeof item?.name === "string"
						? slugify(`${item.name} ${typeof item.start === "string" ? item.start : ""}`)
						: `entry-${i + 1}`,
				...item,
			})),
	}),
	schema: z
		.object({
			name: z.string().min(1),
			// Checked in superRefine so the error names the student.
			program: z.string().optional(),
			institution: z.string().min(1).default("UW–Madison"),
			project: z.string().min(1),
			// One name or a list of names.
			mentor: z
				.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
				.transform((v) => (typeof v === "string" ? [v] : v))
				.optional(),
			current: z.boolean().default(false),
			start: z.string(),
			end: z.string().optional(),
			website: z.url().optional(),
		})
		.superRefine((s, ctx) => {
			if (s.program === undefined) {
				if (s.current) {
					ctx.addIssue({
						code: "custom",
						path: ["program"],
						message: `${s.name}: current students require "program" (BS or MS)`,
					});
				}
			} else if (s.program !== "BS" && s.program !== "MS") {
				ctx.addIssue({
					code: "custom",
					path: ["program"],
					message: `${s.name}: "program" must be BS or MS, got "${s.program}"`,
				});
			}
			for (const field of ["start", "end"] as const) {
				const term = s[field];
				if (term !== undefined && !TERM.test(term)) {
					ctx.addIssue({
						code: "custom",
						path: [field],
						message: `${s.name}: "${field}" must look like "Fall 2026" (Spring, Summer or Fall + year), got "${term}"`,
					});
				}
			}
			if (!s.current && s.end === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["end"],
					message: `${s.name}: former students (current: false or omitted) require "end"`,
				});
			}
			if (!s.current && s.mentor === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["mentor"],
					message: `${s.name}: former students (current: false or omitted) require "mentor"`,
				});
			}
			if (s.end !== undefined && TERM.test(s.start) && TERM.test(s.end) && termKey(s.end) < termKey(s.start)) {
				ctx.addIssue({
					code: "custom",
					path: ["end"],
					message: `${s.name}: "end" (${s.end}) is before "start" (${s.start})`,
				});
			}
			for (const [i, mentor] of (s.mentor ?? []).entries()) {
				if (!teamNames.has(mentor)) {
					ctx.addIssue({
						code: "custom",
						path: s.mentor!.length > 1 ? ["mentor", i] : ["mentor"],
						message: `${s.name}: mentor "${mentor}" does not match any name in team.yml`,
					});
				}
			}
		}),
});

// YAML reads 2023 as a number and "2023" as a string; both are accepted.
const visitorYear = z.union([z.number(), z.string()]).transform(String);
const YEAR = /^\d{4}$/;
const VISITOR_TYPES = ["phd", "student", "intern"] as const;

const visitors = defineCollection({
	loader: file("src/data/visitors.yml", {
		parser: (text) =>
			((parse(text) as Record<string, unknown>[] | null) ?? []).map((item, i) => ({
				id:
					typeof item?.name === "string"
						? slugify(`${item.name} ${item.start ?? ""}`)
						: `entry-${i + 1}`,
				...item,
			})),
	}),
	schema: z
		.object({
			name: z.string().min(1),
			// Checked in superRefine so the error names the visitor.
			type: z.string(),
			affiliation: z.string().min(1),
			country: z.string().min(1).optional(),
			start: visitorYear,
			end: visitorYear.optional(),
			website: z.url().optional(),
		})
		.superRefine((v, ctx) => {
			if (!(VISITOR_TYPES as readonly string[]).includes(v.type)) {
				ctx.addIssue({
					code: "custom",
					path: ["type"],
					message: `${v.name}: "type" must be phd, student or intern, got "${v.type}"`,
				});
			}
			for (const field of ["start", "end"] as const) {
				const year = v[field];
				if (year !== undefined && !YEAR.test(year)) {
					ctx.addIssue({
						code: "custom",
						path: [field],
						message: `${v.name}: "${field}" must be a 4-digit year like 2023, got "${year}"`,
					});
				}
			}
			if (v.end !== undefined && YEAR.test(v.start) && YEAR.test(v.end) && Number(v.end) < Number(v.start)) {
				ctx.addIssue({
					code: "custom",
					path: ["end"],
					message: `${v.name}: "end" (${v.end}) is before "start" (${v.start})`,
				});
			}
		})
		.transform((v) => ({ ...v, type: v.type as (typeof VISITOR_TYPES)[number] })),
});

const VENUES_FILE = "src/data/venues.yml";

// Keyed by the `abbr` field of papers.bib entries.
const venues = defineCollection({
	loader: file(VENUES_FILE),
	schema: z.object({
		url: z.url().optional(),
		color: z
			.string()
			.regex(/^#[0-9a-fA-F]{3,8}$/, 'must be a hex color like "#1F257F"')
			.optional(),
		selective: z.boolean().default(false),
	}),
});

const optionalText = z.string().min(1).optional();

const papers = defineCollection({
	loader: bibtexLoader({ file: "src/data/papers.bib", venuesFile: VENUES_FILE }),
	schema: z.object({
		// Unique even when papers.bib repeats a key; `key` is the BibTeX key as written.
		id: z.string(),
		key: z.string(),
		type: z.string(),
		// Position in papers.bib, used to keep the file order within a year.
		order: z.number().int(),
		title: z.string().min(1),
		authors: z.array(z.string()).min(1),
		abbr: optionalText,
		venue: optionalText,
		volume: optionalText,
		number: optionalText,
		pages: optionalText,
		address: optionalText,
		// Theses only (@phdthesis / @mastersthesis).
		school: optionalText,
		advisors: z.array(z.string()).min(1).optional(),
		thesis: z.enum(["PhD", "MS"]).optional(),
		year: z.coerce.number().int(),
		award: optionalText,
		arxiv: optionalText,
		pdf: z.url().optional(),
		html: z.url().optional(),
		doi: optionalText,
		code: z.url().optional(),
		website: z.url().optional(),
		category: z.enum(["journal", "selective", "conference"]).optional(),
		bibtex: z.string(),
	}),
});

// "2027-01-04" or "2027-01-04 08:00:00-0400". The date and time are kept as
// written (stored as UTC, offset ignored), so the date shown is the one in the file.
const NEWS_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const newsDate = z.union([z.date(), z.string()]).transform((value, ctx) => {
	// YAML may already have turned the value into a Date (always UTC for a bare date).
	if (value instanceof Date) return value;
	const m = NEWS_DATE.exec(value.trim());
	const date = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
	if (!date || date.getUTCDate() !== +m[3]) {
		ctx.addIssue({
			code: "custom",
			message: `"date" must look like 2027-01-04 or 2027-01-04 08:00:00-0400, got "${value}"`,
		});
		return z.NEVER;
	}
	return date;
});

// al-folio news files. Other front-matter fields (layout, related_posts, ...) are ignored.
const news = defineCollection({
	loader: markdownWithLinkCheck("src/content/news"),
	schema: z.object({
		date: newsDate,
		// With a title the item is a full post with its own page; without one it is a one-line item.
		title: z.string().min(1).optional(),
		// Legacy al-folio flag: inline: true makes it a one-line item even with a title.
		inline: z.boolean().optional(),
	}),
});

// Legacy al-folio `semester_sort` suffixes. Summer has none, so Summer courses must omit the field.
const LEGACY_SORT: Record<string, number | undefined> = { Spring: 1, Fall: 2 };

// al-folio course files. Other front-matter fields (layout, ...) are ignored.
const teaching = defineCollection({
	loader: glob({ base: "src/content/teaching", pattern: "**/*.md" }),
	schema: z
		.object({
			title: z.string().min(1),
			course: z.string().min(1),
			institution: z.string().min(1),
			description: z.string().min(1),
			year: z.number().int(),
			semester: z.enum(SEASONS),
			semester_id: z.string().optional(),
			semester_sort: z.string().optional(),
			links: z.array(z.object({ label: z.string().min(1), url: z.url() })).default([]),
		})
		.superRefine((c, ctx) => {
			const term = `${c.semester} ${c.year}`;
			if (c.semester_id !== undefined && c.semester_id !== term) {
				ctx.addIssue({
					code: "custom",
					path: ["semester_id"],
					message: `"semester_id" ("${c.semester_id}") must match year + semester ("${term}"), or be removed`,
				});
			}
			if (c.semester_sort !== undefined) {
				const suffix = LEGACY_SORT[c.semester];
				const expected = suffix === undefined ? undefined : `${c.year}-${suffix}`;
				if (c.semester_sort !== expected) {
					ctx.addIssue({
						code: "custom",
						path: ["semester_sort"],
						message:
							expected === undefined
								? `"semester_sort" has no legacy value for ${c.semester} terms; remove it`
								: `"semester_sort" ("${c.semester_sort}") must match year + semester ("${expected}"), or be removed`,
					});
				}
			}
		})
		.transform(({ semester_id, semester_sort, ...c }) => {
			const term = `${c.semester} ${c.year}`;
			return { ...c, term, termOrder: termKey(term) };
		}),
});

// Homepage research tabs, in file order.
const research = defineCollection({
	loader: file("src/data/research.yml", {
		parser: (text) =>
			((parse(text) as Record<string, unknown>[] | null) ?? []).map((item, i) => ({
				id: typeof item?.title === "string" ? slugify(item.title) : `entry-${i + 1}`,
				order: i,
				...item,
			})),
	}),
	schema: z.object({
		order: z.number().int(),
		title: z.string().min(1),
		summary: z.string().min(1),
		// Filename in src/assets/research/; a missing file shows a placeholder.
		image: z.string().min(1),
		// One search string or a list of keywords (joined with "|", i.e. OR).
		query: z
			.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
			.transform((v) => (typeof v === "string" ? [v] : v))
			.optional(),
	}),
});

// Positions on /join/, one file per category, in `order`. Closed sections are hidden.
const join = defineCollection({
	loader: markdownWithLinkCheck("src/content/join"),
	schema: z.object({
		title: z.string().min(1),
		order: z.number(),
		status: z.enum(["open", "closed"]),
		status_label: z.string().min(1).default("Recruiting"),
		// Google Form URL; "" means no Apply button.
		form: z
			.union([z.literal(""), z.url()])
			.optional()
			.transform((v) => v || undefined),
	}),
});

// Animations (served as-is) or static images (optimized by astro:assets).
const PROJECT_MEDIA = /\.(gif|mp4|webm|png|jpe?g|webp|avif)$/i;

// Student projects, shown under "Student Researchers" on /join/.
const projects = defineCollection({
	loader: file("src/data/projects.yml", {
		parser: (text) =>
			((parse(text) as Record<string, unknown>[] | null) ?? []).map((item, i) => ({
				id: typeof item?.title === "string" ? slugify(item.title) : `entry-${i + 1}`,
				order: i,
				...item,
			})),
	}),
	schema: z
		.object({
			order: z.number().int(),
			title: z.string().min(1),
			// Checked in superRefine so the error names the project.
			semester: z.string(),
			mentors: z.array(z.string().min(1)).min(1),
			description: z.string().min(1),
			// Filename in src/assets/projects/; without it a placeholder is shown.
			media: z.string().min(1).optional(),
			// Older name for `media`.
			image: z.string().min(1).optional(),
			status: z.enum(["available", "reserved", "completed"]),
			student: z.string().min(1).optional(),
			level: z.array(z.enum(["BS", "MS"])).optional(),
		})
		.superRefine((p, ctx) => {
			if (!TERM.test(p.semester)) {
				ctx.addIssue({
					code: "custom",
					path: ["semester"],
					message: `${p.title}: "semester" must look like "Fall 2026" (Spring, Summer or Fall + year), got "${p.semester}"`,
				});
			}
			for (const [i, mentor] of p.mentors.entries()) {
				if (!teamNames.has(mentor)) {
					ctx.addIssue({
						code: "custom",
						path: ["mentors", i],
						message: `${p.title}: mentor "${mentor}" does not match any name in team.yml`,
					});
				}
			}
			if (p.media !== undefined && p.image !== undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["image"],
					message: `${p.title}: use "media" or its older name "image", not both`,
				});
			}
			const media = p.media ?? p.image;
			if (media !== undefined && !PROJECT_MEDIA.test(media)) {
				ctx.addIssue({
					code: "custom",
					path: [p.media !== undefined ? "media" : "image"],
					message: `${p.title}: media must be a .gif, .mp4, .webm, .png, .jpg, .webp or .avif file, got "${media}"`,
				});
			}
			if (p.status === "reserved" && p.student === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["student"],
					message: `${p.title}: reserved projects require "student"`,
				});
			}
		})
		.transform(({ image, ...p }) => ({
			...p,
			media: p.media ?? image,
			semesterOrder: TERM.test(p.semester) ? termKey(p.semester) : 0,
		})),
});

export const collections = { team, students, visitors, venues, papers, news, research, teaching, join, projects };
