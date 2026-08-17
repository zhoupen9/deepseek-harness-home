window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-file-mentions",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/core/fuzzy.ts
		/**
		* Pure fuzzy subsequence matching for @-mention file candidates. Zero deps,
		* zero DOM. The greedy-leftmost scorer is deliberately distinct from the
		* command-surface matcher (ui-commands) so the two stay clone-free.
		*/
		/** Path boundary chars earn extra weight when a query char lands on them. */
		const BOUNDARY = new Set([
			"/",
			".",
			"-",
			"_"
		]);
		/**
		* Boundary bonus: a query char at index 0 or right after a path separator or
		* name separator is a strong match signal.
		* @param haystack - the string being matched within.
		* @param index - the matched char's position.
		* @returns the bonus (8 at a boundary, 0 elsewhere).
		*/
		function boundaryBonus(haystack, index) {
			return index === 0 || BOUNDARY.has(haystack.charAt(index - 1)) ? 8 : 0;
		}
		/**
		* Score the greedy leftmost-subsequence alignment of `query` within
		* `haystack`. Existence follows the standard two-pointer scan (correct); the
		* score ranks candidates: +1 per match, +8 per boundary match, +4 per
		* consecutive match, -1 per skipped haystack character.
		* @param haystack - the string to match within (lowercased by the caller).
		* @param query - the query (lowercased by the caller).
		* @returns the alignment score, or undefined when no subsequence exists.
		*/
		function fuzzyScore(haystack, query) {
			if (query === "") return 0;
			if (query.length > haystack.length) return void 0;
			let score = 0;
			let cursor = 0;
			let previous = -2;
			for (let q = 0; q < query.length; q++) {
				const target = query.charAt(q);
				let found = -1;
				for (let scan = cursor; scan < haystack.length; scan++) if (haystack.charAt(scan) === target) {
					found = scan;
					break;
				}
				if (found === -1) return void 0;
				score += 1 + boundaryBonus(haystack, found) + (found === previous + 1 ? 4 : 0) - (found - cursor);
				previous = found;
				cursor = found + 1;
			}
			return score;
		}
		/**
		* Case-insensitive fuzzy filter over a keyed item list, ordered by prefix match
		* first, then score, then original index (stable). Returns the input unchanged
		* when the query is blank.
		* @param items - the candidate items.
		* @param keyOf - extracts the matchable string from one item.
		* @param query - the raw query text.
		* @returns matching items in display order.
		*/
		function fuzzyFilter(items, keyOf, query) {
			const q = query.toLowerCase();
			if (q === "") return items;
			const ranked = [];
			items.forEach((item, index) => {
				const score = fuzzyScore(keyOf(item).toLowerCase(), q);
				if (score !== void 0) ranked.push({
					item,
					index,
					score
				});
			});
			ranked.sort((left, right) => {
				const leftPrefix = keyOf(left.item).toLowerCase().startsWith(q) ? 1 : 0;
				return (keyOf(right.item).toLowerCase().startsWith(q) ? 1 : 0) - leftPrefix || right.score - left.score || left.index - right.index;
			});
			return ranked.map((match) => match.item);
		}
		//#endregion
		//#region src/client/files.ts
		/** Default listing caps: keep the common case config-free. */
		const DEFAULT_CONFIG = {
			maxDepth: 12,
			maxEntries: 500
		};
		/**
		* Resolve the project root to enumerate: the current session's cwd wins, then
		* the recent workspace path, then undefined (empty candidate group).
		* @param currentCwd - cwd of the current session, when known.
		* @param recentWorkspacePath - path of the most recently active workspace, when known.
		* @returns the root directory path, or undefined when neither is available.
		*/
		function resolveRoot(currentCwd, recentWorkspacePath) {
			if (currentCwd !== void 0 && currentCwd !== "") return currentCwd;
			if (recentWorkspacePath !== void 0 && recentWorkspacePath !== "") return recentWorkspacePath;
		}
		/** Escape a filesystem path for a double-quoted attribute. */
		function escapeAttr(value) {
			return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
		}
		/**
		* Serialize one file mention into its model-visible form.
		* @param value - the host readFile result.
		* @returns the wrapped content (empty body plus a binary flag for binary files).
		*/
		function formatFile(value) {
			const attrs = ["path=\"" + escapeAttr(value.path) + "\""];
			if (value.binary) {
				attrs.push("binary=\"true\"");
				return "<file " + attrs.join(" ") + "></file>";
			}
			if (value.truncated) attrs.push("truncated=\"true\"");
			return [
				"<file " + attrs.join(" ") + ">",
				value.text,
				"</file>"
			].join("\n");
		}
		/**
		* Serialize one directory mention into its model-visible form: the relative
		* path of every file and directory under it, one per line.
		* @param path - the directory's absolute path.
		* @param entries - the flattened listing (rel paths already relative to `path`).
		* @returns the wrapped listing.
		*/
		function formatDirectory(path, entries) {
			const lines = entries.map((entry) => entry.kind === "dir" ? entry.rel + "/" : entry.rel);
			return [
				"<directory path=\"" + escapeAttr(path) + "\">",
				...lines,
				"</directory>"
			].join("\n");
		}
		/**
		* Prefix a file path into its reference id.
		* @param path - the file's absolute host path.
		* @returns the reference id.
		*/
		function encodeFileRef(path) {
			return "file:" + path;
		}
		/**
		* Prefix a directory path into its reference id.
		* @param path - the directory's absolute host path.
		* @returns the reference id.
		*/
		function encodeDirRef(path) {
			return "dir:" + path;
		}
		/**
		* Split a reference id back into its kind and absolute path.
		* @param ref - the reference id produced by encodeFileRef / encodeDirRef.
		* @returns the decoded kind and path.
		* @throws when the ref carries neither prefix.
		*/
		function decodeRef(ref) {
			if (ref.startsWith("file:")) return {
				kind: "file",
				path: ref.slice(5)
			};
			if (ref.startsWith("dir:")) return {
				kind: "dir",
				path: ref.slice(4)
			};
			throw new Error("file-mentions: malformed reference \"" + ref + "\"");
		}
		//#endregion
		//#region src/client/locales.ts
		/** `file-mentions` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "file-mentions";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = { "desc.directory": "目录" };
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = { "desc.directory": "directory" };
		//#endregion
		//#region src/client/index.ts
		/** Required services for the source, root resolution, and locale. */
		const inject = [
			"inputTriggers",
			"sessions",
			"workspaces",
			"locale"
		];
		/**
		* Client plugin body: register the '@' file source over the workspaces service.
		* @param ctx - client root context.
		* @param config - optional overrides for the listing caps (validated, fail loud).
		*/
		function apply(ctx, config) {
			const cfg = validateConfig({
				...DEFAULT_CONFIG,
				...config
			});
			ctx.effect(() => {
				const offZh = ctx.locale.register(NS, "zh", zh);
				const offEn = ctx.locale.register(NS, "en", en);
				return () => {
					offZh();
					offEn();
				};
			}, "ui-file-mentions: dictionaries");
			const t = ctx.locale.bind(NS);
			let cache;
			const rootOf = () => {
				const sessions = ctx.sessions.list.getSnapshot();
				const workspaces = ctx.workspaces.list.getSnapshot();
				return resolveRoot(sessions.current === void 0 ? void 0 : sessions.byId[sessions.current]?.cwd, workspaces.recentWorkspaceId === void 0 ? void 0 : workspaces.items.find((item) => item.workspaceId === workspaces.recentWorkspaceId)?.path);
			};
			const list = async (root, signal) => {
				if (cache !== void 0 && cache.root === root && !cache.abort.signal.aborted) return cache.entries;
				cache?.abort.abort();
				const listing = await ctx.workspaces.listProjectFiles(root, {
					maxDepth: cfg.maxDepth,
					maxEntries: cfg.maxEntries
				}, signal);
				cache = {
					root,
					entries: listing.entries,
					abort: new AbortController()
				};
				return listing.entries;
			};
			const relOf = (path) => {
				const root = cache?.root;
				if (root !== void 0 && path.startsWith(root)) {
					const rel = path.slice(root.length);
					return rel.startsWith("/") ? rel.slice(1) : rel;
				}
				return path;
			};
			const source = {
				trigger: "@",
				name: "file",
				order: 1,
				async candidates(_session, { query, signal }) {
					const root = rootOf();
					if (root === void 0) return [];
					try {
						return fuzzyFilter(await list(root, signal), (entry) => entry.rel, query).slice(0, 50).map((entry) => ({
							name: entry.rel,
							...entry.kind === "dir" ? { description: t("desc.directory") } : {}
						}));
					} catch (error) {
						console.warn("file-mentions: candidates failed", error);
						return [];
					}
				},
				warm() {
					const root = rootOf();
					if (root !== void 0) list(root, new AbortController().signal).catch(() => {});
				},
				onPick({ candidate }) {
					const entry = cache?.entries.find((item) => item.rel === candidate.name);
					if (entry === void 0) return void 0;
					return { insert: {
						source: "file",
						ref: entry.kind === "file" ? encodeFileRef(entry.path) : encodeDirRef(entry.path),
						label: entry.kind === "dir" ? entry.rel + "/" : entry.rel,
						clipboardText: "@" + entry.rel
					} };
				},
				codec: {
					clipboardText(ref) {
						return "@" + relOf(decodeRef(ref).path);
					},
					async serialize(ref, signal) {
						const decoded = decodeRef(ref);
						if (decoded.kind === "file") return formatFile(await ctx.workspaces.readFile(decoded.path, signal));
						const listing = await ctx.workspaces.listProjectFiles(decoded.path, {
							maxDepth: cfg.maxDepth,
							maxEntries: cfg.maxEntries
						}, signal);
						return formatDirectory(decoded.path, listing.entries);
					}
				}
			};
			const inputTriggers = ctx.get("inputTriggers");
			ctx.effect(() => inputTriggers.registerSource(source), "ui-file-mentions: @ source");
		}
		/**
		* Validate the merged config; fail loud on a non-positive integer.
		* @param config - the merged config to validate.
		* @returns the validated config.
		*/
		function validateConfig(config) {
			for (const key of ["maxDepth", "maxEntries"]) {
				const value = config[key];
				if (!Number.isInteger(value) || value <= 0) throw new Error("file-mentions: config." + key + " must be a positive integer");
			}
			return config;
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map