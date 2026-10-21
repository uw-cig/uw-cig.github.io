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
