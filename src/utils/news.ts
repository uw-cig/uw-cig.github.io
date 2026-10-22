import { getCollection, type CollectionEntry } from "astro:content";

export type NewsItem = CollectionEntry<"news">;

// A full post has its own page under /news/; anything else is a one-line item.
export const isFullPost = (item: NewsItem) => item.data.title !== undefined && item.data.inline !== true;

export const newsUrl = (item: NewsItem) => `/news/${item.id}/`;

// Dates are stored as UTC holding the date written in the file, so format them in UTC.
export const formatNewsDate = (date: Date) =>
	date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// All items, newest first; future-dated items come first.
export async function getNews() {
	return (await getCollection("news")).sort(
		(a, b) => b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id),
	);
}

// The `count` most recent items by date, including future-dated ones (e.g. for the homepage).
export async function getRecentNews(count: number) {
	return (await getNews()).slice(0, count);
}

// A period after these ends a title, abbreviation or initial ("Prof.", "et al.", "M."), not a sentence.
const NOT_SENTENCE_END = /(?:\b(?:Prof|Dr|Mr|Mrs|Ms|St|Jr|Sr|vs|al|etc|Inc|Dept|No|Vol|Fig|e\.g|i\.e)|\b\p{Lu})\.$/u;
const MAX_SUMMARY = 300;

// The first sentence of a post's body as plain text, for search results and link previews.
export function newsSummary(item: NewsItem) {
	const text = (item.body ?? "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/<[^>]+>/g, " ")
		.replace(/^\s*(?:#+|[-*+]|\d+\.)\s+/gm, "")
		.replace(/\*\*|__|[*`]/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.replace(/ ([.,;:!?)])/g, "$1")
		.trim();
	let summary = text;
	for (const m of text.matchAll(/[.!?](?=\s|$)/g)) {
		const sentence = text.slice(0, m.index + 1);
		if (!NOT_SENTENCE_END.test(sentence)) {
			summary = sentence;
			break;
		}
	}
	if (summary.length > MAX_SUMMARY) summary = `${summary.slice(0, summary.lastIndexOf(" ", MAX_SUMMARY - 1))}…`;
	return summary || undefined;
}
