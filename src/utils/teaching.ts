import { getCollection, type CollectionEntry } from "astro:content";

export type Course = CollectionEntry<"teaching">;

export const courseUrl = (course: Course) => `/teaching/${course.id}/`;

// All courses, newest term first; courses in the same term by course code.
export async function getCourses() {
	return (await getCollection("teaching")).sort(
		(a, b) => b.data.termOrder - a.data.termOrder || a.data.course.localeCompare(b.data.course),
	);
}

// The course header already shows the code, term and institution, so drop the
// "Course Information" section: its heading and everything up to the next heading.
const COURSE_INFO = /<h([1-6])\b[^>]*>\s*Course Information\s*<\/h\1>[\s\S]*?(?=<h[1-6]\b|$)/i;

export const courseBodyHtml = (course: Course) => (course.rendered?.html ?? "").replace(COURSE_INFO, "");
