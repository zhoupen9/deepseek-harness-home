window.__ModuleLoader__.load({
	id: "@zar-desktop/ui-todo-pill",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/todo-pill.ts
		/**
		* En spaces around the separator: HTML collapses runs of ASCII spaces, so the
		* shipped card's breathing room needs a literal wide space.
		*/
		const SEPARATOR = " · ";
		/** Local exhaustiveness helper (client packages do not depend on dsh-llm). */
		function assertNever(value) {
			throw new Error("unreachable todo status: " + String(value));
		}
		/**
		* Whether a projection value has anything to show.
		* @param todos - the todos projection value (null before the first write).
		* @returns true for a non-empty list.
		*/
		function hasTodos(todos) {
			return todos !== null && todos !== void 0 && todos.length > 0;
		}
		/**
		* Count one snapshot by lifecycle state.
		* @param todos - a todo list.
		* @returns the per-status counts; total is the list length.
		*/
		function countTodos(todos) {
			let done = 0;
			let active = 0;
			for (const item of todos) if (item.status === "completed") done += 1;
			else if (item.status === "in_progress") active += 1;
			return {
				done,
				active,
				pending: todos.length - done - active,
				total: todos.length
			};
		}
		/**
		* The per-status progress segments in the shipped card's order (completed, in
		* progress, pending), omitting zero-count segments as noise.
		* @param todos - a non-empty todo list.
		* @param t - namespace-bound translator.
		* @returns at least one localized segment.
		*/
		function progressSegments(todos, t) {
			const counts = countTodos(todos);
			return [
				...counts.done > 0 ? [t("progress.done", { done: counts.done })] : [],
				...counts.active > 0 ? [t("progress.active", { active: counts.active })] : [],
				...counts.pending > 0 ? [t("progress.pending", { pending: counts.pending })] : []
			];
		}
		/**
		* The joined progress summary the pill shows and the panel heads with.
		* @param todos - a non-empty todo list.
		* @param t - namespace-bound translator.
		* @returns the localized summary.
		*/
		function progressText(todos, t) {
			return progressSegments(todos, t).join(SEPARATOR);
		}
		/**
		* Compact reading for narrow header rows.
		* @param todos - a non-empty todo list.
		* @param t - namespace-bound translator.
		* @returns completed over total, for example 2/5.
		*/
		function fractionText(todos, t) {
			const counts = countTodos(todos);
			return t("fraction", {
				done: counts.done,
				total: counts.total
			});
		}
		/**
		* Accessible name of the pill: the surface title plus the full summary.
		* @param todos - a non-empty todo list.
		* @param t - namespace-bound translator.
		* @returns the localized name.
		*/
		function ariaText(todos, t) {
			return t("aria.pill", {
				title: t("title"),
				progress: progressText(todos, t)
			});
		}
		/**
		* Map a Todo lifecycle state onto the shared compact status language.
		* @param status - todo lifecycle state.
		* @returns the StateDot state to draw beside the item.
		*/
		function statusState(status) {
			switch (status) {
				case "completed": return "done";
				case "in_progress": return "ongoing";
				case "pending": return "idle";
				/* v8 ignore next -- closed TodoItem status union */
				default: return assertNever(status);
			}
		}
		/**
		* Localized status name for the panel row's screen-reader label.
		* @param status - todo lifecycle state.
		* @param t - namespace-bound translator.
		* @returns the localized status.
		*/
		function statusLabel(status, t) {
			switch (status) {
				case "completed": return t("status.completed");
				case "in_progress": return t("status.inProgress");
				case "pending": return t("status.pending");
				/* v8 ignore next -- closed TodoItem status union */
				default: return assertNever(status);
			}
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-todo-pill/src/client/TodoPill.module.css.mjs
		const css = ".ulirOG_root{align-items:center;min-width:0;display:inline-flex}.ulirOG_trigger{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);min-width:0;max-width:240px;height:26px;color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family);white-space:nowrap;cursor:pointer;background:0 0;border-radius:13px;align-items:center;gap:6px;padding:5px 10px;font-size:11px;font-weight:400;line-height:16px;display:inline-flex}@media (hover:hover){.ulirOG_trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}}.ulirOG_trigger:active{background:var(--dsw-alias-interactive-bg-hover-solid)}.ulirOG_trigger:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.ulirOG_icon{width:14px;height:14px;color:var(--dsw-alias-label-caption);flex:none}.ulirOG_full{text-overflow:ellipsis;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden}.ulirOG_compact{font-variant-numeric:tabular-nums;display:none}@container (width<=760px){.ulirOG_full{display:none}.ulirOG_compact{display:inline}}@container (width<=600px){.ulirOG_compact{display:none}}.ulirOG_panel{z-index:1100;box-sizing:border-box;width:max-content;min-width:min(280px,100vw - 24px);max-width:min(420px,100vw - 24px);max-height:var(--dsh-anchored-max-height,none);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);box-shadow:var(--dsw-elevation-panel);color:var(--dsw-alias-label-secondary);cursor:default;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;flex-direction:column;padding:16px;font-size:12px;line-height:18px;display:flex;position:fixed}.ulirOG_head{color:var(--dsw-alias-label-primary);flex:none;justify-content:space-between;gap:16px;font-weight:500;display:flex}.ulirOG_headTitle{align-items:center;gap:6px;min-width:0;display:inline-flex}.ulirOG_panelIcon{flex:none;width:14px;height:14px}.ulirOG_headValue{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none;font-weight:400}.ulirOG_rule{border-top:.5px solid var(--dsw-alias-border-l2);flex:none;margin:8px 0 10px}.ulirOG_list{flex-direction:column;gap:8px;min-height:0;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.ulirOG_item{min-width:0;color:var(--dsw-alias-label-secondary);align-items:flex-start;gap:10px;font-size:13px;line-height:20px;display:flex}.ulirOG_glyph{flex:none;place-items:center;width:16px;height:16px;margin-top:2px;display:grid}.ulirOG_content{overflow-wrap:anywhere;min-width:0}";
		const tagId = "@zar-desktop/ui-todo-pill/TodoPill.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zar-desktop/ui-todo-pill";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TodoPill_module_css_default = {
			"compact": "ulirOG_compact",
			"content": "ulirOG_content",
			"full": "ulirOG_full",
			"glyph": "ulirOG_glyph",
			"head": "ulirOG_head",
			"headTitle": "ulirOG_headTitle",
			"headValue": "ulirOG_headValue",
			"icon": "ulirOG_icon",
			"item": "ulirOG_item",
			"list": "ulirOG_list",
			"panel": "ulirOG_panel",
			"panelIcon": "ulirOG_panelIcon",
			"root": "ulirOG_root",
			"rule": "ulirOG_rule",
			"trigger": "ulirOG_trigger"
		};
		//#endregion
		//#region src/client/TodoPill.tsx
		/**
		* To-dos pill for the Session header and its list panel.
		*
		* The wide pill is the header's leftmost utility (order -12), one step left of
		* the session-metrics capsule, and shows the shipped To-dos card's progress
		* summary. Clicking it opens one row per todo, each with the shared status dot,
		* in a portaled panel placed by the same ui-primitives seat the shipped dialogs
		* use. The sibling TodoPillSuppressed occupant reuses the composer dock's todo
		* cell at a lower priority, so the shipped card above the input disappears
		* while this plugin is mounted.
		*
		* The panel mirrors rather than imports the shipped card's surface: a feature
		* plugin may not import another feature plugin's stylesheet, so the menu
		* surface, elevation, and scrollbar colors are copied into the module CSS.
		*/
		/**
		* Unplaced panel style: hidden but laid out, so placement measures the real
		* dimensions before paint (the shipped dialogs' own seat).
		*/
		const MEASURE_STYLE = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		/** The header To-dos pill; renders nothing without todos. */
		const TodoPill = (0, react.memo)(function TodoPill({ useProjection, sessionId, t }) {
			const projected = useProjection("todos");
			const todos = hasTodos(projected) ? projected : null;
			const [open, setOpen] = (0, react.useState)(false);
			const [openSession, setOpenSession] = (0, react.useState)(sessionId);
			if (openSession !== sessionId) {
				setOpenSession(sessionId);
				if (open) setOpen(false);
			}
			if (todos === null && open) setOpen(false);
			const shown = open && todos !== null;
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const position = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open: shown,
				anchorRef: triggerRef,
				panelRef,
				side: "bottom",
				gap: 6,
				margin: 12
			});
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, shown, setOpen, panelRef);
			(0, react.useEffect)(() => {
				if (!shown) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [shown]);
			if (todos === null) return null;
			const summary = progressText(todos, t);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: TodoPill_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: summary,
					side: "bottom",
					delayMs: 400,
					portal: true,
					disabled: open,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						ref: triggerRef,
						type: "button",
						className: TodoPill_module_css_default.trigger,
						"aria-label": ariaText(todos, t),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						onClick: () => {
							setOpen((value) => !value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutlineRegular, { className: TodoPill_module_css_default.icon }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TodoPill_module_css_default.full,
								children: summary
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TodoPill_module_css_default.compact,
								children: fractionText(todos, t)
							})
						]
					})
				}), shown && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					className: TodoPill_module_css_default.panel,
					role: "dialog",
					"aria-label": t("title"),
					style: position ?? MEASURE_STYLE,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TodoPill_module_css_default.head,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TodoPill_module_css_default.headTitle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutlineRegular, { className: TodoPill_module_css_default.panelIcon }), t("title")]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TodoPill_module_css_default.headValue,
								children: summary
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: TodoPill_module_css_default.rule,
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: TodoPill_module_css_default.list,
							children: todos.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: TodoPill_module_css_default.item,
								"data-status": item.status,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TodoPill_module_css_default.glyph,
									role: "img",
									"aria-label": statusLabel(item.status, t),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: statusState(item.status) })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TodoPill_module_css_default.content,
									children: item.content
								})]
							}, item.content))
						})
					]
				}), document.body)]
			});
		});
		/**
		* Replacement occupant of the shipped composer To-dos card: this entry reuses
		* the todo cell of conversation.input.dock at a lower priority, so
		* ui-conversation's TodoDock (priority 0) is shadowed and the card above the
		* input disappears — its list lives in the header pill instead.
		*/
		const TodoPillSuppressed = (0, react.memo)(function TodoPillSuppressed() {
			return null;
		});
		//#endregion
		//#region src/client/locales.ts
		/**
		* To-dos pill namespace dictionaries for the Session header surface.
		*
		* The title, progress, and status strings mirror ui-conversation's shipped
		* todo.* copy byte for byte, so the pill and the panel read exactly like the
		* card they replace; the two dictionaries stay complete against each other.
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "todo-pill";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "任务",
			"progress.done": "{done} 已完成",
			"progress.active": "{active} 进行中",
			"progress.pending": "{pending} 待处理",
			"status.completed": "已完成",
			"status.inProgress": "进行中",
			"status.pending": "待处理",
			"fraction": "{done}/{total}",
			"aria.pill": "{title}：{progress}"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"title": "To-dos",
			"progress.done": "{done} completed",
			"progress.active": "{active} in progress",
			"progress.pending": "{pending} pending",
			"status.completed": "Completed",
			"status.inProgress": "In progress",
			"status.pending": "Pending",
			"fraction": "{done}/{total}",
			"aria.pill": "{title}: {progress}"
		};
		//#endregion
		//#region src/client/registrations.ts
		/**
		* Registration descriptors for the To-dos pill, kept free of React and of the
		* browser CSS so unit specs can assert the wiring without a DOM.
		*
		* Two entries carry the move:
		* - the pill joins 'conversation.session.header.utilities' at order -12, one
		*   step left of the session-metrics capsule (order -11) and of the shipped
		*   'open-in-app' split button (order -10);
		* - the composer's To-dos cell ('conversation.input.dock', id 'todo') is
		*   shadowed by a null occupant at a lower priority. Same-id list entries
		*   coexist only at distinct priorities and the lowest live one renders, so
		*   the shipped card disappears while this plugin is mounted and comes back
		*   when it unloads.
		*/
		/** Header pill entry: the wide pill and its list panel. */
		const HEADER_ENTRY = {
			name: "conversation.session.header.utilities",
			id: "todo-pill",
			order: -12
		};
		/** Composer dock cell occupied by the shipped To-dos card (ui-conversation's TodoDock). */
		const DOCK_SHADOW = {
			name: "conversation.input.dock",
			id: "todo",
			priority: -1
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot ledger and the locale face. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register the header pill, shadow the shipped composer
		* card, and install this plugin's dictionaries. Every effect is removed on
		* plugin unload, which restores the shipped surface.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-todo-pill: dictionaries");
			ctx.slots.inject(HEADER_ENTRY.name, () => ctx.slots.register({
				...HEADER_ENTRY,
				locale: NS
			}, TodoPill));
			ctx.slots.inject(DOCK_SHADOW.name, () => ctx.slots.register({ ...DOCK_SHADOW }, TodoPillSuppressed));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map