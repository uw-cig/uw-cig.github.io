import { readFileSync } from "node:fs";
import { z } from "astro/zod";
import { parse } from "yaml";

const SITE_FILE = "src/data/site.yml";

const schema = z.object({
	name: z.string().min(1),
	short_name: z.string().min(1),
	university: z.string().min(1),
	university_short: z.string().min(1),
	address: z.array(z.string().min(1)).min(1),
	email: z.email(),
	google_scholar: z.url(),
	links: z.array(z.object({ label: z.string().min(1), url: z.url() })).default([]),
});

const result = schema.safeParse(parse(readFileSync(SITE_FILE, "utf8")));
if (!result.success) {
	throw new Error(`${SITE_FILE}: ${result.error.issues.map((i) => `"${i.path.join(".")}" ${i.message}`).join("; ")}`);
}

// Site-wide details from src/data/site.yml.
export const site = result.data;
