import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { glob, type Loader } from "astro/loaders";

// [text]() or [text](<>); the text may span lines and contain [brackets].
const EMPTY_LINK = /\[((?:[^[\]]|\[[^\]]*\])*)\]\(\s*(?:<\s*>)?\s*\)/g;

// The glob loader for the Markdown files in `base`, plus a warning for each link
// with an empty URL, naming the file and line. Checks a file again when it changes in dev.
export function markdownWithLinkCheck(base: string): Loader {
	const loader = glob({ base, pattern: "**/*.md" });
	const dir = resolve(base) + sep;
	return {
		...loader,
		load: async (context) => {
			await loader.load(context);

			const check = async (path: string) => {
				const text = await readFile(path, "utf8").catch(() => undefined);
				if (text === undefined) return;
				for (const m of text.matchAll(EMPTY_LINK)) {
					const line = text.slice(0, m.index).split("\n").length;
					const label = m[1].replace(/\s+/g, " ").trim();
					context.logger.warn(`${relative(process.cwd(), path)}:${line}: link "${label}" has an empty URL`);
				}
			};

			for (const entry of context.store.values()) {
				if (entry.filePath) await check(resolve(entry.filePath));
			}

			const onChange = (path: string) => {
				if (path.startsWith(dir) && path.endsWith(".md")) check(path);
			};
			context.watcher?.on("change", onChange);
			context.watcher?.on("add", onChange);
		},
	};
}
