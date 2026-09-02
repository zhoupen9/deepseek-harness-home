window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-git",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/git-diff.ts
		const META_PREFIXES = [
			"diff ",
			"index ",
			"new file mode ",
			"deleted file mode ",
			"old mode ",
			"new mode ",
			"similarity index ",
			"rename from ",
			"rename to ",
			"copy from ",
			"copy to ",
			"Binary files ",
			"GIT binary patch",
			"\\ No newline at end of file"
		];
		/**
		* Classify one unified-diff line.
		* @param line - one line of diff text (no trailing newline).
		* @returns the display kind for that line.
		*/
		function classifyDiffLine(line) {
			if (line.startsWith("+++") || line.startsWith("---")) return "meta";
			if (line.startsWith("@@")) return "hunk";
			if (line.startsWith("+")) return "add";
			if (line.startsWith("-")) return "del";
			for (const prefix of META_PREFIXES) if (line.startsWith(prefix)) return "meta";
			return "ctx";
		}
		//#endregion
		//#region src/client/git-graph.ts
		/**
		* Route one edge between two grid points. A same-column edge is a straight
		* vertical line; a rightward branch (child left of parent) is horizontal at the
		* child row then vertical down; a leftward merge (child right of parent) is
		* vertical down the child column then horizontal at the parent row.
		* @param from - child node grid position.
		* @param to - parent node grid position.
		* @returns the routed polyline points.
		*/
		function routeEdge(from, to) {
			if (from.column === to.column) return [from, to];
			if (from.column < to.column) return [
				from,
				{
					column: to.column,
					row: from.row
				},
				to
			];
			return [
				from,
				{
					column: from.column,
					row: to.row
				},
				to
			];
		}
		/**
		* Assign a column to every commit (newest first) and route every parent edge.
		* The first parent of a commit continues that commit's column (a straight
		* vertical line); later parents branch to fresh columns to the right; a commit
		* already reserved as some earlier commit's parent reuses its reserved column
		* (a branch merges back). A parent whose commit lies outside the window keeps
		* its reserved column, so its edge still dangles cleanly off the bottom.
		* @param commits - the requested window, newest first.
		* @returns the layout with routed edges.
		*/
		function layoutGitGraph(commits) {
			const rowByHash = /* @__PURE__ */ new Map();
			commits.forEach((commit, row) => {
				rowByHash.set(commit.hash, row);
			});
			const columnByHash = /* @__PURE__ */ new Map();
			let nextColumn = 0;
			const nodes = [];
			const edges = [];
			commits.forEach((commit, row) => {
				let column = columnByHash.get(commit.hash);
				if (column === void 0) {
					column = nextColumn++;
					columnByHash.set(commit.hash, column);
				}
				nodes.push({
					hash: commit.hash,
					row,
					column
				});
				commit.parents.forEach((parentHash, parentIndex) => {
					let parentColumn = columnByHash.get(parentHash);
					if (parentColumn === void 0) {
						parentColumn = parentIndex === 0 ? column : nextColumn++;
						columnByHash.set(parentHash, parentColumn);
					}
					const parentRow = rowByHash.get(parentHash) ?? row + 1;
					edges.push({ points: routeEdge({
						column,
						row
					}, {
						column: parentColumn,
						row: parentRow
					}) });
				});
			});
			return {
				width: nextColumn,
				nodes,
				edges
			};
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-git/src/client/GitView.module.css.mjs
		const css = ".oEndJq_view{width:100%;height:100%;min-height:0;max-width:var(--dsh-chat-content-width);box-sizing:border-box;flex-direction:column;gap:12px;margin:0 auto;padding:16px;display:flex}.oEndJq_empty{color:var(--dsh-text-secondary,#8b949e);padding:24px 16px;font-size:14px}.oEndJq_header{align-items:center;gap:12px;font-size:13px;display:flex}.oEndJq_branch{font-weight:600}.oEndJq_truncated{color:var(--dsh-text-secondary,#8b949e)}.oEndJq_traversalGroup{border:1px solid var(--dsh-border,#30363d);color:var(--dsh-text-secondary,#8b949e);border-radius:6px;font-size:11px;display:inline-flex;overflow:hidden}.oEndJq_traversalButton{border:0;border-left:1px solid var(--dsh-border,#30363d);color:inherit;white-space:nowrap;cursor:pointer;background:0 0;padding:0 8px;font-size:11px;line-height:18px}.oEndJq_traversalButton:first-child{border-left:0}.oEndJq_traversalButton:hover{background:var(--dsh-hover-bg,#7f7f7f1f);color:var(--dsh-text-primary,#e6edf3)}.oEndJq_traversalButton:focus-visible{outline:1px solid var(--dsh-accent,#58a6ff);outline-offset:-1px}.oEndJq_traversalActive,.oEndJq_traversalActive:hover{background:var(--dsh-selection-bg,#388bfd2e);color:var(--dsh-text-primary,#e6edf3)}.oEndJq_body{flex:1;min-height:0;display:flex}.oEndJq_history{flex:1;gap:10px;min-width:0;min-height:0;display:flex;overflow:auto}.oEndJq_graph{flex:none;overflow:visible}.oEndJq_edge{fill:none;stroke:var(--dsh-border,#30363d);stroke-width:1.5px}.oEndJq_node{fill:var(--dsh-accent,#58a6ff)}.oEndJq_logColumn{flex-direction:column;flex:1;min-width:0;display:flex}.oEndJq_commits{min-width:0;margin:0;padding:0;list-style:none}.oEndJq_commit{box-sizing:border-box;border-bottom:1px solid var(--dsh-border,#30363d);white-space:nowrap;cursor:pointer;align-items:center;gap:8px;padding:0 4px;font-size:13px;display:flex;overflow:hidden}.oEndJq_commit:hover{background:var(--dsh-hover-bg,#7f7f7f1f)}.oEndJq_commit:focus-visible{outline:1px solid var(--dsh-accent,#58a6ff);outline-offset:-1px}.oEndJq_commitSelected{background:var(--dsh-selection-bg,#388bfd2e)}.oEndJq_refs{flex:none;gap:6px;display:inline-flex}.oEndJq_ref{border:1px solid;border-radius:8px;padding:0 6px;font-size:11px;line-height:16px}.oEndJq_subject{text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}.oEndJq_byline{color:var(--dsh-text-secondary,#8b949e);font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex:none;gap:8px;font-size:11px;display:inline-flex}.oEndJq_commit .oEndJq_hash{width:7ch;color:var(--dsh-text-secondary,#8b949e);font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex:none;font-size:11px}.oEndJq_author{text-align:right;text-overflow:ellipsis;flex:none;width:120px;overflow:hidden}.oEndJq_userGlyph{vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:2px;stroke-linecap:round;stroke-linejoin:round;width:12px;height:12px;margin-right:4px}.oEndJq_time{text-overflow:ellipsis;font-variant-numeric:tabular-nums;flex:none;width:180px;overflow:hidden}.oEndJq_loadMore{border:1px solid var(--dsh-border,#30363d);color:inherit;cursor:pointer;background:0 0;border-radius:6px;flex:none;align-self:flex-start;margin:10px 0 4px;padding:4px 12px;font-size:13px}.oEndJq_loadMore:hover:not(:disabled){background:var(--dsh-hover-bg,#7f7f7f1f)}.oEndJq_loadMore:disabled{opacity:.6;cursor:default}.oEndJq_loadMore:focus-visible{outline:1px solid var(--dsh-accent,#58a6ff);outline-offset:1px}.oEndJq_calendarGlyph{vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:2px;stroke-linecap:round;stroke-linejoin:round;width:12px;height:12px;margin-right:4px}.oEndJq_details{border-left:1px solid var(--dsh-border,#30363d);flex-direction:column;flex:0 0 420px;min-width:0;min-height:0;padding-left:12px;display:flex}.oEndJq_detailsHeader{flex:none;justify-content:flex-end;display:flex}.oEndJq_close{color:var(--dsh-text-secondary,#8b949e);cursor:pointer;background:0 0;border:0;border-radius:4px;padding:2px 6px;font-size:18px;line-height:1}.oEndJq_close:hover{background:var(--dsh-hover-bg,#7f7f7f1f)}.oEndJq_detailsBody{flex:1;min-height:0;padding-right:4px;overflow:auto}.oEndJq_detailsState{color:var(--dsh-text-secondary,#8b949e);padding:16px 0;font-size:13px}.oEndJq_detailSubject{overflow-wrap:anywhere;margin:0 0 8px;font-size:15px;font-weight:600;line-height:1.3}.oEndJq_detailRefs{flex-wrap:wrap;gap:6px;margin-bottom:12px;display:flex}.oEndJq_detailMeta{flex-direction:column;gap:4px;margin:0 0 12px;font-size:12px;display:flex}.oEndJq_metaRow{gap:8px;display:flex}.oEndJq_metaLabel{width:64px;color:var(--dsh-text-secondary,#8b949e);flex:none}.oEndJq_metaValue{overflow-wrap:anywhere;min-width:0;margin:0}.oEndJq_detailSection{margin:0 0 16px}.oEndJq_detailHeading{color:var(--dsh-text-secondary,#8b949e);margin:0 0 6px;font-size:13px;font-weight:600}.oEndJq_detailBody{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font-size:13px}.oEndJq_files{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.oEndJq_fileRow{overflow-wrap:anywhere;align-items:baseline;gap:8px;font-size:12px;display:flex}.oEndJq_fileStatus{flex:none;font-size:11px}.oEndJq_filePath{font-family:var(--dsw-font-family)}.oEndJq_diff{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);white-space:pre;margin:0;font-size:12px;line-height:1.5;overflow:auto}.oEndJq_diffAdd{color:#3fb950}.oEndJq_diffDel{color:#f85149}.oEndJq_diffHunk{color:#58a6ff}.oEndJq_diffMeta{color:var(--dsh-text-secondary,#8b949e)}.oEndJq_diffTruncated{color:var(--dsh-text-secondary,#8b949e);margin-bottom:4px;font-size:12px}";
		const tagId = "@deepseek-ai/dsh-client-ui-git/GitView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-git";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var GitView_module_css_default = {
			"author": "oEndJq_author",
			"body": "oEndJq_body",
			"branch": "oEndJq_branch",
			"byline": "oEndJq_byline",
			"calendarGlyph": "oEndJq_calendarGlyph",
			"close": "oEndJq_close",
			"commit": "oEndJq_commit",
			"commitSelected": "oEndJq_commitSelected",
			"commits": "oEndJq_commits",
			"detailBody": "oEndJq_detailBody",
			"detailHeading": "oEndJq_detailHeading",
			"detailMeta": "oEndJq_detailMeta",
			"detailRefs": "oEndJq_detailRefs",
			"detailSection": "oEndJq_detailSection",
			"detailSubject": "oEndJq_detailSubject",
			"details": "oEndJq_details",
			"detailsBody": "oEndJq_detailsBody",
			"detailsHeader": "oEndJq_detailsHeader",
			"detailsState": "oEndJq_detailsState",
			"diff": "oEndJq_diff",
			"diffAdd": "oEndJq_diffAdd",
			"diffDel": "oEndJq_diffDel",
			"diffHunk": "oEndJq_diffHunk",
			"diffMeta": "oEndJq_diffMeta",
			"diffTruncated": "oEndJq_diffTruncated",
			"edge": "oEndJq_edge",
			"empty": "oEndJq_empty",
			"filePath": "oEndJq_filePath",
			"fileRow": "oEndJq_fileRow",
			"fileStatus": "oEndJq_fileStatus",
			"files": "oEndJq_files",
			"graph": "oEndJq_graph",
			"hash": "oEndJq_hash",
			"header": "oEndJq_header",
			"history": "oEndJq_history",
			"loadMore": "oEndJq_loadMore",
			"logColumn": "oEndJq_logColumn",
			"metaLabel": "oEndJq_metaLabel",
			"metaRow": "oEndJq_metaRow",
			"metaValue": "oEndJq_metaValue",
			"node": "oEndJq_node",
			"ref": "oEndJq_ref",
			"refs": "oEndJq_refs",
			"subject": "oEndJq_subject",
			"time": "oEndJq_time",
			"traversalActive": "oEndJq_traversalActive",
			"traversalButton": "oEndJq_traversalButton",
			"traversalGroup": "oEndJq_traversalGroup",
			"truncated": "oEndJq_truncated",
			"userGlyph": "oEndJq_userGlyph",
			"view": "oEndJq_view"
		};
		/** Commits loaded per history page; more are fetched on demand. */
		const LOG_PAGE_SIZE = 32;
		/** Ref badge color per kind (branch/tag use the fixed GitHub palette). */
		const REF_COLORS = {
			head: "var(--dsh-text-primary, #e6edf3)",
			branch: "#3fb950",
			tag: "#d29922",
			remote: "var(--dsh-text-secondary, #8b949e)"
		};
		const TRAVERSALS = [
			{
				mode: "first-parent",
				label: "--first-parent"
			},
			{
				mode: "max-parents-1",
				label: "--max-parents=1"
			},
			{
				mode: "max-parents-2",
				label: "--max-parents=2"
			}
		];
		/** Map a traversal mode to the host log options that reproduce its flag. */
		function traversalOptions(mode) {
			switch (mode) {
				case "first-parent": return {
					firstParent: true,
					maxParents: void 0
				};
				case "max-parents-1": return {
					firstParent: false,
					maxParents: 1
				};
				case "max-parents-2": return {
					firstParent: false,
					maxParents: 2
				};
			}
		}
		/** Badge color per changed-file status (the fixed GitHub/VSCode palette). */
		const STATUS_COLORS = {
			added: "#3fb950",
			deleted: "#f85149",
			modified: "#d29922",
			renamed: "#bc8cff",
			copied: "#bc8cff",
			typechanged: "#bc8cff",
			unmerged: "#f85149"
		};
		/** Status -> locale key. */
		const STATUS_KEY = {
			added: "status.added",
			deleted: "status.deleted",
			modified: "status.modified",
			renamed: "status.renamed",
			copied: "status.copied",
			typechanged: "status.typechanged",
			unmerged: "status.unmerged"
		};
		/** Diff-line display class per kind. */
		const DIFF_LINE_CLASS = {
			add: GitView_module_css_default.diffAdd,
			del: GitView_module_css_default.diffDel,
			hunk: GitView_module_css_default.diffHunk,
			meta: GitView_module_css_default.diffMeta,
			ctx: ""
		};
		/** Pixel x of a grid column center. */
		function xOf(column) {
			return column * 16 + 8;
		}
		/** Pixel y of a grid row center. */
		function yOf(row) {
			return row * 28 + 14;
		}
		/** Abbreviated object id shown next to a commit. */
		function shortHash(hash) {
			return hash.slice(0, 7);
		}
		/** Zero-pad a numeric date/time part to two digits. */
		function pad2(value) {
			return String(value).padStart(2, "0");
		}
		/** Human-readable timestamp (user data, not product copy): local date and time
		* with zero-padded month/day and hour/minute/second, e.g. "01/03/2026, 03:05:08". */
		function formatTime(time) {
			const date = new Date(time);
			const month = pad2(date.getMonth() + 1);
			const day = pad2(date.getDate());
			const hours = pad2(date.getHours());
			const minutes = pad2(date.getMinutes());
			const seconds = pad2(date.getSeconds());
			return `${month}/${day}/${date.getFullYear()}, ${hours}:${minutes}:${seconds}`;
		}
		/** One unified-diff line, colored by its display kind. */
		function DiffText({ diff }) {
			const lines = diff.split("\n");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: GitView_module_css_default.diff,
				children: lines.map((line, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: DIFF_LINE_CLASS[classifyDiffLine(line)],
					children: [line, index < lines.length - 1 ? "\n" : ""]
				}, index))
			});
		}
		/** The selected commit's full detail surface. */
		function CommitDetailBody({ result, t }) {
			if (result.vcs.kind !== "git") {
				const message = result.vcs.kind === "error" ? t("error.failed") + result.vcs.message : t("empty.notRepo");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.detailsState,
					children: message
				});
			}
			if (result.commit === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GitView_module_css_default.detailsState,
				children: t("details.notFound")
			});
			const commit = result.commit;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: GitView_module_css_default.detailSubject,
					children: commit.subject
				}),
				commit.refs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.detailRefs,
					children: commit.refs.map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: GitView_module_css_default.ref,
						style: { color: REF_COLORS[ref.kind] },
						children: ref.name
					}, ref.name))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
					className: GitView_module_css_default.detailMeta,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitView_module_css_default.metaRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
								className: GitView_module_css_default.metaLabel,
								children: t("details.hash")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
								className: GitView_module_css_default.metaValue,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: GitView_module_css_default.hash,
									title: commit.hash,
									children: commit.hash
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitView_module_css_default.metaRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
								className: GitView_module_css_default.metaLabel,
								children: t("details.author")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", {
								className: GitView_module_css_default.metaValue,
								children: [
									commit.authorName,
									" <",
									commit.authorEmail,
									"> · ",
									formatTime(commit.authorTime)
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitView_module_css_default.metaRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
								className: GitView_module_css_default.metaLabel,
								children: t("details.committer")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", {
								className: GitView_module_css_default.metaValue,
								children: [
									commit.committerName,
									" <",
									commit.committerEmail,
									"> · ",
									formatTime(commit.committerTime)
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitView_module_css_default.metaRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
								className: GitView_module_css_default.metaLabel,
								children: t("details.parents")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
								className: GitView_module_css_default.metaValue,
								children: commit.parents.length === 0 ? "—" : commit.parents.map(shortHash).join(", ")
							})]
						})
					]
				}),
				commit.body !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: GitView_module_css_default.detailSection,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: GitView_module_css_default.detailHeading,
						children: t("details.message")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: GitView_module_css_default.detailBody,
						children: commit.body
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: GitView_module_css_default.detailSection,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
						className: GitView_module_css_default.detailHeading,
						children: [
							t("details.files"),
							" (",
							result.files.length,
							")"
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: GitView_module_css_default.files,
						children: result.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: GitView_module_css_default.fileRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: GitView_module_css_default.fileStatus,
								style: { color: STATUS_COLORS[file.status] },
								children: t(STATUS_KEY[file.status])
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: GitView_module_css_default.filePath,
								children: file.previousPath !== void 0 ? file.previousPath + " → " + file.path : file.path
							})]
						}, file.path + ":" + file.status))
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: GitView_module_css_default.detailSection,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: GitView_module_css_default.detailHeading,
							children: t("details.diff")
						}),
						result.diffTruncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: GitView_module_css_default.diffTruncated,
							children: t("details.diffTruncated")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffText, { diff: result.diff })
					]
				})
			] });
		}
		/** The right-side pane: loading/error/ready commit detail. */
		function CommitDetails({ details, t, onClose }) {
			if (details.kind === "idle") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: GitView_module_css_default.details,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
					className: GitView_module_css_default.detailsHeader,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: GitView_module_css_default.close,
						onClick: onClose,
						"aria-label": t("details.close"),
						children: "×"
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: GitView_module_css_default.detailsBody,
					children: [
						details.kind === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: GitView_module_css_default.detailsState,
							children: t("details.loading")
						}),
						details.kind === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitView_module_css_default.detailsState,
							children: [t("error.failed"), details.message]
						}),
						details.kind === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitDetailBody, {
							result: details.result,
							t
						})
					]
				})]
			});
		}
		/**
		* The Git view slot entry: pure component over the composed props.
		* @param props - conversation view runtime, injected face, and locale seat.
		* @returns the history graph with the commit-detail pane, or a targeted notice.
		*/
		function GitView({ sessionId, git, root, t }) {
			const [state, setState] = (0, react.useState)({ kind: "idle" });
			const [selectedHash, setSelectedHash] = (0, react.useState)(null);
			const [details, setDetails] = (0, react.useState)({ kind: "idle" });
			const [traversal, setTraversal] = (0, react.useState)("first-parent");
			/** Commit window currently loaded (grows by LOG_PAGE_SIZE per load-more). */
			const [windowCount, setWindowCount] = (0, react.useState)(LOG_PAGE_SIZE);
			const [loadingMore, setLoadingMore] = (0, react.useState)(false);
			const loadMoreRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (git === void 0 || root === void 0) {
					loadMoreRef.current?.abort();
					setState({ kind: "idle" });
					return;
				}
				loadMoreRef.current?.abort();
				setWindowCount(LOG_PAGE_SIZE);
				setLoadingMore(false);
				const controller = new AbortController();
				setState({ kind: "loading" });
				const options = {
					maxCount: LOG_PAGE_SIZE,
					...traversalOptions(traversal)
				};
				git.log(sessionId, options, controller.signal).then((log) => {
					if (controller.signal.aborted) return;
					setState({
						kind: "ready",
						log
					});
				}).catch((error) => {
					if (controller.signal.aborted) return;
					setState({
						kind: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					controller.abort();
				};
			}, [
				git,
				root,
				sessionId,
				traversal
			]);
			(0, react.useEffect)(() => {
				if (git === void 0 || selectedHash === null) {
					setDetails({ kind: "idle" });
					return;
				}
				const controller = new AbortController();
				setDetails({ kind: "loading" });
				git.show(sessionId, selectedHash, controller.signal).then((result) => {
					if (controller.signal.aborted) return;
					setDetails({
						kind: "ready",
						result
					});
				}).catch((error) => {
					if (controller.signal.aborted) return;
					setDetails({
						kind: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					controller.abort();
				};
			}, [
				git,
				sessionId,
				selectedHash
			]);
			const layout = (0, react.useMemo)(() => state.kind === "ready" ? layoutGitGraph(state.log.commits) : void 0, [state]);
			const toggleSelection = (hash) => {
				setSelectedHash(selectedHash === hash ? null : hash);
			};
			const rowKeyDown = (hash) => (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					toggleSelection(hash);
				}
			};
			const changeMode = (mode) => {
				if (mode === traversal) return;
				loadMoreRef.current?.abort();
				setTraversal(mode);
				setWindowCount(LOG_PAGE_SIZE);
				setLoadingMore(false);
				setSelectedHash(null);
				setDetails({ kind: "idle" });
			};
			const loadMore = () => {
				if (git === void 0 || state.kind !== "ready") return;
				const next = windowCount + LOG_PAGE_SIZE;
				loadMoreRef.current?.abort();
				const controller = new AbortController();
				loadMoreRef.current = controller;
				setWindowCount(next);
				setLoadingMore(true);
				const options = {
					maxCount: next,
					...traversalOptions(traversal)
				};
				git.log(sessionId, options, controller.signal).then((log) => {
					if (controller.signal.aborted) return;
					setState({
						kind: "ready",
						log
					});
				}).catch((error) => {
					if (controller.signal.aborted) return;
					setState({
						kind: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				}).finally(() => {
					if (!controller.signal.aborted) setLoadingMore(false);
				});
			};
			if (git === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GitView_module_css_default.view,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.empty,
					children: t("empty.requiresHost")
				})
			});
			if (root === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GitView_module_css_default.view,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.empty,
					children: t("empty.noWorkspace")
				})
			});
			if (state.kind === "idle" || state.kind === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GitView_module_css_default.view,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.empty,
					children: t("loading")
				})
			});
			if (state.kind === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GitView_module_css_default.view,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: GitView_module_css_default.empty,
					children: [t("error.failed"), state.message]
				})
			});
			const { log } = state;
			if (log.vcs.kind !== "git") {
				const message = log.vcs.kind === "error" ? t("error.failed") + log.vcs.message : t("empty.notRepo");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.view,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: GitView_module_css_default.empty,
						children: message
					})
				});
			}
			if (log.commits.length === 0 || layout === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GitView_module_css_default.view,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: GitView_module_css_default.empty,
					children: t("empty.noCommits")
				})
			});
			const width = layout.width * 16;
			const height = log.commits.length * 28;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: GitView_module_css_default.view,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: GitView_module_css_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: GitView_module_css_default.branch,
						title: log.headHash,
						children: log.currentBranch ?? "HEAD"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: GitView_module_css_default.traversalGroup,
						role: "group",
						"aria-label": t("log.traversalLabel"),
						title: t("log.traversalLabel"),
						children: TRAVERSALS.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: entry.mode === traversal ? GitView_module_css_default.traversalButton + " " + GitView_module_css_default.traversalActive : GitView_module_css_default.traversalButton,
							"aria-pressed": entry.mode === traversal,
							onClick: () => {
								changeMode(entry.mode);
							},
							children: entry.label
						}, entry.mode))
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: GitView_module_css_default.body,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: GitView_module_css_default.history,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							className: GitView_module_css_default.graph,
							width,
							height,
							"aria-hidden": "true",
							children: [layout.edges.map((edge, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
								className: GitView_module_css_default.edge,
								points: edge.points.map((point) => xOf(point.column) + "," + yOf(point.row)).join(" ")
							}, index)), layout.nodes.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								className: GitView_module_css_default.node,
								cx: xOf(node.column),
								cy: yOf(node.row),
								r: 3
							}, node.hash))]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitView_module_css_default.logColumn,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
								className: GitView_module_css_default.commits,
								children: log.commits.map((commit) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: commit.hash === selectedHash ? GitView_module_css_default.commit + " " + GitView_module_css_default.commitSelected : GitView_module_css_default.commit,
									style: { height: 28 },
									role: "button",
									tabIndex: 0,
									"aria-pressed": commit.hash === selectedHash,
									onClick: () => {
										toggleSelection(commit.hash);
									},
									onKeyDown: rowKeyDown(commit.hash),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: GitView_module_css_default.hash,
											title: commit.hash,
											children: shortHash(commit.hash)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: GitView_module_css_default.refs,
											children: commit.refs.map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: GitView_module_css_default.ref,
												style: { color: REF_COLORS[ref.kind] },
												children: ref.name
											}, ref.name))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: GitView_module_css_default.subject,
											children: commit.subject
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: GitView_module_css_default.byline,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: GitView_module_css_default.author,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
													className: GitView_module_css_default.userGlyph,
													viewBox: "0 0 24 24",
													"aria-hidden": "true",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "12",
														cy: "7",
														r: "4"
													})]
												}), commit.authorName]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: GitView_module_css_default.time,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
													className: GitView_module_css_default.calendarGlyph,
													viewBox: "0 0 24 24",
													"aria-hidden": "true",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
															x: "3",
															y: "4",
															width: "18",
															height: "18",
															rx: "2",
															ry: "2"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
															x1: "16",
															y1: "2",
															x2: "16",
															y2: "6"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
															x1: "8",
															y1: "2",
															x2: "8",
															y2: "6"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
															x1: "3",
															y1: "10",
															x2: "21",
															y2: "10"
														})
													]
												}), formatTime(commit.authorTime)]
											})]
										})
									]
								}, commit.hash))
							}), log.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: GitView_module_css_default.loadMore,
								onClick: loadMore,
								disabled: loadingMore,
								children: loadingMore ? t("log.loadingMore") : t("log.loadMore")
							})]
						})]
					}), selectedHash !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitDetails, {
						details,
						t,
						onClose: () => {
							setSelectedHash(null);
						}
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/git-remote.ts
		/**
		* Resolve the host git remote, or undefined when the host has not implemented
		* it yet (see HOST_PRIMITIVES.md). The accessor reads the namespace lazily so
		* the plugin never parks on a not-yet-shipped controller.
		* @param ctx - client root context carrying the `remote` service.
		* @returns the typed remote, or undefined when the namespace is absent.
		*/
		function resolveGitRemote(ctx) {
			const namespace = ctx.get("remote.git");
			if (namespace === void 0) return void 0;
			return {
				async log(sessionId, options, signal) {
					const result = await namespace.log(sessionId, options, signal);
					if (!result.ok) throw new Error(result.error.message);
					return result.value;
				},
				async show(sessionId, hash, signal) {
					const result = await namespace.show(sessionId, hash, signal);
					if (!result.ok) throw new Error(result.error.message);
					return result.value;
				}
			};
		}
		//#endregion
		//#region src/client/locales.ts
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"view.git": "Git",
			"empty.requiresHost": "此标签页需要宿主端的 git 远程接口才能读取提交历史。请参阅 packages/client/ui-git 下的 HOST_PRIMITIVES.md。",
			"empty.noWorkspace": "当前会话没有可用的工作区根目录。",
			"empty.noCommits": "该仓库还没有任何提交。",
			"empty.notRepo": "当前工作区不在 git 仓库内。",
			"loading": "正在加载历史…",
			"error.failed": "加载 git 历史失败：",
			"log.traversalLabel": "历史遍历方式",
			"log.loadMore": "加载更多",
			"log.loadingMore": "加载更多…",
			"details.loading": "正在加载提交详情…",
			"details.notFound": "找不到该提交。",
			"details.close": "关闭详情",
			"details.hash": "哈希",
			"details.author": "作者",
			"details.committer": "提交者",
			"details.parents": "父提交",
			"details.message": "提交说明",
			"details.files": "变更文件",
			"details.diff": "差异",
			"details.diffTruncated": "差异已截断",
			"status.added": "新增",
			"status.deleted": "删除",
			"status.modified": "修改",
			"status.renamed": "重命名",
			"status.copied": "复制",
			"status.typechanged": "类型变更",
			"status.unmerged": "未合并"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"view.git": "Git",
			"empty.requiresHost": "This tab needs a host-side git remote to read commit history. See HOST_PRIMITIVES.md under packages/client/ui-git.",
			"empty.noWorkspace": "This session has no workspace root.",
			"empty.noCommits": "This repository has no commits yet.",
			"empty.notRepo": "The workspace is not a git repository.",
			"loading": "Loading history…",
			"error.failed": "Failed to load git history: ",
			"log.traversalLabel": "History traversal",
			"log.loadMore": "Load more",
			"log.loadingMore": "Loading more…",
			"details.loading": "Loading commit details…",
			"details.notFound": "Commit not found.",
			"details.close": "Close details",
			"details.hash": "Hash",
			"details.author": "Author",
			"details.committer": "Committer",
			"details.parents": "Parents",
			"details.message": "Message",
			"details.files": "Files changed",
			"details.diff": "Diff",
			"details.diffTruncated": "Diff truncated",
			"status.added": "added",
			"status.deleted": "deleted",
			"status.modified": "modified",
			"status.renamed": "renamed",
			"status.copied": "copied",
			"status.typechanged": "type changed",
			"status.unmerged": "unmerged"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the conversation slot, the session list, the locale service, and the Remote carrier. */
		const inject = [
			"slots",
			"sessions",
			"locale",
			"remote"
		];
		/**
		* Client plugin body: register the Git view tab. The registration rides the
		* slot service's effect wrapper, so plugin unload removes the tab.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("git", {
				zh,
				en
			}), "ui-git: dictionaries");
			const t = ctx.locale.bind("git");
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "git",
				order: 23,
				locale: "git",
				label: () => t("view.git"),
				children: {},
				inject: (sessionId) => ({
					git: resolveGitRemote(ctx),
					root: ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
				})
			}, GitView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map