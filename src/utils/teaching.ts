import { getCollection, type CollectionEntry } from "astro:content";

export type Course = CollectionEntry<"teaching">;

export const courseUrl = (course: Course) => `/teaching/${course.id}/`;

// All courses, newest term first; courses in the same term by course code.
export async function getCourses() {
	return (await getCollection("teaching")).sort(
		(a, b) => b.data.termOrder - a.data.termOrder || a.data.course.localeCompare(b.data.course),
	);
}

// The course's rendered Markdown body, every section included.
export const courseBodyHtml = (course: Course) => course.rendered?.html ?? "";
