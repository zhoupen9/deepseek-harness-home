window.__ModuleLoader__.load({
	id: "@zar-desktop/ui-composer-pills",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-inline-css:/home/zhoupeng/.dsh/packages/client/ui-composer-pills/src/client/composer-pills.css.mjs
		var composer_pills_css_default = "[data-composer-dock]>span,[data-composer-dock]:not(:has(>[data-slot]>*)){display:none!important}";
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-composer-pills/src/client/ComposerPillsRow.module.css.mjs
		const css = ".F5bpDa_row{border-bottom:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding:16px 0;display:flex}.F5bpDa_head{align-items:flex-start;gap:8px;display:flex}.F5bpDa_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:16px;display:flex}.F5bpDa_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.F5bpDa_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.F5bpDa_switch{margin-top:1px}@media (width<=767px){.F5bpDa_rowText{padding-right:0}}";
		const tagId = "@zar-desktop/ui-composer-pills/ComposerPillsRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zar-desktop/ui-composer-pills";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ComposerPillsRow_module_css_default = {
			"desc": "F5bpDa_desc",
			"head": "F5bpDa_head",
			"row": "F5bpDa_row",
			"rowText": "F5bpDa_rowText",
			"switch": "F5bpDa_switch",
			"title": "F5bpDa_title"
		};
		//#endregion
		//#region src/client/ComposerPillsRow.tsx
		/**
		* Composer-pill preference row registered into the General section item slot:
		* title and description with the master switch. The displayed value follows
		* the persisted setting, never the click echo.
		*/
		/**
		* Render the composer-pill row.
		* @param props - composed slot props.
		* @returns the row element tree.
		*/
		function ComposerPillsRow({ t, setHidden, useStore }) {
			const hidden = useStore((s) => s.hideBuiltinPills);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ComposerPillsRow_module_css_default.row,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ComposerPillsRow_module_css_default.head,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ComposerPillsRow_module_css_default.rowText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ComposerPillsRow_module_css_default.title,
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ComposerPillsRow_module_css_default.desc,
							children: t("description")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
						className: ComposerPillsRow_module_css_default.switch,
						checked: hidden,
						onChange: setHidden,
						label: t("hide")
					})]
				})
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Composer-pill row dictionaries for the General settings section. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.composer-pills";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "内置统计胶囊",
			"description": "隐藏聊天输入框下方的内置统计胶囊（运行状态与用量）以及上下文用量表。",
			"hide": "隐藏内置胶囊"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"title": "Builtin composer pills",
			"description": "Hide the shipped statistics pills (activity and usage) and the context-usage meter below the chat input.",
			"hide": "Hide builtin pills"
		};
		//#endregion
		//#region src/client/settings.ts
		/** Durable composer-pill preference and the row's identity constants. */
		/** Loader-entry id that owns the settings namespace; must match the bundle row id. */
		const COMPOSER_PILLS_SETTINGS_NAMESPACE = "ui-composer-pills";
		/** Settings field carrying the hide switch. */
		const COMPOSER_PILLS_HIDDEN_FIELD = "hideBuiltinPills";
		/** Plugin identity used for the injected style tag. */
		const COMPOSER_PILLS_PLUGIN_ID = "@zar-desktop/ui-composer-pills";
		/**
		* Composer dock cells owned by ui-chat. Reusing an id puts this plugin in that
		* cell; the lowest priority renders, so a null occupant at priority -1 hides
		* the shipped pill without touching any other cell in the slot.
		*/
		const BUILTIN_DOCK_CELLS = ["activity", "usage"];
		/** Slot the builtin pills register into, and the slot anchor carrying them. */
		const COMPOSER_DOCK_SLOT = "conversation.composer.dock";
		/** Settings → General cell key of this plugin's row. */
		const COMPOSER_PILLS_ROW_ID = "composer-pills";
		/** Values the namespace resolves to when the user has not overridden anything. */
		const DEFAULT_COMPOSER_PILLS_SETTINGS = Object.freeze({ hideBuiltinPills: false });
		//#endregion
		//#region src/client/store.ts
		/** Row store mirroring the accepted composer-pill setting. */
		/**
		* Declares the composer-pill row state and sync surface.
		* @returns the store handle.
		*/
		function createComposerPillsRowStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					...DEFAULT_COMPOSER_PILLS_SETTINGS,
					revision: -1
				}),
				actions: { sync: (d, settings, revision) => {
					if (revision <= d.revision) return;
					d.hideBuiltinPills = settings.hideBuiltinPills;
					d.revision = revision;
				} }
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: slots and locale for the row, configForms for the setting. */
		const inject = [
			"slots",
			"locale",
			"configForms"
		];
		/**
		* Occupant that replaces one builtin pill: this plugin registers it under the
		* shipped cell id at priority -1, so the cell renders nothing.
		* @returns null, always.
		*/
		function SuppressedPill() {
			return null;
		}
		/** Mount the sheet that hides the context meter and the emptied strip. */
		function installSuppressionStyles() {
			if (typeof document === "undefined") return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = COMPOSER_PILLS_PLUGIN_ID;
			tag.dataset.pluginCss = `${COMPOSER_PILLS_PLUGIN_ID}/composer-pills.css`;
			tag.textContent = composer_pills_css_default;
			document.head.append(tag);
			return () => {
				tag.remove();
			};
		}
		/**
		* Client plugin body: adopt the durable setting, hide the builtin pills while
		* it is on, and register the General row that writes it.
		* @param ctx - client plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-composer-pills: dictionaries");
			const form = ctx.configForms.get(COMPOSER_PILLS_SETTINGS_NAMESPACE);
			const store = createComposerPillsRowStore();
			let bound;
			/** Resources owned while the hiding is on; empty while it is off. */
			let owned = [];
			const release = () => {
				for (const dispose of owned.splice(0).reverse()) dispose();
			};
			ctx.effect(() => release, "ui-composer-pills: owned suppressions");
			/**
			* Install or remove the suppression for one accepted value.
			* @param hidden - whether the builtin pills should be hidden.
			*/
			const suppress = (hidden) => {
				release();
				if (!hidden) return;
				for (const cell of BUILTIN_DOCK_CELLS) owned.push(ctx.slots.inject(COMPOSER_DOCK_SLOT, () => ctx.slots.register({
					name: COMPOSER_DOCK_SLOT,
					id: cell,
					priority: -1
				}, SuppressedPill)));
				owned.push(installSuppressionStyles());
			};
			/** Mirror the accepted value into the row store; safe to call while the row assembles. */
			const syncRow = () => {
				const snapshot = form.getSnapshot();
				if (snapshot.value !== void 0) bound?.sync(snapshot.value, snapshot.revision ?? 0);
			};
			/**
			* Apply one accepted value: hide or restore the pills, then mirror it to the
			* row. Never called from a slot `inject` — registering the suppression while
			* another slot assembles would mutate the ledger mid-render.
			*/
			const adopt = () => {
				const settings = form.getSnapshot().value;
				if (settings === void 0) return;
				suppress(settings.hideBuiltinPills);
				syncRow();
			};
			ctx.effect(() => form.subscribe(adopt), "ui-composer-pills: settings adoption");
			adopt();
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: COMPOSER_PILLS_ROW_ID,
				order: 13,
				store,
				locale: NS,
				inject: (actions) => {
					bound = actions;
					syncRow();
					return { setHidden: (hidden) => {
						form.set(COMPOSER_PILLS_HIDDEN_FIELD, hidden);
					} };
				}
			}, ComposerPillsRow));
		}
		//#endregion
		exports.SuppressedPill = SuppressedPill;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map