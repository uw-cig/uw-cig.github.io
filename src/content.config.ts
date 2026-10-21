import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";

const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_]+/g, "-");

const team = defineCollection({
	// The file loader skips array items without an `id`, so derive one from the name.
	loader: file("src/data/team.yml", {
		parser: (text) =>
			(parse(text) as Record<string, unknown>[]).map((item, i) => ({
				id: typeof item?.name === "string" ? slugify(item.name) : `entry-${i + 1}`,
				...item,
			})),
	}),
	schema: z
		.object({
			name: z.string().min(1),
			type: z.enum(["pi", "postdoc", "phd", "ms", "undergrad"]),
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

export const collections = { team };
