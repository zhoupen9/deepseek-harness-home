window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-file-mentions",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const attachment = require("@deepseek-ai/dsh-client-ui-attachment");
		const MessageText = primitives.MessageText;
		const JsonBlock = primitives.JsonBlock;
		const IconCopyOutline16 = primitives.IconCopyOutline16;
		const IconCheckOutline16 = primitives.IconCheckOutline16;
		const writeClipboard = primitives.writeClipboard;
		const ImageGallery = attachment.ImageGallery;
		const h = React.createElement;
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
		/** Leading candidate/chip icon for a regular file (U+1F4C4). */
		const FILE_ICON = String.fromCodePoint(0x1F4C4);
		/** Leading candidate/chip icon for a directory (U+1F4C1). */
		const DIR_ICON = String.fromCodePoint(0x1F4C1);
		/** Invisible disambiguation suffix (zero-width space) keeping menu keys unique. */
		const ZWSP = String.fromCodePoint(0x200B);
		/**
		* Last path segment of a forward-slash path (listProjectFiles rel is
		* forward-slash normalized).
		* @param path - the path to reduce.
		* @returns the basename (filename or directory name).
		*/
		function baseName(path) {
			const at = path.lastIndexOf("/");
			return at === -1 ? path : path.slice(at + 1);
		}
		/**
		* Project-relative path of the entry's containing directory. Empty string
		* when the entry sits directly under the project root, in which case the
		* menu omits the path.
		* @param rel - the entry's forward-slash relative path.
		* @returns the parent directory's relative path ("" at the top level).
		*/
		function parentRel(rel) {
			const at = rel.lastIndexOf("/");
			return at === -1 ? "" : rel.slice(0, at);
		}
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
		//#region src/client/message-view.ts
		/** Injected stylesheet for the overridden user-message bubble (file mentions). */
		const MESSAGE_VIEW_CSS = [
			".dfm-userRow { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }",
			".dfm-userStack { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width: 0; max-width: min(525px, 82%); }",
			".dfm-bubble { max-width: 100%; background: var(--dsw-specific-bubble); border-radius: 22px; padding: 10px 16px; font-size: 16px; line-height: 24px; color: var(--dsw-alias-label-primary); }",
			".dfm-chip { display: inline-block; margin: 0 2px; padding: 0 8px; border-radius: 6px; background: rgba(97, 135, 216, 0.22); color: var(--dsw-alias-label-primary); font-size: 0.85em; line-height: 1.6; white-space: nowrap; vertical-align: baseline; }",
			".dfm-actions { display: flex; align-items: center; gap: 10px; height: 28px; }",
			".dfm-time { padding-right: 12px; font-size: 14px; line-height: 24px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }",
			".dfm-action { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 6px; border: none; border-radius: 28px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }",
			".dfm-action:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }"
		].join("\n");
		const MESSAGE_VIEW_STYLE_ID = "@deepseek-ai/dsh-client-ui-file-mentions/message-view.css";
		if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + MESSAGE_VIEW_STYLE_ID + '"]') === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-file-mentions";
			tag.dataset.pluginCss = MESSAGE_VIEW_STYLE_ID;
			tag.textContent = MESSAGE_VIEW_CSS;
			document.head.appendChild(tag);
		}
		/**
		* Split a user message's content into its joined text, images, and other blocks
		* (the same partition the stock user bubble uses).
		*/
		function contentParts(content) {
			const texts = [];
			const images = [];
			const rest = [];
			for (const block of content ?? []) {
				if (block !== null && typeof block === "object" && block.type === "text" && typeof block.text === "string") texts.push(block.text);
				else if (block !== null && typeof block === "object" && block.type === "image" && block.attachment !== void 0) images.push({ attachment: block.attachment });
				else rest.push(block);
			}
			return { text: texts.join(""), images, rest };
		}
		/** Hardcoded message-image labels (this plugin owns no locale namespace). */
		function messageImageLabels() {
			return {
				image: "Image",
				open: "Open original",
				openNamed: (label) => "Open " + label,
				loading: "Loading image",
				loadFailed: "Image failed to load",
				lightbox: { dialog: "Image preview", close: "Close preview" }
			};
		}
		/** Simple clock label for a Unix-epoch-ms timestamp. */
		function formatClock(time) {
			if (time === void 0 || time === null) return null;
			try {
				return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
			} catch (error) {
				return null;
			}
		}
		/**
		* Decorate plain-text skill/subagent references (the stock bubble behavior):
		* /name and @name tokens render as chips, everything else stays MessageText.
		* @param text - plain text segment.
		* @returns a MessageText element or a fragment of MessageText + chips.
		*/
		function decorateRefs(text) {
			const re = /(^|\s)([/@][\w-]+)(?=\s|$)/g;
			const parts = [];
			let cursor = 0;
			let m;
			while ((m = re.exec(text)) !== null) {
				const tokenStart = m.index + (m[1] ? m[1].length : 0);
				const label = m[2] || "";
				if (tokenStart > cursor) parts.push(h(MessageText, { key: cursor, text: text.slice(cursor, tokenStart) }));
				parts.push(h("span", { key: tokenStart, className: "dfm-chip", "data-ref-chip": label.startsWith("@") ? "subagent" : "skill" }, label));
				cursor = tokenStart + label.length;
			}
			if (parts.length === 0) return h(MessageText, { text });
			if (cursor < text.length) parts.push(h(MessageText, { key: cursor, text: text.slice(cursor) }));
			return h(React.Fragment, null, parts);
		}
		/**
		* Project a user message's text into nodes: <file>/<directory> serialized spans
		* collapse to icon + basename chips (content hidden), while the plain spans
		* between them keep the stock /name @name chip decoration.
		* @param text - the joined user text.
		* @returns the rendered nodes (fragment, MessageText, or chips).
		*/
		function projectMentionText(text) {
			if (text === "") return null;
			const re = /<(file|directory)([^>]*)>([\s\S]*?)<\/\1>/g;
			const out = [];
			let cursor = 0;
			let m;
			let hasTag = false;
			while ((m = re.exec(text)) !== null) {
				hasTag = true;
				if (m.index > cursor) out.push(h(React.Fragment, { key: "t" + cursor }, decorateRefs(text.slice(cursor, m.index))));
				const kind = m[1] === "directory" ? "dir" : "file";
				const attrs = m[2];
				const pathMatch = /path="([^"]*)"/.exec(attrs);
				const path = pathMatch ? pathMatch[1] : "";
				const icon = kind === "dir" ? DIR_ICON : FILE_ICON;
				out.push(h("span", { key: "m" + m.index, className: "dfm-chip", "data-file-mention": kind, title: path }, icon + " " + baseName(path)));
				cursor = m.index + m[0].length;
			}
			if (!hasTag) return decorateRefs(text);
			if (cursor < text.length) out.push(h(React.Fragment, { key: "t" + cursor }, decorateRefs(text.slice(cursor))));
			return h(React.Fragment, null, out);
		}
		/**
		* The overridden user-message renderer: shadows the stock UserMessageNodeView
		* for the 'user' key so file/directory mentions render as tags, not content.
		* @param props - composed 'conversation.chat.node' props (node, loadImage, ...).
		* @returns the user bubble.
		*/
		function UserMessageMentionView(props) {
			const data = props.node !== void 0 && props.node.data !== void 0 ? props.node.data : {};
			const content = data.content;
			const { text, images, rest } = contentParts(content);
			const [copied, setCopied] = React.useState(false);
			const copy = () => {
				if (copied) return;
				void writeClipboard(text).then((ok) => {
					if (!ok) return;
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1000);
				});
			};
			const showBubble = text !== "" || rest.length > 0;
			const timeLabel = formatClock(data.time);
			return h("div", { className: "dfm-userRow" },
				h("div", { className: "dfm-userStack" },
					images.length > 0 ? h(ImageGallery, { images, load: props.loadImage, align: "end", labels: messageImageLabels() }) : null,
					showBubble ? h("div", { className: "dfm-bubble" },
						projectMentionText(text),
						rest.map((block, i) => h(JsonBlock, { key: i, label: "Block", payload: block }))
					) : null
				),
				h("div", { className: "dfm-actions" },
					timeLabel !== null ? h("span", { className: "dfm-time" }, timeLabel) : null,
					h("button", { type: "button", className: "dfm-action", "aria-label": copied ? "Copied" : "Copy", title: copied ? "Copied" : "Copy", onClick: copy },
						copied ? h(IconCheckOutline16) : h(IconCopyOutline16)
					)
				)
			);
		}
		/**
		* Register the shadowing user-message renderer (priority -1 wins the 'user'
		* keyed cell over the stock renderer's default priority 0).
		* @param ctx - client root context.
		* @returns the registration disposer.
		*/
		function registerMessageView(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return () => {};
			return slots.inject("conversation.chat.node", () => slots.register(
				{ name: "conversation.chat.node", key: "user", priority: -1 },
				UserMessageMentionView
			));
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services for the source and root resolution. */
		const inject = [
			"inputTriggers",
			"sessions",
			"workspaces",
			"slots"
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
						const entries = fuzzyFilter(await list(root, signal), (entry) => entry.rel, query).slice(0, 50);
						// MenuView keys rows by candidate name, so a repeated basename
						// (e.g. several index.ts) gets an invisible suffix to keep the
						// React key unique; the visible label stays the bare name.
						const seen = new Map();
						return entries.map((entry) => {
							const base = entry.name;
							let count = seen.get(base);
							if (count === void 0) count = 0;
							seen.set(base, count + 1);
							const name = count === 0 ? base : base + ZWSP.repeat(count);
							const parent = parentRel(entry.rel);
							return {
								name,
								icon: entry.kind === "dir" ? DIR_ICON : FILE_ICON,
								...(parent === "" ? {} : { description: parent }),
								entry
							};
						});
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
					const entry = candidate.entry;
					if (entry === void 0) return void 0;
					const icon = entry.kind === "dir" ? DIR_ICON : FILE_ICON;
					return { insert: {
						source: "file",
						ref: entry.kind === "file" ? encodeFileRef(entry.path) : encodeDirRef(entry.path),
						label: icon + " " + entry.name,
						clipboardText: "@" + entry.name
					} };
				},
				codec: {
					clipboardText(ref) {
						return "@" + baseName(relOf(decodeRef(ref).path));
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
			ctx.effect(() => registerMessageView(ctx), "ui-file-mentions: user message view");
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
