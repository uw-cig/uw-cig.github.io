import { getCollection } from "astro:content";

// Link for each PhD thesis in papers.bib, keyed by BibTeX key: html, else pdf, else DOI.
export async function thesisLinks() {
	const links = new Map<string, string>();
	for (const { data } of await getCollection("papers")) {
		if (data.thesis !== "PhD" || links.has(data.key)) continue;
		const url = data.html ?? data.pdf ?? (data.doi && `https://doi.org/${data.doi}`);
		if (url) links.set(data.key, url);
	}
	return links;
}
