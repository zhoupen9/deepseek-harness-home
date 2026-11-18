window.__ModuleLoader__.load({
	id: "@zar-desktop/ui-palette",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region src/palette-settings.ts
		/** Palette fields shared by the host schema and the browser scope. */
		/** Loader-entry id that owns the settings namespace; must match the bundle row id. */
		const PALETTE_SETTINGS_NAMESPACE = "ui-palette";
		/** Every field in schema order. */
		const PALETTE_FIELDS = Object.freeze([
			"backgroundLight",
			"backgroundDark",
			"surfaceLight",
			"surfaceDark",
			"menuLight",
			"menuDark",
			"sidebarLight",
			"sidebarDark",
			"inputLight",
			"inputDark",
			"cardLight",
			"cardDark",
			"dialogLight",
			"dialogDark",
			"navLight",
			"navDark",
			"moduleLight",
			"moduleDark",
			"bubbleLight",
			"bubbleDark",
			"accentLight",
			"accentDark",
			"borderLight",
			"borderDark"
		]);
		/** Resolved setting before any override: every entry follows the shipped palette. */
		const DEFAULT_PALETTE_SETTINGS = Object.freeze({
			backgroundLight: "",
			backgroundDark: "",
			surfaceLight: "",
			surfaceDark: "",
			menuLight: "",
			menuDark: "",
			sidebarLight: "",
			sidebarDark: "",
			inputLight: "",
			inputDark: "",
			cardLight: "",
			cardDark: "",
			dialogLight: "",
			dialogDark: "",
			navLight: "",
			navDark: "",
			moduleLight: "",
			moduleDark: "",
			bubbleLight: "",
			bubbleDark: "",
			accentLight: "",
			accentDark: "",
			borderLight: "",
			borderDark: ""
		});
		/** Settings field carrying one entry's color in one mode. */
		function paletteField(id, mode) {
			return mode === "light" ? `${id}Light` : `${id}Dark`;
		}
		/**
		* Anchored matcher for one persistable palette color: the empty string (no
		* override) or a solid CSS color — #rgb/#rrggbb hex, or rgb()/hsl() in the
		* comma or space-separated form. Alpha forms are rejected: the swatch cannot
		* produce them, and a translucent surface composites against whatever is
		* behind it, which the palette layer cannot reason about.
		*/
		const PALETTE_COLOR_PATTERN = new RegExp([
			"^(?:|#(?:[0-9a-f]{3}){1,2}",
			"|rgb\\(\\s*-?\\d+(?:\\.\\d+)?%?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%?\\s*\\)",
			"|hsl\\(\\s*-?\\d+(?:\\.\\d+)?(?:deg|grad|rad|turn)?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%\\s*\\)",
			")$"
		].join(""), "i");
		/**
		* Whether a value is a persistable palette color: `''` (no override) or a
		* solid CSS color accepted by the host schema.
		* @param value - value crossing the settings or registry boundary.
		* @returns whether the value can be stored for an entry.
		*/
		function isPaletteColor(value) {
			return typeof value === "string" && PALETTE_COLOR_PATTERN.test(value);
		}
		//#endregion
		//#region src/client/settings.ts
		/** Plugin identity used for the theme override layer. */
		const PALETTE_PLUGIN_ID = "@zar-desktop/ui-palette";
		/** Page background; also the color the background image blends with. */
		const BACKGROUND_ENTRY = Object.freeze({
			id: "background",
			token: "--dsw-alias-bg-base",
			labelKey: "color.background",
			light: "#ffffff",
			dark: "#151517"
		});
		/**
		* Editable palette entries. Unset swatches show the shipped alias values — the
		* opaque equivalents of the translucent menu and border tokens, which the
		* color input cannot express but a reset restores.
		*/
		const PALETTE_ENTRIES = Object.freeze([
			BACKGROUND_ENTRY,
			{
				id: "surface",
				token: "--dsw-alias-bg-layer-1",
				labelKey: "color.surface",
				light: "#ffffff",
				dark: "#232324"
			},
			{
				id: "menu",
				token: "--dsw-specific-menu",
				labelKey: "color.menu",
				light: "#fcfdfe",
				dark: "#303136"
			},
			{
				id: "sidebar",
				token: "--dsw-specific-sidebar-fill",
				labelKey: "color.sidebar",
				light: "#f9fafb",
				dark: "#1b1b1c"
			},
			{
				id: "input",
				token: "--dsw-specific-input-major",
				labelKey: "color.input",
				light: "#ffffff",
				dark: "#2c2c2e"
			},
			{
				id: "card",
				token: "--dsw-alias-card-fill",
				hoverToken: "--dsw-alias-card-fill-hover",
				labelKey: "color.card",
				light: "#fafafa",
				dark: "#212123"
			},
			{
				id: "dialog",
				token: "--dsw-alias-bg-layer-2",
				labelKey: "color.dialog",
				light: "#ffffff",
				dark: "#2c2c2e"
			},
			{
				id: "nav",
				token: "--dsw-specific-sidebar-nav-item-active",
				labelKey: "color.nav",
				light: "#ebeef2",
				dark: "#43454a"
			},
			{
				id: "module",
				token: "--dsw-alias-bg-module-platform",
				labelKey: "color.module",
				light: "#f5f6f7",
				dark: "#353638"
			},
			{
				id: "bubble",
				token: "--dsw-specific-bubble",
				labelKey: "color.bubble",
				light: "#edf3fe",
				dark: "#2c2c2e"
			},
			{
				id: "accent",
				token: "--dsw-alias-brand-primary",
				labelKey: "color.accent",
				light: "#0f1115",
				dark: "#f9fafb"
			},
			{
				id: "border",
				token: "--dsw-alias-border-l2",
				labelKey: "color.border",
				light: "#e6e6e6",
				dark: "#313133"
			}
		]);
		/** Palette entries that yield to a painted background image, which clears these surfaces. */
		const IMAGE_OWNED_ENTRIES = /* @__PURE__ */ new Set(["background", "sidebar"]);
		/** Body attribute the background-image plugin sets while it paints its image. */
		const BACKGROUND_IMAGE_ATTRIBUTE = "data-dsh-background";
		/** Body variable carrying the palette page background for the image layer's own base (light). */
		const PALETTE_BASE_LIGHT_VARIABLE = "--dsh-palette-bg-base-light";
		/** Body variable carrying the palette page background for the image layer's own base (dark). */
		const PALETTE_BASE_DARK_VARIABLE = "--dsh-palette-bg-base-dark";
		/** Shipped color shown for one entry and mode while it is unset. */
		function shippedColor(entry, mode) {
			return mode === "light" ? entry.light : entry.dark;
		}
		/**
		* Build the theme override layer from the accepted setting.
		*
		* A token is included only while at least one mode differs from the shipped
		* value; the mode without one is pinned to that entry's shipped color, because
		* the theme service requires a full `{ light, dark }` pair. Entries the
		* background-image plugin clears while it paints are omitted so the image
		* stays visible.
		* @param settings - accepted values from the `ui-palette` namespace.
		* @param imagePainted - whether the background image owns the cleared surfaces.
		* @returns per-token mode pairs for `ctx.theme.overrideTokens`.
		*/
		function paletteOverrides(settings, imagePainted) {
			const tokens = {};
			for (const entry of PALETTE_ENTRIES) {
				if (imagePainted && IMAGE_OWNED_ENTRIES.has(entry.id)) continue;
				const light = settings[paletteField(entry.id, "light")] || shippedColor(entry, "light");
				const dark = settings[paletteField(entry.id, "dark")] || shippedColor(entry, "dark");
				if (light === entry.light && dark === entry.dark) continue;
				tokens[entry.token] = {
					light,
					dark
				};
				if (entry.hoverToken !== void 0) tokens[entry.hoverToken] = {
					light: hoverShade(light),
					dark: hoverShade(dark)
				};
			}
			return tokens;
		}
		/**
		* Expand a stored color into the six-digit hex a native color input accepts.
		* Hand-edited rgb() values convert; other forms show the shipped color.
		* @param value - persisted color.
		* @param fallback - shipped color for the entry and mode.
		* @returns six-digit lowercase hex.
		*/
		function swatchHex(value, fallback) {
			const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
			if (hex?.[1] !== void 0) {
				const digits = hex[1].toLowerCase();
				return `#${digits.length === 6 ? digits : digits.replace(/([0-9a-f])/g, "$1$1")}`;
			}
			const rgb = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/i.exec(value);
			if (rgb !== null) {
				const channels = [
					rgb[1],
					rgb[2],
					rgb[3]
				].map((part) => Number(part));
				if (channels.every((channel) => channel <= 255)) return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
			}
			return fallback;
		}
		/**
		* Classify one typed color: empty clears the override, a valid solid color is
		* stored trimmed, and anything else is rejected without touching the setting.
		* @param text - field text as typed.
		* @returns the commit outcome for the row.
		*/
		function colorInput(text) {
			const trimmed = text.trim();
			if (trimmed === "") return { kind: "clear" };
			return isPaletteColor(trimmed) ? {
				kind: "set",
				value: trimmed
			} : { kind: "invalid" };
		}
		/**
		* Shift one surface color toward the current text color, the same direction the
		* shipped hover aliases take (darker over a light surface, lighter over a dark
		* one).
		* @param color - picked surface color.
		* @returns a `color-mix()` value for the matching hover token.
		*/
		function hoverShade(color) {
			return `color-mix(in srgb, ${color} 92%, var(--dsw-alias-label-primary))`;
		}
		/**
		* Resolve the palette page background for the image layer's own base.
		* @param settings - accepted values from the `ui-palette` namespace.
		* @returns one color per mode, or undefined while the entry is unset.
		*/
		function paletteBase(settings) {
			const light = settings.backgroundLight;
			const dark = settings.backgroundDark;
			if (light === "" && dark === "") return void 0;
			return {
				light: light || BACKGROUND_ENTRY.light,
				dark: dark || BACKGROUND_ENTRY.dark
			};
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-palette/src/client/PaletteRow.module.css.mjs
		const css = ".Pl6a2a_row{border-bottom:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:12px;padding:16px 0;display:flex}.Pl6a2a_rowText{flex-direction:column;gap:4px;display:flex}.Pl6a2a_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.Pl6a2a_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.Pl6a2a_modes{flex-direction:column;gap:14px;display:flex}.Pl6a2a_modeGroup{flex-direction:column;gap:8px;display:flex}.Pl6a2a_modeLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.Pl6a2a_grid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px 16px;display:grid}.Pl6a2a_item{flex-direction:column;gap:4px;min-width:0;display:flex}.Pl6a2a_controls{align-items:center;gap:8px;min-width:0;display:flex}.Pl6a2a_itemLabel{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.Pl6a2a_swatch{border:.5px solid var(--dsw-alias-border-l2);cursor:pointer;background:0 0;border-radius:6px;flex:none;width:24px;height:24px;padding:0}.Pl6a2a_swatch::-webkit-color-swatch-wrapper{padding:0}.Pl6a2a_swatch::-webkit-color-swatch{border:none;border-radius:5px}.Pl6a2a_code{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);width:86px;height:24px;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,ui-monospace, monospace);background:0 0;border-radius:6px;flex:none;padding:0 6px;font-size:12px;line-height:18px}.Pl6a2a_code::placeholder{color:var(--dsw-alias-label-tertiary)}.Pl6a2a_code:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}.Pl6a2a_code[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary)}.Pl6a2a_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:16px}.Pl6a2a_reset{font:inherit;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;flex:none;padding:0;font-size:12px;line-height:18px}@media (hover:hover){.Pl6a2a_reset:hover{color:var(--dsw-alias-label-primary)}}.Pl6a2a_reset:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}@media (pointer:coarse){.Pl6a2a_swatch{width:28px;height:28px}}";
		const tagId = "@zar-desktop/ui-palette/PaletteRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zar-desktop/ui-palette";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PaletteRow_module_css_default = {
			"code": "Pl6a2a_code",
			"controls": "Pl6a2a_controls",
			"desc": "Pl6a2a_desc",
			"error": "Pl6a2a_error",
			"grid": "Pl6a2a_grid",
			"item": "Pl6a2a_item",
			"itemLabel": "Pl6a2a_itemLabel",
			"modeGroup": "Pl6a2a_modeGroup",
			"modeLabel": "Pl6a2a_modeLabel",
			"modes": "Pl6a2a_modes",
			"reset": "Pl6a2a_reset",
			"row": "Pl6a2a_row",
			"rowText": "Pl6a2a_rowText",
			"swatch": "Pl6a2a_swatch",
			"title": "Pl6a2a_title"
		};
		//#endregion
		//#region src/client/PaletteRow.tsx
		/**
		* Palette preference row registered into the General section item slot: title
		* and description, then one group per palette mode with a swatch and a color
		* code per entry. The swatch opens the native picker; the code field accepts a
		* typed or pasted color and commits on Enter or blur. An empty code follows the
		* shipped palette, and a reset clears an overridden entry.
		*/
		/** Mode groups in render order. */
		const MODES = [{
			mode: "light",
			labelKey: "mode.light"
		}, {
			mode: "dark",
			labelKey: "mode.dark"
		}];
		/**
		* Render the palette row.
		* @param props - composed slot props.
		* @returns the row element tree.
		*/
		function PaletteRow({ t, setColor, useStore }) {
			const state = useStore((s) => s);
			const [drafts, setDrafts] = (0, react.useState)({});
			const [invalid, setInvalid] = (0, react.useState)({});
			const forget = (field) => {
				setDrafts((current) => {
					const next = { ...current };
					delete next[field];
					return next;
				});
				setInvalid((current) => {
					const next = { ...current };
					delete next[field];
					return next;
				});
			};
			const write = (field, value) => {
				forget(field);
				if (value !== state[field]) setColor(field, value);
			};
			const commit = (field, text) => {
				const result = colorInput(text);
				if (result.kind === "invalid") {
					setInvalid((current) => ({
						...current,
						[field]: true
					}));
					return;
				}
				write(field, result.kind === "clear" ? "" : result.value);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PaletteRow_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PaletteRow_module_css_default.rowText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PaletteRow_module_css_default.title,
						children: t("title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PaletteRow_module_css_default.desc,
						children: t("description")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PaletteRow_module_css_default.modes,
					children: MODES.map(({ mode, labelKey }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PaletteRow_module_css_default.modeGroup,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: PaletteRow_module_css_default.modeLabel,
							children: t(labelKey)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: PaletteRow_module_css_default.grid,
							children: PALETTE_ENTRIES.map((entry) => {
								const field = paletteField(entry.id, mode);
								const stored = state[field];
								const shown = drafts[field] ?? stored;
								const shipped = shippedColor(entry, mode);
								const label = `${t(entry.labelKey)} ${t(labelKey)}`;
								const rejected = invalid[field] === true;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PaletteRow_module_css_default.item,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PaletteRow_module_css_default.controls,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PaletteRow_module_css_default.itemLabel,
												children: t(entry.labelKey)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "color",
												className: PaletteRow_module_css_default.swatch,
												value: swatchHex(shown === "" ? shipped : shown, shipped),
												"aria-label": label,
												onChange: (event) => {
													write(field, event.target.value);
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: PaletteRow_module_css_default.code,
												value: shown,
												placeholder: shipped,
												"aria-label": `${label} ${t("code")}`,
												"aria-invalid": rejected,
												spellCheck: false,
												autoComplete: "off",
												inputMode: "text",
												maxLength: 24,
												onChange: (event) => {
													const text = event.currentTarget.value;
													setDrafts((current) => ({
														...current,
														[field]: text
													}));
													setInvalid((current) => {
														if (current[field] !== true) return current;
														const next = { ...current };
														delete next[field];
														return next;
													});
												},
												onBlur: (event) => {
													commit(field, event.currentTarget.value);
												},
												onKeyDown: (event) => {
													if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
													if (event.key === "Enter") {
														event.preventDefault();
														commit(field, event.currentTarget.value);
													}
													if (event.key === "Escape") {
														setDrafts((current) => ({
															...current,
															[field]: stored
														}));
														setInvalid((current) => {
															if (current[field] !== true) return current;
															const next = { ...current };
															delete next[field];
															return next;
														});
													}
												}
											}),
											stored === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: PaletteRow_module_css_default.reset,
												"aria-label": `${t("reset")} ${label}`,
												onClick: () => {
													write(field, "");
												},
												children: t("reset")
											})
										]
									}), rejected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: PaletteRow_module_css_default.error,
										role: "alert",
										children: t("invalid")
									})]
								}, entry.id);
							})
						})]
					}, mode))
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Palette-row dictionaries for the General settings section. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.palette";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "调色板",
			"description": "自定义浅色与深色模式的表面颜色。可直接输入颜色代码；留空或清除则沿用默认配色。",
			"mode.light": "浅色模式",
			"mode.dark": "深色模式",
			"reset": "重置",
			"code": "颜色代码",
			"invalid": "请输入 #rgb、#rrggbb、rgb() 或 hsl()",
			"color.background": "页面背景",
			"color.surface": "浮起表面",
			"color.menu": "菜单表面",
			"color.sidebar": "侧边栏",
			"color.input": "聊天输入框",
			"color.card": "卡片表面",
			"color.dialog": "对话框",
			"color.nav": "导航选中项",
			"color.module": "控件表面",
			"color.bubble": "用户消息",
			"color.accent": "强调色",
			"color.border": "边框"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"title": "Palette",
			"description": "Custom surface colors for light and dark mode. Type a code or pick a color; an empty code follows the shipped palette.",
			"mode.light": "Light mode",
			"mode.dark": "Dark mode",
			"reset": "Reset",
			"code": "Color code",
			"invalid": "Enter #rgb, #rrggbb, rgb() or hsl()",
			"color.background": "Page background",
			"color.surface": "Raised surface",
			"color.menu": "Menu surface",
			"color.sidebar": "Sidebar",
			"color.input": "Chat input",
			"color.card": "Card surface",
			"color.dialog": "Dialog surface",
			"color.nav": "Nav selection",
			"color.module": "Control surface",
			"color.bubble": "User message",
			"color.accent": "Accent",
			"color.border": "Border"
		};
		//#endregion
		//#region src/client/presenter.ts
		/**
		* Applies the accepted palette through the theme service's override layer.
		* The background-image plugin clears the page background and the sidebar fill
		* while it paints, so those two entries yield to it, and the image layer takes
		* its base color from the palette variables this presenter writes.
		*/
		var PalettePresenter = class {
			ctx;
			release;
			current;
			observer;
			/** @param ctx - owning client context; the override layer is released with the presenter. */
			constructor(ctx) {
				this.ctx = ctx;
			}
			/**
			* Project one accepted setting onto the document. An empty setting releases
			* the override layer and the image base variables.
			* @param settings - accepted values from the `ui-palette` namespace.
			*/
			apply(settings) {
				this.current = settings;
				if (typeof document === "undefined" || document.body === null) return;
				this.observe();
				const body = document.body;
				const base = paletteBase(settings);
				if (base === void 0) {
					body.style.removeProperty(PALETTE_BASE_LIGHT_VARIABLE);
					body.style.removeProperty(PALETTE_BASE_DARK_VARIABLE);
				} else {
					body.style.setProperty(PALETTE_BASE_LIGHT_VARIABLE, base.light);
					body.style.setProperty(PALETTE_BASE_DARK_VARIABLE, base.dark);
				}
				const overrides = paletteOverrides(settings, body.hasAttribute(BACKGROUND_IMAGE_ATTRIBUTE));
				if (Object.keys(overrides).length === 0) {
					this.release?.();
					this.release = void 0;
					return;
				}
				this.release = this.ctx.theme.overrideTokens(PALETTE_PLUGIN_ID, overrides);
			}
			/** Retract the override layer, the base variables, and the attribute observer. */
			dispose() {
				this.observer?.disconnect();
				this.observer = void 0;
				this.release?.();
				this.release = void 0;
				if (typeof document !== "undefined" && document.body !== null) {
					document.body.style.removeProperty(PALETTE_BASE_LIGHT_VARIABLE);
					document.body.style.removeProperty(PALETTE_BASE_DARK_VARIABLE);
				}
				this.current = void 0;
			}
			/** Re-apply when the background image takes or releases the cleared surfaces. */
			observe() {
				if (this.observer !== void 0 || typeof MutationObserver === "undefined") return;
				this.observer = new MutationObserver(() => {
					if (this.current !== void 0) this.apply(this.current);
				});
				this.observer.observe(document.body, {
					attributes: true,
					attributeFilter: [BACKGROUND_IMAGE_ATTRIBUTE]
				});
			}
		};
		//#endregion
		//#region src/client/store.ts
		/** Row store mirroring the accepted palette setting. */
		/**
		* Declares the palette row state and sync surface.
		* @returns the store handle.
		*/
		function createPaletteRowStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					...DEFAULT_PALETTE_SETTINGS,
					revision: -1
				}),
				actions: { sync: (d, settings, revision) => {
					if (revision <= d.revision) return;
					for (const field of PALETTE_FIELDS) d[field] = settings[field];
					d.revision = revision;
				} }
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: slots and locale for the row, configForms for the settings, theme for the override layer. */
		const inject = [
			"slots",
			"locale",
			"configForms",
			"theme"
		];
		/**
		* Client plugin body: adopt the durable setting, apply the override layer, and
		* register the General row that writes the fields.
		* @param ctx - client plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-palette: dictionaries");
			const form = ctx.configForms.get(PALETTE_SETTINGS_NAMESPACE);
			const presenter = new PalettePresenter(ctx);
			ctx.effect(() => () => {
				presenter.dispose();
			}, "ui-palette: palette presenter");
			const store = createPaletteRowStore();
			let bound;
			const adopt = () => {
				const snapshot = form.getSnapshot();
				const settings = snapshot.value;
				if (settings === void 0) return;
				presenter.apply(settings);
				bound?.sync(settings, snapshot.revision ?? 0);
			};
			ctx.effect(() => form.subscribe(adopt), "ui-palette: settings adoption");
			adopt();
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "palette",
				order: 11.7,
				store,
				locale: NS,
				inject: (actions) => {
					bound = actions;
					adopt();
					return { setColor: (field, value) => {
						form.set(field, value);
					} };
				}
			}, PaletteRow));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map