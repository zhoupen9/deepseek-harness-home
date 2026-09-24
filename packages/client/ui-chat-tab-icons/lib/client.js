window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-chat-tab-icons",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let react_dom_client = require("react-dom/client");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region src/client/tab-icons.ts
		/**
		* Pure predicates behind the chat-tab icon decoration: which conversation view
		* ids the plugin draws an icon for, and which rendered tab row is the session
		* view strip. Kept apart from the DOM work, so both rules are testable without
		* a browser.
		*/
		/** View ids this plugin decorates, in the order the shipped views register. */
		const TAB_ICON_IDS = [
			"chat",
			"trajectory",
			"edits",
			"changes",
			"git"
		];
		/**
		* Whether the plugin draws an icon for a view id. An id the plugin does not
		* know — a view another plugin registers later — simply keeps its plain tab.
		* @param id - view id projected from a `conversation.view` entry, or undefined.
		* @returns true when the id is one of the decorated views.
		*/
		function hasTabIcon(id) {
			return id !== void 0 && TAB_ICON_IDS.includes(id);
		}
		/**
		* Whether a rendered tab row is the session view strip. That strip carries
		* exactly one tab per registered `conversation.view` entry, because the
		* conversation shell projects one tab per entry; any other `tablist` on the
		* page (a settings surface, a third-party panel) is left alone.
		* @param tabCount - tabs rendered in the candidate row.
		* @param viewCount - registered `conversation.view` entries.
		* @returns true when the row maps one-to-one onto the view entries.
		*/
		function isSessionTabRow(tabCount, viewCount) {
			return tabCount > 1 && tabCount === viewCount;
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-chat-tab-icons/src/client/TabIcons.module.css.mjs
		const css = ".N2z-Mq_icon{vertical-align:-2px;width:14px;height:14px;color:var(--dsw-alias-label-caption);margin-right:5px}";
		const tagId = "@deepseek-ai/dsh-client-ui-chat-tab-icons/TabIcons.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-chat-tab-icons";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TabIcons_module_css_default = { "icon": "N2z-Mq_icon" };
		//#endregion
		//#region src/client/index.ts
		/**
		* Browser chat-tab-icons plugin: prepends one shipped icon to each conversation
		* view tab — Chat, Trajectory, Edits, Changes, and Git.
		*
		* The decoration rides two renderer seams and patches no shipped package:
		* - `ctx.slots.entries('conversation.view')` yields the registered view ids in
		*   tab order, so tabs are matched by id rather than by label text: a locale
		*   switch cannot break the mapping, and a view this plugin does not know
		*   keeps its plain tab.
		* - every slot render site exposes the renderer's `[data-slot="<key>"]` anchor
		*   (a `display: contents` wrapper), so the session strip is the
		*   `[role="tablist"]` inside `[data-slot="conversation.session"]` whose tab
		*   count equals the view-entry count; any other tab row is left alone.
		*
		* Each icon is rendered once from its shipped `ui-primitives` component and
		* cloned into the tab button, so React never owns a child this plugin moved.
		* A `MutationObserver` re-applies after the shell re-renders the strip (a
		* view registering or unregistering, a session switch), filtered to mutations
		* that actually touch a tab list so streaming transcript churn costs nothing.
		*/
		/** Required service: the slot registry that owns the view entries. */
		const inject = ["slots"];
		/** Shipped icon drawn on each decorated view tab. */
		const TAB_ICONS = {
			chat: _deepseek_ai_dsh_client_ui_primitives.IconNewChatOutlineRegular,
			trajectory: _deepseek_ai_dsh_client_ui_primitives.IconThinkOutlineRegular,
			edits: _deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular,
			changes: _deepseek_ai_dsh_client_ui_primitives.IconCodeOutlineRegular,
			git: _deepseek_ai_dsh_client_ui_primitives.IconBranchOutlineRegular
		};
		/**
		* Render-site anchors that own the tab strip, most specific first. The strip
		* lives in the conversation header's slot anchor; the session anchor stays as
		* a second candidate because the header is projected inside the session
		* surface.
		*/
		const STRIP_ANCHORS = ["[data-slot=\"conversation.session.header\"]", "[data-slot=\"conversation.session\"]"];
		/** Selector matching every rendered tab row. */
		const TABLIST = "[role=\"tablist\"]";
		/** Selector matching one tab inside a rendered row. */
		const TAB = "[role=\"tab\"]";
		/**
		* Render every decorated icon once and keep a detached clone of each.
		* @returns the icon node per view id.
		*/
		function buildTabIcons() {
			const icons = /* @__PURE__ */ new Map();
			for (const [id, Icon] of Object.entries(TAB_ICONS)) {
				const holder = document.createElement("span");
				const root = (0, react_dom_client.createRoot)(holder);
				(0, react_dom.flushSync)(() => {
					root.render((0, react.createElement)(Icon, { className: TabIcons_module_css_default.icon }));
				});
				const rendered = holder.firstElementChild;
				const icon = rendered === null ? null : rendered.cloneNode(true);
				root.unmount();
				if (icon !== null) icons.set(id, icon);
			}
			return icons;
		}
		/**
		* Whether a mutation batch can change the tab strip. Transcript and composer
		* churn mutates other subtrees continuously, so every record is screened
		* before the decoration pass is scheduled.
		* @param records - one MutationObserver batch.
		* @returns true when a record touched a tab row or introduced one.
		*/
		/** Element node type; the realm-safe test for a DOM element. */
		const ELEMENT_NODE = 1;
		/**
		* Narrow a mutation target or added node to an element.
		* @param node - node observed by the mutation record.
		* @returns the element, or null for text, comment, and document nodes.
		*/
		function asElement(node) {
			return node.nodeType === ELEMENT_NODE ? node : null;
		}
		function touchesTabStrip(records) {
			return records.some((record) => {
				const target = asElement(record.target);
				if (target !== null && target.closest(TABLIST) !== null) return true;
				for (const node of record.addedNodes) {
					const element = asElement(node);
					if (element !== null && (element.matches(TABLIST) || element.querySelector(TABLIST) !== null)) return true;
				}
				return false;
			});
		}
		/**
		* Candidate tab rows, most specific anchor first. Falling back to every
		* rendered row keeps a shell change that moves the strip from silently
		* disabling the decoration: the tab-count check is what identifies the strip.
		* @returns the tab rows to consider.
		*/
		function findTabRows() {
			for (const anchor of STRIP_ANCHORS) {
				const surface = document.querySelector(anchor);
				if (surface === null) continue;
				const rows = Array.from(surface.querySelectorAll(TABLIST));
				if (rows.length > 0) return rows;
			}
			return Array.from(document.querySelectorAll(TABLIST));
		}
		/**
		* Place the icons on the session tab row, in view order.
		* @param icons - icon node per view id.
		* @param viewIds - registered view ids, in tab order.
		*/
		function decorateTabRow(icons, viewIds) {
			for (const tablist of findTabRows()) {
				const tabs = Array.from(tablist.querySelectorAll(TAB));
				if (!isSessionTabRow(tabs.length, viewIds.length)) continue;
				tabs.forEach((tab, index) => {
					const id = viewIds[index];
					const icon = hasTabIcon(id) ? icons.get(id) : void 0;
					/* v8 ignore next -- an icon already in its tab is the steady state. */
					if (icon === void 0 || icon.parentElement === tab) return;
					tab.prepend(icon);
				});
			}
		}
		/**
		* Client plugin body: decorate the view tabs while the `conversation.view`
		* slot is declared, and remove everything it added when it is not.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.view", () => {
				const icons = buildTabIcons();
				const decorate = () => {
					decorateTabRow(icons, ctx.slots.entries("conversation.view").map((entry) => entry.options.id));
				};
				let scheduled = false;
				const schedule = (records) => {
					if (scheduled || !touchesTabStrip(records)) return;
					scheduled = true;
					queueMicrotask(() => {
						scheduled = false;
						decorate();
					});
				};
				const observer = new MutationObserver(schedule);
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
				decorate();
				return () => {
					observer.disconnect();
					for (const icon of icons.values()) icon.remove();
				};
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map