// Generates public/og-default.png, the 1200×630 link-preview image.
// Run from the project root: node scripts/make-og-image.mjs
// Names come from src/data/site.yml and colors from src/styles/global.css.
// Text uses the system UI font, as on the site, so the result depends on
// the fonts installed; commit the PNG after regenerating it.
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { parse } from "yaml";

const site = parse(readFileSync("src/data/site.yml", "utf8"));
const css = readFileSync("src/styles/global.css", "utf8");
const color = (name) => {
	const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`));
	if (!match) throw new Error(`src/styles/global.css: --color-${name} not found`);
	return match[1];
};
const [background, ink, muted, accent] = ["background", "ink", "muted", "accent"].map(color);

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const font = "-apple-system, system-ui, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO = 200; // rendered size of the 32×32 favicon rings

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
	<rect width="100%" height="100%" fill="${background}"/>
	<g transform="translate(${(WIDTH - LOGO) / 2} 110) scale(${LOGO / 32})" fill="none" stroke="${accent}" stroke-linecap="round">
		<circle cx="16" cy="16" r="3.6" fill="${accent}" stroke="none"/>
		<circle cx="16" cy="16" r="8" stroke-width="2.2"/>
		<circle cx="16" cy="16" r="11.8" stroke-width="1.8" stroke-opacity="0.6"/>
		<circle cx="16" cy="16" r="14.9" stroke-width="1.4" stroke-opacity="0.3"/>
	</g>
	<text x="${WIDTH / 2}" y="412" text-anchor="middle" font-family="${font}" font-size="64" font-weight="600" fill="${ink}">${escape(site.name)}</text>
	<rect x="${WIDTH / 2 - 40}" y="448" width="80" height="4" fill="${accent}"/>
	<text x="${WIDTH / 2}" y="512" text-anchor="middle" font-family="${font}" font-size="34" fill="${muted}">${escape(site.university)}</text>
</svg>`;

await sharp(Buffer.from(svg)).flatten({ background }).png().toFile("public/og-default.png");
console.log(`public/og-default.png (${WIDTH}×${HEIGHT})`);
