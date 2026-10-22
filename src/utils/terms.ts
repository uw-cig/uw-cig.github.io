// Academic terms of the form "Spring 2026", "Summer 2026", "Fall 2026".
export const TERM = /^(Spring|Summer|Fall) (\d{4})$/;

export const SEASONS = ["Spring", "Summer", "Fall"] as const;

// Orders terms chronologically: Spring < Summer < Fall within a year.
export const termKey = (term: string) => {
	const [, season, year] = TERM.exec(term)!;
	return Number(year) * 3 + SEASONS.indexOf(season as (typeof SEASONS)[number]);
};
