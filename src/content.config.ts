import { readFileSync } from "node:fs";
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";
import { bibtexLoader } from "./loaders/bibtex";
import { TERM, termKey } from "./utils/terms";

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
			program: z.string(),
			institution: z.string().min(1).default("UW-Madison"),
			project: z.string().min(1),
			mentor: z.string().min(1).optional(),
			current: z.boolean().default(false),
			start: z.string(),
			end: z.string().optional(),
			website: z.url().optional(),
		})
		.superRefine((s, ctx) => {
			if (s.program !== "BS" && s.program !== "MS") {
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
			if (s.mentor !== undefined && !teamNames.has(s.mentor)) {
				ctx.addIssue({
					code: "custom",
					path: ["mentor"],
					message: `${s.name}: mentor "${s.mentor}" does not match any name in team.yml`,
				});
			}
		}),
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
	loader: glob({ base: "src/content/news", pattern: "**/*.md" }),
	schema: z.object({
		date: newsDate,
		// With a title the item is a full post with its own page; without one it is a one-line item.
		title: z.string().min(1).optional(),
		// Legacy al-folio flag: inline: true makes it a one-line item even with a title.
		inline: z.boolean().optional(),
	}),
});

export const collections = { team, students, venues, papers, news };
