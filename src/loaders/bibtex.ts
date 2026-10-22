import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse, type Creator } from "@retorquere/bibtex-parser";
import type { Loader } from "astro/loaders";
import { parse as parseYaml } from "yaml";

// Fields used only by the website; left out of the BibTeX shown to visitors.
const SITE_ONLY_FIELDS = new Set([
	"bibtex_show",
	"selected",
	"abbr",
	"award",
	"code",
	"website",
	"html",
	"arxiv",
	"category",
]);

// Thesis entry types; they get a fixed badge instead of a venue from venues.yml.
const THESIS_TYPES: Record<string, "PhD" | "MS"> = { phdthesis: "PhD", mastersthesis: "MS" };

// "Last, F. M." -> "F. M. Last", keeping particles such as "de" or "von".
const formatName = (c: Creator) =>
	c.name ?? [c.firstName, c.prefix, c.lastName].filter(Boolean).join(" ") + (c.suffix ? `, ${c.suffix}` : "");

// Splits on commas that are not inside braces or quotes.
const splitTopLevel = (text: string) => {
	const parts: string[] = [];
	let depth = 0;
	let quoted = false;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === "\\") i++;
		else if (ch === "{") depth++;
		else if (ch === "}") depth--;
		else if (ch === '"' && depth === 0) quoted = !quoted;
		else if (ch === "," && depth === 0 && !quoted) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts.map((p) => p.trim()).filter(Boolean);
};

// Rebuilds an entry from its source text, without the site-only fields.
const cleanBibtex = (input: string) => {
	const open = input.indexOf("{");
	const [key, ...fields] = splitTopLevel(input.slice(open + 1, input.lastIndexOf("}")));
	const kept = fields
		.map((f) => {
			const eq = f.indexOf("=");
			return { name: f.slice(0, eq).trim(), value: f.slice(eq + 1).trim().replace(/\s+/g, " ") };
		})
		.filter((f) => !SITE_ONLY_FIELDS.has(f.name.toLowerCase()))
		.map((f) => `  ${f.name}=${f.value}`);
	return `${input.slice(0, open).trim()}{${key},\n${kept.join(",\n")}\n}`;
};

// Loads papers.bib; text between entries (e.g. "--- 2025") is ignored by the parser.
export function bibtexLoader({ file, venuesFile }: { file: string; venuesFile: string }): Loader {
	return {
		name: "bibtex-loader",
		load: async ({ store, logger, parseData, watcher }) => {
			const path = resolve(file);

			const sync = async () => {
				const text = await readFile(path, "utf8");
				const venues = new Set(Object.keys(parseYaml(await readFile(resolve(venuesFile), "utf8")) ?? {}));
				const options = {
					english: false,
					sentenceCase: false,
					caseProtection: false,
					unsupported: (_node, tex, entry) => {
						logger.warn(`${entry.key}: unsupported LaTeX command ${tex}, shown as-is`);
						return tex;
					},
				} satisfies Parameters<typeof parse>[1];
				const library = parse(text, options);
				if (library.errors.length > 0) {
					throw new Error(`${file}: ${library.errors.map((e) => e.error).join("; ")}`);
				}
				// An unescaped % in award text would start a LaTeX comment and cut it short, so
				// read the award verbatim, escape bare %, and convert it to text on its own.
				const raw = parse(text, { ...options, raw: true }).entries;
				const awardText = (key: string, award: string) =>
					parse(`@misc{${key}, award={${award.replace(/(?<!\\)%/g, "\\%")}}}`, options).entries[0]?.fields.award?.trim();
				// The parser only splits author/editor into names, so read the advisor as an author.
				const advisorNames = (key: string, advisor: string) =>
					(parse(`@misc{${key}, author={${advisor}}}`, options).entries[0]?.fields.author ?? []).map(formatName);

				store.clear();
				const seen = new Map<string, number>();
				for (const [order, entry] of library.entries.entries()) {
					const f = entry.fields;
					// A repeated key would overwrite the earlier entry, so give it a unique id.
					const n = (seen.get(entry.key) ?? 0) + 1;
					seen.set(entry.key, n);
					const id = n === 1 ? entry.key : `${entry.key}-${n}`;
					if (n > 1) logger.warn(`${entry.key}: duplicate BibTeX key (entry ${order + 1}); listed as "${id}"`);
					const rawAward = raw[order]?.key === entry.key ? raw[order].fields.award : undefined;
					const award = rawAward && awardText(entry.key, rawAward);
					const thesis = THESIS_TYPES[entry.type.toLowerCase()];
					// Theses get their badge from the entry type, so they need no venue.
					if (!thesis) {
						if (!f.abbr) {
							logger.warn(`${entry.key}: no "abbr" field, so no venue badge is shown`);
						} else if (!venues.has(f.abbr)) {
							logger.warn(`${entry.key}: abbr "${f.abbr}" is not in ${venuesFile}; using a gray badge`);
						}
					}
					const data = await parseData({
						id,
						data: {
							id,
							key: entry.key,
							type: entry.type.toLowerCase(),
							order,
							title: f.title,
							authors: (f.author ?? []).map(formatName),
							abbr: f.abbr,
							venue: f.journal ?? f.booktitle,
							volume: f.volume ?? f.vol,
							number: f.number ?? f.no,
							pages: f.pages,
							address: f.address,
							school: f.school,
							advisors: f.advisor ? advisorNames(entry.key, f.advisor) : undefined,
							thesis,
							year: f.year,
							award: award || undefined,
							arxiv: f.arxiv,
							pdf: f.pdf,
							html: f.html,
							doi: f.doi,
							code: f.code,
							website: f.website,
							category: f.category,
							bibtex: cleanBibtex(entry.input),
						},
					});
					store.set({ id, data });
				}
			};

			await sync();
			watcher?.add([path, resolve(venuesFile)]);
			watcher?.on("change", async (changed) => {
				if (changed === path || changed === resolve(venuesFile)) await sync();
			});
		},
	};
}
