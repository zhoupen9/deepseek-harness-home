window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-files",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/files-explorer.ts
		/**
		* Canonical per-level order: directories before files, each alphabetical
		* (case-sensitive). Mirrors the Host sort promised by HOST_PRIMITIVES.md so a
		* client that re-sorts a level never disagrees with the wire order.
		* @param entries - one level's children, any order.
		* @returns the children in canonical order.
		*/
		function sortEntries(entries) {
			return [...entries].sort((left, right) => {
				if (left.kind !== right.kind) return left.kind === "dir" ? -1 : 1;
				return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
			});
		}
		/**
		* Every ancestor directory path of an absolute path, outermost first
		* (`/a/b/c.ts` -> `['/a', '/a/b']`). Used to auto-expand the tree to a target.
		* @param path - an absolute path.
		* @returns the ancestor directory paths.
		*/
		function ancestorPaths(path) {
			const out = [];
			const segments = path.split("/");
			let accumulated = "";
			for (let i = 1; i < segments.length - 1; i++) {
				const segment = segments[i];
				if (segment === "" || segment === ".") continue;
				accumulated = accumulated === "" ? "/" + segment : accumulated + "/" + segment;
				out.push(accumulated);
			}
			return out;
		}
		/**
		* Human-readable byte size (`1023` -> `1023 B`, `1536` -> `1.5 KB`).
		* @param size - byte count.
		* @returns the compact label.
		*/
		function formatSize(size) {
			if (size < 1024) return size + " B";
			const units = [
				"KB",
				"MB",
				"GB",
				"TB"
			];
			let value = size;
			let unit = -1;
			do {
				value /= 1024;
				unit += 1;
			} while (value >= 1024 && unit < units.length - 1);
			const digits = value >= 100 ? 0 : 1;
			return value.toFixed(digits) + " " + units[unit];
		}
		/** One-character marker shown for each VCS status (git's own short letters). */
		const VCS_MARKERS = {
			modified: "M",
			added: "A",
			deleted: "D",
			renamed: "R",
			untracked: "U",
			ignored: "I",
			conflicted: "!"
		};
		/**
		* Presentation color per VCS status. The tracked-change states use the fixed
		* GitHub/VSCode palette; the two "not tracked" states (untracked and ignored)
		* use the theme's secondary text color so they read as muted gray in BOTH
		* light and dark themes, matching the directory dirty dot's `--dsh-text-secondary`.
		*/
		const VCS_COLORS = {
			modified: "#d29922",
			added: "#3fb950",
			deleted: "#f85149",
			renamed: "#bc8cff",
			untracked: "var(--dsh-text-secondary, #8b949e)",
			ignored: "var(--dsh-text-secondary, #8b949e)",
			conflicted: "#f85149"
		};
		/**
		* The one-character marker for a VCS status.
		* @param status - the notable status.
		* @returns the marker letter ('' for an unknown status).
		*/
		function vcsMarker(status) {
			return VCS_MARKERS[status] ?? "";
		}
		//#endregion
		//#region src/client/files-lang.ts
		/**
		* File-extension → syntax-highlighting language hints for the Files view.
		* Mirrors the `read` tool's own extension table (packages/fs/tool-fs
		* read-render.ts) so the Files view and the chat's read cards highlight the
		* same file the same way; the ids are the aliases the shared ReadBlock /
		* shiki highlighter resolves (py→python, sh→shellscript, md→markdown, ...).
		* @module @deepseek-ai/dsh-client-ui-files/client
		*/
		/** Extension (without dot, lower-cased) → language hint. */
		const LANG_BY_EXTENSION = {
			ts: "ts",
			tsx: "tsx",
			mts: "ts",
			cts: "ts",
			js: "js",
			jsx: "jsx",
			mjs: "js",
			cjs: "js",
			json: "json",
			jsonc: "json",
			py: "py",
			rb: "rb",
			go: "go",
			rs: "rs",
			java: "java",
			c: "c",
			h: "c",
			cc: "cpp",
			cpp: "cpp",
			hpp: "cpp",
			cxx: "cpp",
			cs: "cs",
			kt: "kotlin",
			swift: "swift",
			php: "php",
			sh: "sh",
			bash: "sh",
			zsh: "sh",
			yaml: "yaml",
			yml: "yaml",
			toml: "toml",
			ini: "ini",
			md: "md",
			markdown: "md",
			mdx: "mdx",
			html: "html",
			htm: "html",
			css: "css",
			scss: "scss",
			less: "less",
			sql: "sql",
			xml: "xml",
			lua: "lua"
		};
		/**
		* Derive a syntax-highlighting language hint from a path's file extension.
		* Pure and case-insensitive on the extension; a dotfile with no extension
		* (`.gitignore`) and an unknown extension both yield undefined (plain
		* monospace in ReadBlock — never an error).
		* @param path - the model-facing path.
		* @returns the language hint, or undefined when the extension maps to none.
		*/
		function langFromPath(path) {
			const base = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
			const dot = base.lastIndexOf(".");
			if (dot <= 0) return void 0;
			const ext = base.slice(dot + 1).toLowerCase();
			return Object.hasOwn(LANG_BY_EXTENSION, ext) ? LANG_BY_EXTENSION[ext] : void 0;
		}
		//#endregion
		//#region src/client/files-search.ts
		/** Find every non-overlapping, case-insensitive occurrence of a query. */
		function findMatches(lines, query) {
			const needle = query.toLowerCase();
			if (needle.length === 0) return [];
			const out = [];
			for (let i = 0; i < lines.length; i++) {
				const hay = lines[i].text.toLowerCase();
				let from = 0;
				for (;;) {
					const at = hay.indexOf(needle, from);
					if (at === -1) break;
					out.push({
						line: i,
						start: at,
						end: at + query.length,
						id: out.length
					});
					from = at + query.length;
				}
			}
			return out;
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-files/src/client/FileContentPane.module.css.mjs
		const css$2 = ".C-xvJq_pane{flex-direction:column;height:100%;min-height:0;display:flex}.C-xvJq_empty{color:var(--dsh-text-secondary,#8b949e);padding:24px 16px;font-size:14px}.C-xvJq_header{border-bottom:1px solid var(--dsh-border,#30363d);align-items:center;gap:8px;min-width:0;padding:8px 12px;display:flex}.C-xvJq_path{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex:1;font-size:12px;overflow:hidden}.C-xvJq_badge{background:var(--dsh-badge-bg,#7f7f7f29);color:var(--dsh-text-secondary,#8b949e);border-radius:10px;flex:none;padding:1px 8px;font-size:11px;line-height:18px}.C-xvJq_note{color:var(--dsh-warning,#d29922);flex:none;font-size:12px}.C-xvJq_body{flex:1;min-height:0;overflow:auto}.C-xvJq_searchButton{width:24px;height:24px;color:var(--dsh-text-secondary,#8b949e);cursor:pointer;background:0 0;border:1px solid #0000;border-radius:6px;flex:none;justify-content:center;align-items:center;font-size:13px;line-height:1;display:inline-flex}.C-xvJq_searchButton:hover{background:var(--dsh-badge-bg,#7f7f7f29);color:var(--dsh-text-primary,#e6edf3)}.C-xvJq_searchBar{border-bottom:1px solid var(--dsh-border,#30363d);background:var(--dsh-bg-subtle,#7f7f7f0f);align-items:center;gap:6px;padding:6px 12px;display:flex}.C-xvJq_searchInput{border:1px solid var(--dsh-border,#30363d);background:var(--dsh-input-bg,#0d1117);min-width:0;height:26px;color:var(--dsh-text-primary,#e6edf3);border-radius:6px;flex:1;padding:0 8px;font-size:13px}.C-xvJq_searchInput:focus{border-color:var(--dsh-accent,#2f81f7);outline:none}.C-xvJq_matchCount{color:var(--dsh-text-secondary,#8b949e);white-space:nowrap;flex:none;font-size:12px}.C-xvJq_searchNav{min-width:24px;height:24px;color:var(--dsh-text-secondary,#8b949e);cursor:pointer;background:0 0;border:1px solid #0000;border-radius:6px;flex:none;justify-content:center;align-items:center;font-size:13px;line-height:1;display:inline-flex}.C-xvJq_searchNav:hover{background:var(--dsh-badge-bg,#7f7f7f29);color:var(--dsh-text-primary,#e6edf3)}.C-xvJq_searchResults{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);padding:12px 0;font-size:13px;line-height:22px}.C-xvJq_line{white-space:pre;min-height:22px;display:flex}.C-xvJq_gutter{text-align:right;width:48px;color:var(--dsh-text-secondary,#8b949e);user-select:none;flex:none;padding-right:14px}.C-xvJq_lineContent{color:var(--dsh-text-primary,#e6edf3)}.C-xvJq_match{background:var(--dsh-search-match,#d2992259);color:inherit;border-radius:2px}.C-xvJq_matchActive{background:var(--dsh-search-match-active,#f2893aa6);color:inherit;border-radius:2px}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-files/FileContentPane.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-files";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var FileContentPane_module_css_default = {
			"badge": "C-xvJq_badge",
			"body": "C-xvJq_body",
			"empty": "C-xvJq_empty",
			"gutter": "C-xvJq_gutter",
			"header": "C-xvJq_header",
			"line": "C-xvJq_line",
			"lineContent": "C-xvJq_lineContent",
			"match": "C-xvJq_match",
			"matchActive": "C-xvJq_matchActive",
			"matchCount": "C-xvJq_matchCount",
			"note": "C-xvJq_note",
			"pane": "C-xvJq_pane",
			"path": "C-xvJq_path",
			"searchBar": "C-xvJq_searchBar",
			"searchButton": "C-xvJq_searchButton",
			"searchInput": "C-xvJq_searchInput",
			"searchNav": "C-xvJq_searchNav",
			"searchResults": "C-xvJq_searchResults"
		};
		//#endregion
		//#region src/client/FileContentPane.tsx
		/**
		* Shared file-content pane: the right side of the Files tab. Renders one
		* file's text as a line-numbered,
		* extension-highlighted ReadBlock, with explicit loading / error / binary
		* states for the live (host-read) path and the session-known reconstruction.
		* A header search control finds every occurrence of a query in the shown
		* content, highlights them all, and steps an active cursor through them.
		*/
		/** Content lines the pane shows before truncating (matches the read tool's cap). */
		const FILES_MAX_CONTENT_LINES = 2e3;
		/** Localized ReadBlock chrome. */
		function readLabels(t) {
			return {
				window: (shown, total) => t("content.window", {
					shown: String(shown),
					total: String(total)
				}),
				copy: t("content.copy"),
				copied: t("content.copied"),
				collapseAria: t("content.collapseAria"),
				expandAria: (hidden) => t("content.expandAria", { hidden }),
				collapse: t("content.collapse"),
				expand: (hidden) => t("content.expand", { hidden })
			};
		}
		/** Split a line's text around its matches, marking the active one for navigation. */
		function renderHighlighted(text, spans, activeId) {
			const nodes = [];
			let cursor = 0;
			for (const span of spans) {
				if (span.start > cursor) nodes.push(text.slice(cursor, span.start));
				nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mark", {
					id: `files-match-${span.id}`,
					className: span.id === activeId ? FileContentPane_module_css_default.matchActive : FileContentPane_module_css_default.match,
					children: text.slice(span.start, span.end)
				}, span.id));
				cursor = span.end;
			}
			if (cursor < text.length) nodes.push(text.slice(cursor));
			return nodes;
		}
		/**
		* Render one file's content as a line-numbered, syntax-highlighted view, with
		* an optional search bar that highlights every match and steps through them.
		* @param props - content facts and the locale seat.
		* @returns the content pane element.
		*/
		function FileContentPane({ path, content, binary, loading, error, badge, note, t }) {
			const [query, setQuery] = (0, react.useState)("");
			const [searchOpen, setSearchOpen] = (0, react.useState)(false);
			const [activeMatch, setActiveMatch] = (0, react.useState)(0);
			const searchInput = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setQuery("");
				setSearchOpen(false);
				setActiveMatch(0);
			}, [path]);
			const lang = path === void 0 ? void 0 : langFromPath(path);
			const lines = (content ?? "").split("\n");
			if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
			const displayTruncated = lines.length > FILES_MAX_CONTENT_LINES;
			const visible = displayTruncated ? lines.slice(0, FILES_MAX_CONTENT_LINES) : lines;
			const numbered = visible.map((text, index) => ({
				number: index + 1,
				text
			}));
			const matches = findMatches(numbered, query);
			const matchesByLine = /* @__PURE__ */ new Map();
			for (const match of matches) {
				const list = matchesByLine.get(match.line);
				if (list === void 0) matchesByLine.set(match.line, [match]);
				else list.push(match);
			}
			(0, react.useEffect)(() => {
				if (matches.length === 0) {
					if (activeMatch !== 0) setActiveMatch(0);
					return;
				}
				if (activeMatch >= matches.length) setActiveMatch(0);
			}, [matches.length, activeMatch]);
			(0, react.useEffect)(() => {
				if (matches.length === 0) return;
				const active = matches[Math.min(activeMatch, matches.length - 1)];
				if (active === void 0) return;
				document.getElementById(`files-match-${active.id}`)?.scrollIntoView({ block: "center" });
			}, [activeMatch, matches]);
			if (path === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: FileContentPane_module_css_default.empty,
				children: t("content.noContent")
			});
			const searching = searchOpen && query.length > 0;
			const step = (delta) => {
				if (matches.length === 0) return;
				setActiveMatch((index) => (index + delta + matches.length) % matches.length);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: FileContentPane_module_css_default.pane,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: FileContentPane_module_css_default.header,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FileContentPane_module_css_default.path,
								title: path,
								children: path
							}),
							badge !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FileContentPane_module_css_default.badge,
								children: badge
							}),
							note !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FileContentPane_module_css_default.note,
								children: note
							}),
							displayTruncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FileContentPane_module_css_default.note,
								children: t("content.truncated", {
									shown: String(visible.length),
									total: String(lines.length)
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: FileContentPane_module_css_default.searchButton,
								"aria-label": t("content.search"),
								title: t("content.search"),
								onClick: () => {
									setSearchOpen(true);
									window.setTimeout(() => {
										searchInput.current?.focus();
									}, 0);
								},
								children: "🔍"
							})
						]
					}),
					searchOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FileContentPane_module_css_default.searchBar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: searchInput,
								type: "text",
								className: FileContentPane_module_css_default.searchInput,
								placeholder: t("content.searchPlaceholder"),
								value: query,
								onChange: (event) => {
									setQuery(event.target.value);
									setActiveMatch(0);
								}
							}),
							query.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: FileContentPane_module_css_default.matchCount,
									children: matches.length === 0 ? t("content.noMatches") : `${activeMatch + 1} / ${matches.length}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: FileContentPane_module_css_default.searchNav,
									"aria-label": t("content.searchPrev"),
									title: t("content.searchPrev"),
									onClick: () => step(-1),
									children: "↑"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: FileContentPane_module_css_default.searchNav,
									"aria-label": t("content.searchNext"),
									title: t("content.searchNext"),
									onClick: () => step(1),
									children: "↓"
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: FileContentPane_module_css_default.searchNav,
								"aria-label": t("content.searchClose"),
								title: t("content.searchClose"),
								onClick: () => setSearchOpen(false),
								children: "×"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FileContentPane_module_css_default.body,
						children: [
							loading === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FileContentPane_module_css_default.empty,
								children: t("content.loading")
							}),
							loading !== true && error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FileContentPane_module_css_default.empty,
								children: error
							}),
							loading !== true && error === void 0 && binary === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FileContentPane_module_css_default.empty,
								children: t("content.binary")
							}),
							loading !== true && error === void 0 && binary !== true && searching && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FileContentPane_module_css_default.searchResults,
								children: numbered.map((line, lineIndex) => {
									const spans = matchesByLine.get(lineIndex);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: FileContentPane_module_css_default.line,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: FileContentPane_module_css_default.gutter,
											"aria-hidden": true,
											children: line.number
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: FileContentPane_module_css_default.lineContent,
											children: spans === void 0 ? line.text : renderHighlighted(line.text, spans, activeMatch)
										})]
									}, line.number);
								})
							}),
							loading !== true && error === void 0 && binary !== true && !searching && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ReadBlock, {
								label: path,
								lines: numbered,
								totalLines: lines.length,
								lang,
								labels: readLabels(t),
								maxLines: numbered.length
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-files/src/client/FilesExplorer.module.css.mjs
		const css$1 = "._34UJ0a_view{box-sizing:border-box;flex-direction:column;gap:12px;height:100%;min-height:0;padding:16px;display:flex}._34UJ0a_bar{align-items:center;gap:12px;min-width:0;display:flex}._34UJ0a_root{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);color:var(--dsh-text-secondary,#8b949e);flex:1;font-size:12px;overflow:hidden}._34UJ0a_toggle{white-space:nowrap;align-items:center;gap:6px;font-size:13px;display:flex}._34UJ0a_refresh{border:1px solid var(--dsh-border,#30363d);color:inherit;cursor:pointer;background:0 0;border-radius:6px;flex:none;padding:4px 12px;font-size:13px}._34UJ0a_refresh:hover{background:var(--dsh-hover-bg,#7f7f7f1f)}._34UJ0a_split{flex:1;gap:12px;min-height:0;display:flex}._34UJ0a_tree{border:1px solid var(--dsh-border,#30363d);border-radius:8px;flex:0 0 280px;min-width:0;padding:6px 0;overflow:auto}._34UJ0a_row{width:100%;color:inherit;text-align:left;cursor:pointer;white-space:nowrap;text-overflow:ellipsis;box-sizing:border-box;background:0 0;border:0;align-items:center;gap:4px;padding-top:3px;padding-bottom:3px;padding-right:8px;font-size:13px;display:flex;overflow:hidden}._34UJ0a_row:hover{background:var(--dsh-hover-bg,#7f7f7f1f)}._34UJ0a_rowSelected{background:var(--dsh-selection-bg,#388bfd2e)}._34UJ0a_caret{text-align:center;width:14px;color:var(--dsh-text-secondary,#8b949e);flex:none;font-size:11px}._34UJ0a_dirName{font-weight:600}._34UJ0a_fileName{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);font-size:12px}._34UJ0a_size{color:var(--dsh-text-secondary,#8b949e);flex:none;margin-left:auto;font-size:11px}._34UJ0a_vcs{text-align:center;width:14px;font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex:none;font-size:11px;font-weight:600}._34UJ0a_vcsDirty{color:var(--dsh-text-secondary,#8b949e);flex:none;font-size:10px}._34UJ0a_note{color:var(--dsh-text-secondary,#8b949e);white-space:nowrap;text-overflow:ellipsis;padding:2px 8px;font-size:12px;overflow:hidden}._34UJ0a_content{border:1px solid var(--dsh-border,#30363d);border-radius:8px;flex:1;min-width:0;min-height:0;overflow:hidden}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-files/FilesExplorer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-files";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var FilesExplorer_module_css_default = {
			"bar": "_34UJ0a_bar",
			"caret": "_34UJ0a_caret",
			"content": "_34UJ0a_content",
			"dirName": "_34UJ0a_dirName",
			"fileName": "_34UJ0a_fileName",
			"note": "_34UJ0a_note",
			"refresh": "_34UJ0a_refresh",
			"root": "_34UJ0a_root",
			"row": "_34UJ0a_row",
			"rowSelected": "_34UJ0a_rowSelected",
			"size": "_34UJ0a_size",
			"split": "_34UJ0a_split",
			"toggle": "_34UJ0a_toggle",
			"tree": "_34UJ0a_tree",
			"vcs": "_34UJ0a_vcs",
			"vcsDirty": "_34UJ0a_vcsDirty",
			"view": "_34UJ0a_view"
		};
		//#endregion
		//#region src/client/FilesExplorer.tsx
		/**
		* Live directories-and-files explorer: a lazily loaded tree rooted at the
		* session workspace, driven by the host workspaceFiles remote (list + read).
		* Each directory level is fetched on first expand; selecting a file reads its
		* bounded text through the same remote and renders it in the shared content
		* pane. The parent mounts this keyed by rootPath so a workspace change resets
		* the lazy-load dedupe set.
		*/
		function explorerReducer(state, action) {
			switch (action.type) {
				case "load-start": {
					const loading = new Set(state.loading);
					loading.add(action.path);
					return {
						...state,
						loading
					};
				}
				case "load-ok": {
					const loading = new Set(state.loading);
					loading.delete(action.path);
					const levels = new Map(state.levels);
					levels.set(action.path, {
						entries: action.entries,
						truncated: action.truncated
					});
					return {
						...state,
						loading,
						levels
					};
				}
				case "load-error": {
					const loading = new Set(state.loading);
					loading.delete(action.path);
					const levels = new Map(state.levels);
					levels.set(action.path, {
						entries: [],
						truncated: false,
						error: action.message
					});
					return {
						...state,
						loading,
						levels
					};
				}
			}
		}
		/** A thrown value as an Error's message. */
		function messageOf(reason) {
			return reason instanceof Error ? reason.message : String(reason);
		}
		/**
		* The live explorer view.
		* @param props - remote, root, and locale seat.
		* @returns the explorer element.
		*/
		function FilesExplorer({ remote, sessionId, rootPath, openRequest, t }) {
			const [state, dispatch] = (0, react.useReducer)(explorerReducer, {
				levels: /* @__PURE__ */ new Map(),
				loading: /* @__PURE__ */ new Set()
			});
			const [expanded, setExpanded] = (0, react.useState)(() => /* @__PURE__ */ new Set([rootPath]));
			const [showHidden, setShowHidden] = (0, react.useState)(false);
			const [selectedPath, setSelectedPath] = (0, react.useState)(null);
			const [content, setContent] = (0, react.useState)({ status: "idle" });
			const seen = (0, react.useRef)(/* @__PURE__ */ new Set());
			const readAbort = (0, react.useRef)(null);
			const consumedRequest = (0, react.useRef)(0);
			const loadDir = (0, react.useCallback)((path) => {
				if (seen.current.has(path)) return;
				seen.current.add(path);
				dispatch({
					type: "load-start",
					path
				});
				remote.list(sessionId, path).then((listing) => dispatch({
					type: "load-ok",
					path,
					entries: sortEntries(listing.entries),
					truncated: listing.truncated
				}), (reason) => dispatch({
					type: "load-error",
					path,
					message: messageOf(reason)
				}));
			}, [remote, sessionId]);
			(0, react.useEffect)(() => {
				loadDir(rootPath);
			}, [rootPath, loadDir]);
			(0, react.useEffect)(() => {
				readAbort.current?.abort();
				if (selectedPath === null) {
					setContent({ status: "idle" });
					return;
				}
				const controller = new AbortController();
				readAbort.current = controller;
				setContent({ status: "loading" });
				remote.read(sessionId, selectedPath, controller.signal).then((value) => {
					if (!controller.signal.aborted) setContent({
						status: "ready",
						value
					});
				}, (reason) => {
					if (!controller.signal.aborted) setContent({
						status: "error",
						message: messageOf(reason)
					});
				});
				return () => {
					controller.abort();
				};
			}, [
				selectedPath,
				remote,
				sessionId
			]);
			const selectFile = (0, react.useCallback)((path) => {
				setSelectedPath(path);
				setExpanded((prev) => /* @__PURE__ */ new Set([...prev, ...ancestorPaths(path)]));
			}, []);
			(0, react.useEffect)(() => {
				if (openRequest === null || openRequest.sessionId !== sessionId || openRequest.nonce <= consumedRequest.current) return;
				consumedRequest.current = openRequest.nonce;
				for (const dir of ancestorPaths(openRequest.path)) loadDir(dir);
				selectFile(openRequest.path);
			}, [
				openRequest,
				sessionId,
				loadDir,
				selectFile
			]);
			const toggleDir = (0, react.useCallback)((path) => {
				const willExpand = !expanded.has(path);
				setExpanded((prev) => {
					const next = new Set(prev);
					if (next.has(path)) next.delete(path);
					else next.add(path);
					return next;
				});
				if (willExpand) loadDir(path);
			}, [expanded, loadDir]);
			const rootLevel = state.levels.get(rootPath);
			const rootEntries = rootLevel === void 0 ? void 0 : visible(rootLevel.entries, showHidden);
			const contentPane = selectedPath === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileContentPane, {
				path: void 0,
				content: void 0,
				t
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileContentPane, {
				path: selectedPath,
				content: content.status === "ready" ? content.value.content : void 0,
				binary: content.status === "ready" ? content.value.binary : void 0,
				loading: content.status === "loading",
				error: content.status === "error" ? content.message : void 0,
				note: content.status === "ready" && content.value.truncated ? t("content.hostTruncated") : void 0,
				t
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: FilesExplorer_module_css_default.view,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: FilesExplorer_module_css_default.bar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: FilesExplorer_module_css_default.root,
							title: rootPath,
							children: rootPath
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: FilesExplorer_module_css_default.toggle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: showHidden,
									onChange: (event) => setShowHidden(event.target.checked)
								}),
								" ",
								t("explorer.showHidden")
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: FilesExplorer_module_css_default.refresh,
							onClick: () => {
								seen.current.delete(rootPath);
								loadDir(rootPath);
							},
							children: t("explorer.refresh")
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: FilesExplorer_module_css_default.split,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FilesExplorer_module_css_default.tree,
						role: "tree",
						children: [
							rootEntries === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FilesExplorer_module_css_default.note,
								children: t("explorer.loading")
							}),
							rootEntries !== void 0 && rootLevel?.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FilesExplorer_module_css_default.note,
								children: [
									t("explorer.loadError"),
									" ",
									rootLevel.error
								]
							}),
							rootEntries !== void 0 && renderLevel(rootEntries, 0, state.levels, state.loading, expanded, selectedPath, showHidden, loadDir, toggleDir, selectFile, t),
							rootEntries !== void 0 && rootLevel?.truncated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FilesExplorer_module_css_default.note,
								children: t("explorer.truncated")
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: FilesExplorer_module_css_default.content,
						children: contentPane
					})]
				})]
			});
		}
		/** One level's entries with the hidden filter applied. */
		function visible(entries, showHidden) {
			return showHidden ? [...entries] : entries.filter((entry) => !entry.hidden);
		}
		/**
		* Recursively render a level's rows. Directories toggle; files select.
		* @returns the row elements.
		*/
		function renderLevel(entries, depth, levels, loading, expanded, selectedPath, showHidden, loadDir, toggleDir, selectFile, t) {
			return entries.map((entry) => {
				if (entry.kind === "file") {
					const selected = selectedPath === entry.path;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "treeitem",
						"aria-label": t("tree.file"),
						className: selected ? FilesExplorer_module_css_default.row + " " + FilesExplorer_module_css_default.rowSelected : FilesExplorer_module_css_default.row,
						style: { paddingLeft: 8 + depth * 14 },
						onClick: () => {
							selectFile(entry.path);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.caret,
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.fileName,
								children: entry.name
							}),
							entry.vcs !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.vcs,
								style: { color: VCS_COLORS[entry.vcs] },
								title: entry.vcs,
								children: vcsMarker(entry.vcs)
							}),
							entry.size !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.size,
								children: formatSize(entry.size)
							})
						]
					}, entry.path);
				}
				const open = expanded.has(entry.path);
				const level = levels.get(entry.path);
				const isLoading = loading.has(entry.path);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "treeitem",
						"aria-expanded": open,
						"aria-label": t("tree.directory"),
						className: FilesExplorer_module_css_default.row,
						style: { paddingLeft: 8 + depth * 14 },
						onClick: () => {
							toggleDir(entry.path);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.caret,
								"aria-hidden": true,
								children: open ? "▾" : "▸"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.dirName,
								children: entry.name
							}),
							entry.vcsDirty === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesExplorer_module_css_default.vcsDirty,
								"aria-hidden": true,
								children: "●"
							})
						]
					}),
					open && isLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: FilesExplorer_module_css_default.note,
						style: { paddingLeft: 8 + (depth + 1) * 14 },
						children: t("explorer.loading")
					}),
					open && !isLoading && level?.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FilesExplorer_module_css_default.note,
						style: { paddingLeft: 8 + (depth + 1) * 14 },
						children: [
							t("explorer.loadError"),
							" ",
							level.error
						]
					}),
					open && !isLoading && level !== void 0 && level.error === void 0 && renderLevel(visible(level.entries, showHidden), depth + 1, levels, loading, expanded, selectedPath, showHidden, loadDir, toggleDir, selectFile, t),
					open && !isLoading && level !== void 0 && level.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: FilesExplorer_module_css_default.note,
						style: { paddingLeft: 8 + (depth + 1) * 14 },
						children: t("explorer.truncated")
					})
				] }, entry.path);
			});
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-files/src/client/FilesView.module.css.mjs
		const css = "._6MXSJW_view{box-sizing:border-box;flex-direction:column;gap:12px;height:100%;min-height:0;padding:16px;display:flex}._6MXSJW_empty{color:var(--dsh-text-secondary,#8b949e);padding:24px 16px;font-size:14px}._6MXSJW_older{border:1px solid var(--dsh-border,#30363d);color:inherit;cursor:pointer;background:0 0;border-radius:6px;align-self:flex-start;padding:4px 12px;font-size:13px}._6MXSJW_older:disabled{opacity:.6;cursor:default}._6MXSJW_split{flex:1;gap:12px;min-height:0;display:flex}._6MXSJW_tree{border:1px solid var(--dsh-border,#30363d);border-radius:8px;flex:0 0 280px;min-width:0;padding:6px 0;overflow:auto}._6MXSJW_row{width:100%;color:inherit;text-align:left;cursor:pointer;white-space:nowrap;text-overflow:ellipsis;background:0 0;border:0;align-items:center;gap:4px;padding-top:3px;padding-bottom:3px;padding-right:8px;font-size:13px;display:flex;overflow:hidden}._6MXSJW_row:hover{background:var(--dsh-hover-bg,#7f7f7f1f)}._6MXSJW_rowSelected{background:var(--dsh-selection-bg,#388bfd2e)}._6MXSJW_caret{text-align:center;width:14px;color:var(--dsh-text-secondary,#8b949e);flex:none;font-size:11px}._6MXSJW_dirName{font-weight:600}._6MXSJW_fileName{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);font-size:12px}._6MXSJW_content{border:1px solid var(--dsh-border,#30363d);border-radius:8px;flex:1;min-width:0;min-height:0;overflow:hidden}";
		const tagId = "@deepseek-ai/dsh-client-ui-files/FilesView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-files";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var FilesView_module_css_default = {
			"caret": "_6MXSJW_caret",
			"content": "_6MXSJW_content",
			"dirName": "_6MXSJW_dirName",
			"empty": "_6MXSJW_empty",
			"fileName": "_6MXSJW_fileName",
			"older": "_6MXSJW_older",
			"row": "_6MXSJW_row",
			"rowSelected": "_6MXSJW_rowSelected",
			"split": "_6MXSJW_split",
			"tree": "_6MXSJW_tree",
			"view": "_6MXSJW_view"
		};
		//#endregion
		//#region src/client/FilesView.tsx
		/**
		* Files view: the workspace explorer tab. When the host workspaceFiles remote
		* is present (see HOST_PRIMITIVES.md), this renders the live directories-
		* and-files explorer; otherwise it falls back to the session-known
		* reconstruction (files the session wrote, edited, or read). Both surfaces
		* share the FileContentPane. Chat file-link clicks and view-request focuses
		* reveal and select the target file in both session-known and live modes.
		*/
		/** Every ancestor directory path of `path` (`a/b/c.ts` -> `a`, `a/b`). */
		function ancestorsOf(path) {
			const out = [];
			const segments = path.split("/");
			let accumulated = "";
			for (let i = 0; i < segments.length - 1; i++) {
				const segment = segments[i];
				if (segment === "" || segment === ".") continue;
				accumulated = accumulated === "" ? segment : accumulated + "/" + segment;
				out.push(accumulated);
			}
			return out;
		}
		/** First file path in snapshot insertion order (stable per snapshot). */
		function firstFilePath(files) {
			return files.keys().next().value;
		}
		/** Localized status badge for a session-known file. */
		function statusLabel(t, status) {
			if (status === "created") return t("status.created");
			if (status === "modified") return t("status.modified");
			return t("status.read");
		}
		/** One tree row: a directory toggle or a selectable file leaf (session-known mode). */
		function TreeRow({ node, depth, selectedPath, expanded, onSelect, onToggle, t }) {
			const isDir = node.kind === "dir";
			const open = expanded.has(node.path);
			const selected = !isDir && selectedPath === node.path;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				role: "treeitem",
				"aria-expanded": isDir ? open : void 0,
				"aria-label": isDir ? t("tree.directory") : t("tree.file"),
				className: selected ? `${FilesView_module_css_default.row} ${FilesView_module_css_default.rowSelected}` : FilesView_module_css_default.row,
				style: { paddingLeft: `${8 + depth * 14}px` },
				onClick: () => {
					if (isDir) onToggle(node.path);
					else onSelect(node.path);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: FilesView_module_css_default.caret,
					"aria-hidden": true,
					children: isDir ? open ? "▾" : "▸" : ""
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: isDir ? FilesView_module_css_default.dirName : FilesView_module_css_default.fileName,
					children: node.name
				})]
			}), isDir && open && (node.children ?? []).map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeRow, {
				node: child,
				depth: depth + 1,
				selectedPath,
				expanded,
				onSelect,
				onToggle,
				t
			}, child.path))] });
		}
		/**
		* The Files view slot entry: pure component over the composed props.
		* @param props - conversation view runtime, injected face, and locale seat.
		* @returns the explorer element (live or session-known).
		*/
		function FilesView({ useFiles, useSession, sessionId, viewRequest, completeViewRequest, loadOlder, openRequests, workspaceFiles, workspaceRoot, t }) {
			const snapshot = useFiles((value) => value);
			const hasMore = useSession((value) => value.hasMore);
			const loadingOlder = useSession((value) => value.loadingOlder);
			const request = (0, react.useSyncExternalStore)(openRequests.subscribe, openRequests.getSnapshot, openRequests.getSnapshot);
			const [selectedPath, setSelectedPath] = (0, react.useState)(null);
			const [expanded, setExpanded] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const consumedNonce = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				if (request === null || request.sessionId !== sessionId || request.nonce <= consumedNonce.current) return;
				consumedNonce.current = request.nonce;
				setSelectedPath(request.path);
				setExpanded((prev) => /* @__PURE__ */ new Set([...prev, ...ancestorsOf(request.path)]));
			}, [request, sessionId]);
			(0, react.useEffect)(() => {
				if (viewRequest === null || viewRequest.view !== "files") return;
				setSelectedPath(viewRequest.focus);
				setExpanded((prev) => /* @__PURE__ */ new Set([...prev, ...ancestorsOf(viewRequest.focus)]));
				completeViewRequest();
			}, [viewRequest, completeViewRequest]);
			(0, react.useEffect)(() => {
				if (selectedPath !== null || snapshot.files.size === 0) return;
				const first = firstFilePath(snapshot.files);
				if (first !== void 0) {
					setSelectedPath(first);
					setExpanded((prev) => /* @__PURE__ */ new Set([...prev, ...ancestorsOf(first)]));
				}
			}, [snapshot, selectedPath]);
			const selected = (0, react.useMemo)(() => selectedPath === null ? void 0 : snapshot.files.get(selectedPath), [snapshot, selectedPath]);
			const liveRoot = workspaceFiles === void 0 ? void 0 : workspaceRoot(sessionId);
			if (workspaceFiles !== void 0 && liveRoot !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilesExplorer, {
				remote: workspaceFiles,
				sessionId,
				rootPath: liveRoot,
				openRequest: request,
				t
			}, liveRoot);
			if (snapshot.roots.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: FilesView_module_css_default.view,
				children: [hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: FilesView_module_css_default.older,
					disabled: loadingOlder,
					onClick: () => {
						loadOlder();
					},
					children: loadingOlder ? t("older.loading") : t("older.load")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: FilesView_module_css_default.empty,
					children: t("empty.noFiles")
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: FilesView_module_css_default.view,
				children: [hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: FilesView_module_css_default.older,
					disabled: loadingOlder,
					onClick: () => {
						loadOlder();
					},
					children: loadingOlder ? t("older.loading") : t("older.load")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: FilesView_module_css_default.split,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: FilesView_module_css_default.tree,
						role: "tree",
						children: snapshot.roots.map((root) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeRow, {
							node: root,
							depth: 0,
							selectedPath,
							expanded,
							onSelect: setSelectedPath,
							onToggle: (path) => {
								setExpanded((prev) => {
									const next = new Set(prev);
									if (next.has(path)) next.delete(path);
									else next.add(path);
									return next;
								});
							},
							t
						}, root.path))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: FilesView_module_css_default.content,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileContentPane, {
							path: selected?.path,
							content: selected?.content,
							badge: selected === void 0 ? void 0 : statusLabel(t, selected.status),
							note: selected?.partial === true ? t("content.partial") : void 0,
							t
						})
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/files-mentions.ts
		/** The basename of a path (the segment after the last `/`). */
		function basename(path) {
			return path.slice(path.lastIndexOf("/") + 1);
		}
		/**
		* Match an authored token to a session-known file: an exact path, or a
		* basename unique among the snapshot's files.
		* @param snapshot - the session's Files snapshot.
		* @param value - the authored inline-code token.
		* @returns the matched path, or undefined.
		*/
		function matchKnownFile(snapshot, value) {
			if (snapshot === void 0) return void 0;
			if (snapshot.files.has(value)) return value;
			const wanted = basename(value);
			if (wanted === value) return void 0;
			let match;
			for (const path of snapshot.files.keys()) {
				if (basename(path) !== wanted) continue;
				if (match !== void 0) return void 0;
				match = path;
			}
			return match;
		}
		/**
		* Create the composed provider.
		* @param options - queue, snapshot reader, session resolution, nonce source.
		* @returns the ChatFileMentions service face.
		*/
		function createFilesMentions(options) {
			return { forClosing(owner) {
				const priorMentions = options.prior?.forClosing(owner);
				const resolve = (value) => {
					const sessionId = options.currentSessionId();
					const priorResolved = priorMentions?.resolve(value);
					const known = matchKnownFile(sessionId === void 0 ? void 0 : options.filesOf(sessionId)?.getSnapshot(), value);
					if (priorResolved === void 0 && known === void 0) return void 0;
					const open = (path) => {
						if (sessionId === void 0) return;
						options.queue.set({
							nonce: options.nextNonce(),
							sessionId,
							path
						});
					};
					if (priorResolved !== void 0) return {
						open: () => {
							open(priorResolved.title);
						},
						label: priorResolved.label,
						title: priorResolved.title
					};
					return {
						open: () => {
							open(known);
						},
						label: basename(known),
						title: known
					};
				};
				return { resolve };
			} };
		}
		//#endregion
		//#region src/client/files-definition.ts
		/** Tools whose results carry file facts the Files view knows. */
		const FILE_TOOLS = /* @__PURE__ */ new Set([
			"edit",
			"write",
			"str_replace_editor",
			"read"
		]);
		/**
		* Narrow opaque result metadata's `diffs` to well-formed hunks.
		* @param meta - the metadata field to validate.
		* @returns the validated hunks, or null when the payload is not usable.
		*/
		function narrowDiffs(meta) {
			if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return null;
			const diffs = meta.diffs;
			if (!Array.isArray(diffs) || diffs.length === 0) return null;
			const out = [];
			for (const hunk of diffs) {
				if (typeof hunk !== "object" || hunk === null) return null;
				const { path, oldText, newText } = hunk;
				if (typeof path !== "string") return null;
				if (oldText !== null && typeof oldText !== "string") return null;
				if (typeof newText !== "string") return null;
				out.push({
					path,
					oldText,
					newText
				});
			}
			return out;
		}
		/**
		* Narrow opaque result metadata to a usable read window (the `read` tool's
		* persisted `presentationMeta`).
		* @param meta - the metadata field to validate.
		* @returns the validated window, or null when the payload is not usable.
		*/
		function narrowReadMeta(meta) {
			if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return null;
			const { path, offset, lines, totalLines } = meta;
			if (typeof path !== "string" || typeof offset !== "number" || typeof totalLines !== "number") return null;
			if (!Number.isInteger(offset) || offset < 1 || !Number.isInteger(totalLines) || totalLines < 0) return null;
			if (!Array.isArray(lines)) return null;
			const out = [];
			for (const line of lines) {
				if (typeof line !== "object" || line === null) return null;
				const { number, text } = line;
				if (typeof number !== "number" || !Number.isInteger(number) || number < 1) return null;
				if (typeof text !== "string") return null;
				out.push({
					number,
					text
				});
			}
			return {
				path,
				offset,
				lines: out,
				totalLines
			};
		}
		/** Extract a settled result from a `tool/result` match. */
		function resultFromMatch(match) {
			if (match.event.type !== "tool/result") return null;
			return {
				seq: match.event.seq,
				time: match.event.time,
				turn: match.event.data.turn,
				step: match.event.data.step,
				...narrowDiffs(match.event.data.meta) === null ? {} : { hunks: narrowDiffs(match.event.data.meta) },
				...narrowReadMeta(match.event.data.meta) === null ? {} : { read: narrowReadMeta(match.event.data.meta) },
				...match.event.data.error === void 0 ? {} : { error: match.event.data.error }
			};
		}
		/**
		* Parse a tool call's raw arguments JSON into the fields the Files view
		* needs; null when the arguments are unusable or name no file.
		* @param name - the tool name (argument shapes differ per tool).
		* @param argumentsRaw - the raw arguments JSON string.
		* @returns the parsed fields, or null.
		*/
		function parseArgs(name, argumentsRaw) {
			let parsed;
			try {
				parsed = JSON.parse(argumentsRaw);
			} catch {
				return null;
			}
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
			const record = parsed;
			if (name === "str_replace_editor") {
				const filePath = typeof record.path === "string" ? record.path : void 0;
				if (filePath === void 0) return null;
				return {
					filePath,
					...(typeof record.command === "string" ? record.command : void 0) === "create" && typeof record.file_text === "string" ? { content: record.file_text } : {},
					...typeof record.old_str === "string" ? { oldText: record.old_str } : {},
					...typeof record.new_str === "string" ? { newText: record.new_str } : {}
				};
			}
			const filePath = typeof record.file_path === "string" ? record.file_path : void 0;
			if (filePath === void 0) return null;
			return {
				filePath,
				...name === "write" && typeof record.content === "string" ? { content: record.content } : {}
			};
		}
		/** State adopted when the window opened inside a result (call head outside). */
		function fallbackState(context) {
			const resultMatch = context.matches.find((match) => match.event.type === "tool/result");
			if (resultMatch === void 0) return void 0;
			const result = resultFromMatch(resultMatch);
			if (result === null || result.hunks === void 0 && result.read === void 0) return void 0;
			return {
				callId: String(resultMatch.event.data.message.source.callId),
				tool: null,
				args: null,
				result
			};
		}
		/** Project the read observation, or null while pending, failed, or unknowable. */
		function readFor(context, state) {
			const result = state.result;
			if (result === null || result.error !== void 0 || result.read === void 0) return null;
			return {
				key: context.key,
				callId: state.callId,
				seq: result.seq,
				time: result.time,
				turn: result.turn,
				step: result.step,
				path: result.read.path,
				offset: result.read.offset,
				lines: result.read.lines,
				totalLines: result.read.totalLines
			};
		}
		/** Project the applied mutation, or null while pending, failed, or unknowable. */
		function mutationFor(context, state) {
			const result = state.result;
			if (result === null || result.error !== void 0) return null;
			const base = {
				key: context.key,
				callId: state.callId,
				tool: state.tool,
				seq: result.seq,
				time: result.time,
				turn: result.turn,
				step: result.step
			};
			if (result.hunks !== void 0) {
				const path = result.hunks[0]?.path;
				if (path === void 0) return null;
				return {
					...base,
					path,
					kind: "hunks",
					hunks: result.hunks
				};
			}
			const args = state.args;
			if (args === null || args.filePath === void 0) return null;
			if (state.tool === "write" && args.content !== void 0) return {
				...base,
				path: args.filePath,
				kind: "create",
				content: args.content
			};
			if (state.tool === "str_replace_editor") {
				if (args.content !== void 0) return {
					...base,
					path: args.filePath,
					kind: "create",
					content: args.content
				};
				if (args.newText !== void 0) return {
					...base,
					path: args.filePath,
					kind: "hunks",
					hunks: [{
						path: args.filePath,
						oldText: args.oldText ?? "",
						newText: args.newText
					}]
				};
			}
			return null;
		}
		/** Wrap one fact in the Engine-owned target envelope. */
		function filesNode(context, anchorSeq, data) {
			return {
				key: context.key,
				kind: context.kind,
				id: context.id,
				target: "files",
				anchorSeq,
				location: context.start?.location ?? { kind: "unresolved" },
				data
			};
		}
		/** Files-owned lifecycle: start on a file tool call, settle on its result. */
		const filesDefinition = {
			kind: "files-fact",
			target: "files",
			match: (event) => {
				if (event.type === "tool/call") return FILE_TOOLS.has(event.data.name) ? {
					id: String(event.data.callId),
					role: "start"
				} : null;
				if (event.type === "tool/result") return {
					id: String(event.data.message.source.callId),
					role: "update"
				};
				return null;
			},
			start: (_context, match) => {
				if (match.event.type !== "tool/call") throw new Error("files-fact start requires tool/call");
				return {
					callId: String(match.event.data.callId),
					tool: match.event.data.name,
					args: parseArgs(match.event.data.name, match.event.data.arguments),
					result: null
				};
			},
			update: (context, match) => {
				const result = resultFromMatch(match);
				if (result === null) return context.state;
				if (context.state === void 0) return {
					callId: String(match.event.data.message.source.callId),
					tool: null,
					args: null,
					result
				};
				return {
					...context.state,
					result
				};
			},
			buildViewNode: (context) => {
				const state = context.state ?? fallbackState(context);
				if (state === void 0) return null;
				const anchorSeq = context.start?.event.seq ?? state.result?.seq ?? 0;
				const read = readFor(context, state);
				if (read !== null) return filesNode(context, anchorSeq, {
					kind: "read",
					read
				});
				const mutation = mutationFor(context, state);
				if (mutation === null) return null;
				return filesNode(context, anchorSeq, {
					kind: "mutation",
					mutation
				});
			}
		};
		/**
		* Register the Files lifecycle.
		* @param ctx - Plugin context receiving the Definition.
		*/
		function registerFilesDefinition(ctx) {
			ctx.uiConversation.events.register(filesDefinition);
		}
		//#endregion
		//#region src/client/files-contract.ts
		/** Stable empty snapshot used before a Session has assembled Files records. */
		const EMPTY_FILES_SNAPSHOT = {
			roots: [],
			files: /* @__PURE__ */ new Map()
		};
		//#endregion
		//#region src/client/files-text.ts
		/**
		* Shared text helpers for the Files reconstruction (mirrors the Changes
		* reconstruction's line conventions so both views agree on what a file looks
		* like).
		* @module @deepseek-ai/dsh-client-ui-files/client
		*/
		/**
		* Split a side's text into its content lines: empty text is zero lines, a
		* single trailing newline is a terminator rather than an extra empty line,
		* and an interior blank line survives.
		* @param text - the text to split.
		* @returns the content lines, without the terminating newline.
		*/
		function contentLines(text) {
			if (text === "") return [];
			return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n");
		}
		/**
		* Re-join content lines into a text with a single trailing newline (the basis
		* the reconstruction documents use for display).
		* @param lines - content lines.
		* @returns the joined text.
		*/
		function joinLines(lines) {
			return lines.length === 0 ? "" : lines.join("\n") + "\n";
		}
		//#endregion
		//#region src/client/files-reconstruct.ts
		/**
		* Locate the first exact run of `needle` lines inside `lines`. An empty
		* needle is never located (a pure insertion has no anchor).
		* @param lines - the document to search.
		* @param needle - the block to find.
		* @returns the starting index, or -1 when absent.
		*/
		function indexOfLines(lines, needle) {
			if (needle.length === 0 || needle.length > lines.length) return -1;
			outer: for (let i = 0; i + needle.length <= lines.length; i++) {
				for (let j = 0; j < needle.length; j++) if (lines[i + j] !== needle[j]) continue outer;
				return i;
			}
			return -1;
		}
		/**
		* Fold `mutations` (ascending seq) into one file's current state. The first
		* content seeds the document; later hunks replace in place when their context
		* anchors, and append as standalone regions otherwise (flagged `degraded`).
		* A write-create resets to the whole-file content.
		* @param mutations - the file's mutations, any order (sorted by seq here).
		* @returns the folding outcome.
		*/
		function foldMutations(mutations) {
			const sorted = [...mutations].sort((left, right) => left.seq - right.seq);
			let doc = [];
			let status = "modified";
			let degraded = false;
			let lastSeq = 0;
			let lastTime = 0;
			for (const mutation of sorted) {
				if (mutation.kind === "create") {
					doc = contentLines(mutation.content ?? "");
					status = "created";
					lastSeq = mutation.seq;
					lastTime = mutation.time;
					continue;
				}
				for (const hunk of mutation.hunks ?? []) {
					const oldLines = contentLines(hunk.oldText ?? "");
					const newLines = contentLines(hunk.newText);
					if (doc.length === 0) doc = newLines.slice();
					else {
						const index = indexOfLines(doc, oldLines);
						if (index === -1) {
							degraded = true;
							doc.push(...newLines);
						} else doc.splice(index, oldLines.length, ...newLines);
					}
				}
				lastSeq = mutation.seq;
				lastTime = mutation.time;
			}
			return {
				doc,
				degraded,
				status,
				lastSeq,
				lastTime
			};
		}
		/**
		* Reconstruct one file from its mutation stream.
		* @param path - the file's model-facing path.
		* @param mutations - the file's mutations, any order (sorted by seq inside).
		* @returns the reconstructed file facts.
		*/
		function reconstructFile(path, mutations) {
			const { doc, degraded, status, lastSeq, lastTime } = foldMutations(mutations);
			return {
				path,
				status,
				content: joinLines(doc),
				totalLines: doc.length,
				partial: degraded,
				lastSeq,
				lastTime,
				degraded
			};
		}
		/**
		* Reconstruct one file that was only ever read: the last read window's lines
		* (keeping their own line numbering) become the content.
		* @param path - the file's model-facing path.
		* @param reads - the file's reads, any order (the last by seq wins).
		* @returns the file facts, or null when no read produced usable lines.
		*/
		function reconstructReadFile(path, reads) {
			const last = [...reads].sort((left, right) => left.seq - right.seq).at(-1);
			if (last === void 0 || last.lines.length === 0) return null;
			const content = joinLines(last.lines.map((line) => line.text));
			const partial = last.lines.length < last.totalLines || last.offset !== 1;
			return {
				path,
				status: "read",
				content,
				totalLines: last.totalLines,
				partial,
				lastSeq: last.seq,
				lastTime: last.time,
				degraded: partial
			};
		}
		//#endregion
		//#region src/client/files-tree.ts
		function leaf(name, path) {
			return {
				name,
				path,
				kind: "file"
			};
		}
		function directory(node) {
			const entries = [...node.children.values()].sort((left, right) => {
				if (left.file !== right.file) return left.file ? 1 : -1;
				return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
			}).map((child) => child.file ? leaf(child.name, child.path) : directory(child));
			return {
				name: node.name,
				path: node.path,
				kind: "dir",
				children: entries
			};
		}
		/**
		* Project a set of file paths into a tree of directories and file leaves.
		* A path like `a/b/c.ts` contributes directories `a`, `a/b` and the leaf
		* `a/b/c.ts`. A directory that is itself also a known file path resolves to a
		* file leaf (files win over directories at the same path).
		* @param paths - the model-facing paths.
		* @returns the top-level entries, sorted.
		*/
		function projectTree(paths) {
			const root = /* @__PURE__ */ new Map();
			for (const path of paths) {
				if (path.length === 0 || path === "." || path === "/") continue;
				const segments = path.split("/").filter((segment) => segment.length > 0 && segment !== ".");
				let level = root;
				let accumulated = "";
				for (const [index, segment] of segments.entries()) {
					accumulated = accumulated === "" ? segment : accumulated + "/" + segment;
					const last = index === segments.length - 1;
					let node = level.get(segment);
					if (node === void 0) {
						node = {
							name: segment,
							path: accumulated,
							children: /* @__PURE__ */ new Map(),
							file: last
						};
						level.set(segment, node);
					} else if (last) node.file = true;
					level = node.children;
				}
			}
			return [...root.values()].sort((left, right) => {
				if (left.file !== right.file) return left.file ? 1 : -1;
				return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
			}).map((child) => child.file ? leaf(child.name, child.path) : directory(child));
		}
		//#endregion
		//#region src/client/files-snapshot-builder.ts
		/** Aggregate per-path facts into the published snapshot. */
		var FilesSnapshotBuilder = class {
			mutations = /* @__PURE__ */ new Map();
			reads = /* @__PURE__ */ new Map();
			empty = EMPTY_FILES_SNAPSHOT;
			replace(input) {
				this.mutations.clear();
				this.reads.clear();
				for (const node of input.nodes) this.adopt(node);
				return this.snapshot();
			}
			apply(input) {
				for (const node of input.upserts) this.adopt(node);
				return this.snapshot();
			}
			adopt(node) {
				if (node.data.kind === "mutation") this.mutations.set(node.key, node.data.mutation);
				else this.reads.set(node.key, node.data.read);
			}
			snapshot() {
				const paths = /* @__PURE__ */ new Set();
				const mutationsByPath = /* @__PURE__ */ new Map();
				for (const mutation of this.mutations.values()) {
					paths.add(mutation.path);
					const list = mutationsByPath.get(mutation.path);
					if (list === void 0) mutationsByPath.set(mutation.path, [mutation]);
					else list.push(mutation);
				}
				const readsByPath = /* @__PURE__ */ new Map();
				for (const read of this.reads.values()) {
					paths.add(read.path);
					const list = readsByPath.get(read.path);
					if (list === void 0) readsByPath.set(read.path, [read]);
					else list.push(read);
				}
				const files = /* @__PURE__ */ new Map();
				for (const path of paths) {
					const mutations = mutationsByPath.get(path);
					if (mutations !== void 0) files.set(path, reconstructFile(path, mutations));
					else {
						const reads = readsByPath.get(path);
						const file = reads === void 0 ? null : reconstructReadFile(path, reads);
						if (file !== null) files.set(path, file);
					}
				}
				return {
					roots: projectTree(paths),
					files
				};
			}
		};
		/** Files target factory preserving the explorer view model. */
		const filesViewDefinition = {
			target: "files",
			create: () => new FilesSnapshotBuilder()
		};
		/**
		* Register the Files target builder.
		* @param ctx - Plugin context receiving the view Definition.
		*/
		function registerFilesConversationView(ctx) {
			ctx.uiConversation.views.register(filesViewDefinition);
		}
		//#endregion
		//#region src/client/files-remote.ts
		/**
		* Resolve the host workspace-files remote, or undefined when the host has not
		* implemented it yet (see HOST_PRIMITIVES.md). The Files view falls back to
		* the session-known reconstruction whenever this returns undefined.
		* @param ctx - client root context carrying the `remote` service.
		* @returns the typed remote, or undefined when the namespace is absent.
		*/
		function resolveWorkspaceFilesRemote(ctx) {
			const namespace = ctx.get("remote.workspaceFiles");
			if (namespace === void 0) return void 0;
			return {
				async list(sessionId, path, signal) {
					const result = await namespace.list(sessionId, path, signal);
					if (!result.ok) throw new Error(result.error.message);
					return result.value;
				},
				async read(sessionId, path, signal) {
					const result = await namespace.read(sessionId, path, signal);
					if (!result.ok) throw new Error(result.error.message);
					return result.value;
				}
			};
		}
		//#endregion
		//#region src/client/locales.ts
		/** `files` namespace dictionaries for the Files view surface. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "files";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"view.files": "文件",
			"empty.noFiles": "本会话尚未触及任何文件。",
			"content.noContent": "该文件没有可显示的内容。",
			"content.loading": "正在加载内容…",
			"content.loadError": "无法读取该文件。",
			"content.binary": "二进制文件，无法以文本形式显示。",
			"content.partial": "部分内容（会话日志仅含被触及的区域）",
			"content.truncated": "已显示前 {shown} 行 / 共 {total} 行",
			"content.hostTruncated": "内容已截断（超过读取上限）",
			"content.window": "显示 {shown} / {total} 行",
			"content.copy": "复制",
			"content.copied": "已复制",
			"content.collapse": "收起",
			"content.collapseAria": "收起内容",
			"content.expand": "展开（隐藏 {hidden} 行）",
			"content.expandAria": "展开内容（隐藏 {hidden} 行）",
			"content.search": "搜索",
			"content.searchPlaceholder": "搜索文件内容…",
			"content.searchClose": "关闭搜索",
			"content.searchPrev": "上一个匹配",
			"content.searchNext": "下一个匹配",
			"content.noMatches": "无匹配",
			"status.created": "新建",
			"status.modified": "已修改",
			"status.read": "已读",
			"older.load": "加载更早的文件",
			"older.loading": "正在加载…",
			"tree.directory": "目录",
			"tree.file": "文件",
			"explorer.showHidden": "显示隐藏文件",
			"explorer.refresh": "刷新",
			"explorer.loading": "加载中…",
			"explorer.loadError": "目录加载失败：",
			"explorer.truncated": "条目过多，仅显示开头部分。"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"view.files": "Files",
			"empty.noFiles": "No files touched in this session yet.",
			"content.noContent": "No content available for this file.",
			"content.loading": "Loading content…",
			"content.loadError": "This file could not be read.",
			"content.binary": "Binary file — cannot be shown as text.",
			"content.partial": "Partial content (session log only shows touched regions)",
			"content.truncated": "Showing first {shown} of {total} lines",
			"content.hostTruncated": "Content truncated (read limit)",
			"content.window": "Showing {shown} of {total} lines",
			"content.copy": "Copy",
			"content.copied": "Copied",
			"content.collapse": "Collapse",
			"content.collapseAria": "Collapse content",
			"content.expand": "Expand ({hidden} hidden lines)",
			"content.expandAria": "Expand content ({hidden} hidden lines)",
			"content.search": "Search",
			"content.searchPlaceholder": "Search in file…",
			"content.searchClose": "Close search",
			"content.searchPrev": "Previous match",
			"content.searchNext": "Next match",
			"content.noMatches": "No matches",
			"status.created": "Created",
			"status.modified": "Modified",
			"status.read": "Read",
			"older.load": "Load earlier files",
			"older.loading": "Loading…",
			"tree.directory": "Directory",
			"tree.file": "File",
			"explorer.showHidden": "Show hidden files",
			"explorer.refresh": "Refresh",
			"explorer.loading": "Loading…",
			"explorer.loadError": "Failed to load directory: ",
			"explorer.truncated": "Too many entries; only the beginning is shown."
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the conversation slot, registries, Session paging, locale, and the workspaceFiles Remote namespace. */
		const inject = [
			"slots",
			"sessions",
			"uiSession",
			"uiConversation",
			"locale",
			"remote",
			"remote.workspaceFiles"
		];
		/**
		* Client plugin body: register the Files tab and the mention provider. All registrations ride the slot service's effect wrapper, so
		* plugin unload removes them.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const filesSources = /* @__PURE__ */ new WeakMap();
			const filesSource = (binding) => {
				let source = filesSources.get(binding);
				if (source === void 0) {
					const target = ctx.uiConversation.binding(binding).target("files");
					source = {
						getSnapshot: () => target.getSnapshot() ?? EMPTY_FILES_SNAPSHOT,
						subscribe: (listener) => target.subscribe(listener)
					};
					filesSources.set(binding, source);
				}
				return source;
			};
			const filesOf = (sessionId) => {
				const binding = ctx.sessions.binding(sessionId);
				return binding === void 0 ? void 0 : filesSource(binding);
			};
			const workspaceFiles = resolveWorkspaceFilesRemote(ctx);
			const workspaceRoot = (sessionId) => ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
			const openRequests = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			let openNonce = 0;
			const priorMentions = ctx.get("chatFileMentions");
			ctx.provide("chatFileMentions", createFilesMentions({
				prior: priorMentions,
				queue: openRequests,
				currentSessionId: () => ctx.sessions.list.getSnapshot().current,
				filesOf,
				nextNonce: () => {
					openNonce += 1;
					return openNonce;
				}
			}));
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-files: dictionaries");
			const t = ctx.locale.bind(NS);
			registerFilesConversationView(ctx);
			registerFilesDefinition(ctx);
			ctx.uiSession.provide({
				hooks: ["files"],
				resolve: (binding) => ({ hooks: { files: filesSource(binding) } })
			});
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "files",
				order: 22,
				locale: NS,
				label: () => t("view.files"),
				children: {},
				inject: (sessionId) => {
					const session = ctx.sessions.binding(sessionId)?.session;
					if (session === void 0) throw new Error("ui-files: session \"" + sessionId + "\" is unavailable");
					const target = ctx.uiConversation.binding(sessionId).target("files");
					return {
						loadOlder: async () => {
							const before = target.getSnapshot();
							await session.loadOlder();
							return target.getSnapshot() !== before;
						},
						openRequests,
						workspaceFiles,
						workspaceRoot
					};
				}
			}, FilesView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map