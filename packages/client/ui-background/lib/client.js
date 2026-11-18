window.__ModuleLoader__.load({
	id: "@zar-desktop/ui-background",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-inline-css:/home/zhoupeng/.dsh/packages/client/ui-background/src/client/background.css.mjs
		var background_css_default = "html:not([data-platform=darwin]) body[data-dsh-background]:before{content:\"\";z-index:-2;background-color:var(--dsh-palette-bg-base-light,var(--dsw-static-neutral-bluish-00));pointer-events:none;position:fixed;inset:0}html:not([data-platform=darwin]) body[data-dsh-background][data-ds-dark-theme]:before{background-color:var(--dsh-palette-bg-base-dark,var(--dsw-static-neutral-bluish-950))}body[data-dsh-background]:after{content:\"\";z-index:-1;background-image:var(--dsh-background-image);opacity:var(--dsh-background-opacity-light,.5);pointer-events:none;background-position:50%;background-repeat:no-repeat;background-size:cover;position:fixed;inset:0}body[data-dsh-background][data-ds-dark-theme]:after{opacity:var(--dsh-background-opacity-dark,.5)}";
		//#endregion
		//#region src/client/settings.ts
		/** Durable background preferences and image-source classification. */
		/** Loader-entry id that owns the settings namespace; must match the bundle row id. */
		const BACKGROUND_SETTINGS_NAMESPACE = "ui-background";
		/** Settings field carrying the master switch. */
		const BACKGROUND_ENABLED_FIELD = "enabled";
		/** Settings field carrying the image source. */
		const BACKGROUND_IMAGE_FIELD = "image";
		/** Settings field carrying the light-palette opacity. */
		const BACKGROUND_OPACITY_LIGHT_FIELD = "opacityLight";
		/** Settings field carrying the dark-palette opacity. */
		const BACKGROUND_OPACITY_DARK_FIELD = "opacityDark";
		/** Body attribute that paints the background layers. */
		const BACKGROUND_ATTRIBUTE = "data-dsh-background";
		/** Body variable carrying the resolved CSS `url(...)` value. */
		const BACKGROUND_IMAGE_VARIABLE = "--dsh-background-image";
		/** Body variable carrying the light-palette layer opacity. */
		const BACKGROUND_OPACITY_LIGHT_VARIABLE = "--dsh-background-opacity-light";
		/** Body variable carrying the dark-palette layer opacity. */
		const BACKGROUND_OPACITY_DARK_VARIABLE = "--dsh-background-opacity-dark";
		/** Plugin identity used for the injected style tag and the theme override layer. */
		const BACKGROUND_PLUGIN_ID = "@zar-desktop/ui-background";
		/** Values the namespace resolves to when the user has not overridden anything. */
		const DEFAULT_BACKGROUND_SETTINGS = Object.freeze({
			enabled: false,
			image: "",
			opacity: .5
		});
		/** Settings field carrying one palette's layer opacity. */
		function opacityField(mode) {
			return mode === "light" ? BACKGROUND_OPACITY_LIGHT_FIELD : BACKGROUND_OPACITY_DARK_FIELD;
		}
		/** Body variable carrying one palette's layer opacity. */
		function opacityVariable(mode) {
			return mode === "light" ? BACKGROUND_OPACITY_LIGHT_VARIABLE : BACKGROUND_OPACITY_DARK_VARIABLE;
		}
		const DATA_IMAGE = /^data:image\/[a-z0-9.+-]+[;,]/i;
		const WINDOWS_ABSOLUTE = /^[A-Za-z]:[/\\]/;
		const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
		/** Whether a value is an http(s) URL with a host. */
		function isHttpUrl(value) {
			try {
				const url = new URL(value);
				return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
			} catch {
				return false;
			}
		}
		/** Whether a value is an absolute local path the browser file route can serve. */
		function isLocalPath(value) {
			return (value.startsWith("/") || WINDOWS_ABSOLUTE.test(value)) && !value.startsWith("//") && !value.startsWith("\\\\") && !CONTROL_CHARACTER.test(value);
		}
		/**
		* Whether a value names a paint-able background image. The empty string means
		* no image and stays a valid write for a cleared field.
		* @param value - image source from the settings field.
		* @returns true for '', an http(s) URL, a data image URI, or an absolute local path.
		*/
		function isBackgroundImage(value) {
			const candidate = value.trim();
			if (candidate === "") return true;
			return isHttpUrl(candidate) || DATA_IMAGE.test(candidate) || isLocalPath(candidate);
		}
		/**
		* Resolve one stored image source into a CSS `url()` argument.
		* @param value - image source from the settings field.
		* @param base - document base URI, `http(s)://…` or `dsh-app://app/`.
		* @returns the URL to paint, or undefined for an empty or unsupported source.
		*/
		function backgroundImageUrl(value, base) {
			const candidate = value.trim();
			if (candidate === "") return void 0;
			if (isHttpUrl(candidate) || DATA_IMAGE.test(candidate)) return candidate;
			if (!isLocalPath(candidate)) return void 0;
			if (!/^https?:/i.test(base) && !base.startsWith("dsh-app://app/")) return void 0;
			return new URL(`api/file?path=${encodeURIComponent(candidate)}`, base).href;
		}
		/**
		* Clamp a stored opacity into the supported range.
		* @param value - opacity from the settings field.
		* @returns a finite number from 0 through 1.
		*/
		function clampOpacity(value) {
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_BACKGROUND_SETTINGS.opacity;
		}
		/**
		* Resolve the layer opacity for one palette: its own value, else the shared one.
		* @param settings - accepted values from the `ui-background` namespace.
		* @param mode - palette the document is using.
		* @returns a finite opacity from 0 through 1.
		*/
		function paletteOpacity(settings, mode) {
			return clampOpacity((mode === "light" ? settings.opacityLight : settings.opacityDark) ?? settings.opacity);
		}
		/**
		* Render an opacity as a whole percentage.
		* @param value - opacity from 0 through 1.
		* @returns the rounded percentage from 0 through 100.
		*/
		function opacityPercent(value) {
			return Math.round(clampOpacity(value) * 100);
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-background/src/client/BackgroundRow.module.css.mjs
		const css = "._1jpLGq_row{border-bottom:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding:16px 0;display:flex}._1jpLGq_head{align-items:flex-start;gap:8px;display:flex}._1jpLGq_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:16px;display:flex}._1jpLGq_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}._1jpLGq_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}._1jpLGq_master{margin-top:1px}._1jpLGq_fields{flex-direction:column;gap:10px;display:flex}._1jpLGq_imageField{width:100%}._1jpLGq_opacityFields{flex-direction:column;gap:6px;display:flex}._1jpLGq_opacityRow{align-items:center;gap:8px;display:flex}._1jpLGq_opacityLabel{min-width:72px;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-size:12px;line-height:18px}._1jpLGq_slider{min-width:0;height:18px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;flex:1;margin:0}._1jpLGq_percent{text-align:right;font-variant-numeric:tabular-nums;min-width:34px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}._1jpLGq_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}@media (width<=767px){._1jpLGq_rowText{padding-right:0}}@media (pointer:coarse){._1jpLGq_imageField input{font-size:16px}}";
		const tagId = "@zar-desktop/ui-background/BackgroundRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zar-desktop/ui-background";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var BackgroundRow_module_css_default = {
			"desc": "_1jpLGq_desc",
			"error": "_1jpLGq_error",
			"fields": "_1jpLGq_fields",
			"head": "_1jpLGq_head",
			"imageField": "_1jpLGq_imageField",
			"master": "_1jpLGq_master",
			"opacityFields": "_1jpLGq_opacityFields",
			"opacityLabel": "_1jpLGq_opacityLabel",
			"opacityRow": "_1jpLGq_opacityRow",
			"percent": "_1jpLGq_percent",
			"row": "_1jpLGq_row",
			"rowText": "_1jpLGq_rowText",
			"slider": "_1jpLGq_slider",
			"title": "_1jpLGq_title"
		};
		//#endregion
		//#region src/client/BackgroundRow.tsx
		/**
		* Background preference row registered into the General section item slot:
		* title and description with the master switch, then the image field and one
		* opacity slider per palette mode. The displayed values follow the persisted
		* setting, never the click echo; the image field commits on blur or Enter and
		* rejects an unsupported source with an inline message.
		*/
		/**
		* Render the background row.
		* @param props - composed slot props.
		* @returns the row element tree.
		*/
		function BackgroundRow({ t, setEnabled, setImage, setOpacity, useStore }) {
			const enabled = useStore((s) => s.enabled);
			const image = useStore((s) => s.image);
			const opacityLight = useStore((s) => s.opacityLight);
			const opacityDark = useStore((s) => s.opacityDark);
			const [draft, setDraft] = (0, react.useState)(void 0);
			const [invalid, setInvalid] = (0, react.useState)(false);
			const [opacityDrafts, setOpacityDrafts] = (0, react.useState)({});
			const errorId = (0, react.useId)();
			const lightId = (0, react.useId)();
			const darkId = (0, react.useId)();
			(0, react.useEffect)(() => {
				setDraft(void 0);
				setInvalid(false);
			}, [image]);
			(0, react.useEffect)(() => {
				setOpacityDrafts({});
			}, [opacityLight, opacityDark]);
			const shownImage = draft ?? image;
			const shownInvalid = invalid || draft === void 0 && !isBackgroundImage(image);
			const commitImage = (value) => {
				const next = value.trim();
				setDraft(next);
				if (!isBackgroundImage(next)) {
					setInvalid(true);
					return;
				}
				setInvalid(false);
				if (next === image) {
					setDraft(void 0);
					return;
				}
				setImage(next);
			};
			const commitOpacity = (slider) => {
				const next = opacityDrafts[slider.mode];
				if (next === void 0) return;
				if (next !== slider.stored) setOpacity(slider.mode, next);
				setOpacityDrafts((current) => ({
					...current,
					[slider.mode]: void 0
				}));
			};
			const sliders = [{
				mode: "light",
				labelKey: "opacity.light",
				id: lightId,
				stored: opacityLight
			}, {
				mode: "dark",
				labelKey: "opacity.dark",
				id: darkId,
				stored: opacityDark
			}];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: BackgroundRow_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: BackgroundRow_module_css_default.head,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: BackgroundRow_module_css_default.rowText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BackgroundRow_module_css_default.title,
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BackgroundRow_module_css_default.desc,
							children: t("description")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
						className: BackgroundRow_module_css_default.master,
						checked: enabled,
						onChange: setEnabled,
						label: t("enabled")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: BackgroundRow_module_css_default.fields,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: BackgroundRow_module_css_default.imageField,
							value: shownImage,
							placeholder: t("imagePlaceholder"),
							"aria-label": t("image"),
							"aria-invalid": shownInvalid,
							"aria-describedby": shownInvalid ? errorId : void 0,
							spellCheck: false,
							autoComplete: "off",
							onChange: (event) => {
								setDraft(event.currentTarget.value);
								setInvalid(false);
							},
							onBlur: (event) => {
								commitImage(event.currentTarget.value);
							},
							onKeyDown: (event) => {
								if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
								if (event.key === "Enter") event.currentTarget.blur();
							}
						}),
						shownInvalid && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							id: errorId,
							className: BackgroundRow_module_css_default.error,
							role: "alert",
							children: t("invalid")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BackgroundRow_module_css_default.opacityFields,
							children: sliders.map((slider) => {
								const percent = opacityPercent(opacityDrafts[slider.mode] ?? slider.stored);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: BackgroundRow_module_css_default.opacityRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: BackgroundRow_module_css_default.opacityLabel,
											htmlFor: slider.id,
											children: t(slider.labelKey)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: slider.id,
											className: BackgroundRow_module_css_default.slider,
											type: "range",
											min: 0,
											max: 100,
											step: 1,
											value: percent,
											"aria-valuetext": `${percent}%`,
											onChange: (event) => {
												setOpacityDrafts((current) => ({
													...current,
													[slider.mode]: Math.round(Number(event.currentTarget.value)) / 100
												}));
											},
											onPointerUp: () => {
												commitOpacity(slider);
											},
											onKeyUp: () => {
												commitOpacity(slider);
											},
											onBlur: () => {
												commitOpacity(slider);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: BackgroundRow_module_css_default.percent,
											"aria-hidden": "true",
											children: [percent, "%"]
										})
									]
								}, slider.mode);
							})
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Background-row dictionaries for the General settings section. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.background";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "背景图片",
			"description": "在界面背后显示一张图片。填写 https 链接、data 图片 URI 或本地绝对路径。",
			"enabled": "启用背景图片",
			"image": "图片",
			"imagePlaceholder": "https://… 或 /图片/路径.jpg",
			"opacity.light": "浅色不透明度",
			"opacity.dark": "深色不透明度",
			"invalid": "请填写 https 链接、data 图片 URI 或本地绝对路径。"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"title": "Background image",
			"description": "Show a picture behind the interface. Enter an https URL, a data image URI, or an absolute file path.",
			"enabled": "Enable background image",
			"image": "Image",
			"imagePlaceholder": "https://… or /path/to/image.jpg",
			"opacity.light": "Light opacity",
			"opacity.dark": "Dark opacity",
			"invalid": "Enter an https URL, a data image URI, or an absolute file path."
		};
		//#endregion
		//#region src/client/presenter.ts
		/** Surfaces cleared while the image is painted; menus and raised panels keep their own fills. */
		const TRANSPARENT_SURFACES = {
			"--dsw-alias-bg-base": {
				light: "transparent",
				dark: "transparent"
			},
			"--dsw-specific-sidebar-fill": {
				light: "transparent",
				dark: "transparent"
			}
		};
		/** Writes the image layer, both palette opacities, and the theme override that lets them show. */
		var BackgroundPresenter = class {
			ctx;
			override;
			painted = false;
			/** @param ctx - owning client context; the theme override is released with the presenter. */
			constructor(ctx) {
				this.ctx = ctx;
			}
			/**
			* Project one accepted setting onto the document. A disabled setting, an
			* empty image, or an unsupported source retracts the layer and its override.
			* @param settings - accepted values from the `ui-background` namespace.
			*/
			apply(settings) {
				if (typeof document === "undefined" || document.body === null) return;
				const url = settings.enabled ? backgroundImageUrl(settings.image, document.baseURI) : void 0;
				if (url === void 0) {
					this.retract();
					return;
				}
				const body = document.body;
				body.setAttribute(BACKGROUND_ATTRIBUTE, "");
				body.style.setProperty(BACKGROUND_IMAGE_VARIABLE, `url(${JSON.stringify(url)})`);
				for (const mode of ["light", "dark"]) body.style.setProperty(opacityVariable(mode), String(paletteOpacity(settings, mode)));
				if (!this.painted) {
					this.override = this.ctx.theme.overrideTokens(BACKGROUND_PLUGIN_ID, TRANSPARENT_SURFACES);
					this.painted = true;
				}
			}
			/** Retract the layer, its variables, and the theme override. */
			dispose() {
				this.retract();
			}
			retract() {
				if (!this.painted) return;
				this.painted = false;
				if (typeof document !== "undefined" && document.body !== null) {
					document.body.removeAttribute(BACKGROUND_ATTRIBUTE);
					document.body.style.removeProperty(BACKGROUND_IMAGE_VARIABLE);
					for (const mode of ["light", "dark"]) document.body.style.removeProperty(opacityVariable(mode));
				}
				this.override?.();
				this.override = void 0;
			}
		};
		//#endregion
		//#region src/client/store.ts
		/** Row store mirroring the accepted background setting. */
		/**
		* Declares the background row state and sync surface.
		* @returns the store handle.
		*/
		function createBackgroundRowStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					enabled: DEFAULT_BACKGROUND_SETTINGS.enabled,
					image: DEFAULT_BACKGROUND_SETTINGS.image,
					opacityLight: paletteOpacity(DEFAULT_BACKGROUND_SETTINGS, "light"),
					opacityDark: paletteOpacity(DEFAULT_BACKGROUND_SETTINGS, "dark"),
					revision: -1
				}),
				actions: { sync: (d, settings, revision) => {
					if (revision <= d.revision) return;
					d.enabled = settings.enabled;
					d.image = settings.image;
					d.opacityLight = paletteOpacity(settings, "light");
					d.opacityDark = paletteOpacity(settings, "dark");
					d.revision = revision;
				} }
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: slots and locale for the row, configForms for the settings, theme for the surface override. */
		const inject = [
			"slots",
			"locale",
			"configForms",
			"theme"
		];
		/** Mount the row's global sheet; it owns only the `body` layers. */
		function installStyles(ctx) {
			if (typeof document === "undefined") return;
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = BACKGROUND_PLUGIN_ID;
				tag.dataset.pluginCss = `${BACKGROUND_PLUGIN_ID}/background.css`;
				tag.textContent = background_css_default;
				document.head.append(tag);
				return () => {
					tag.remove();
				};
			}, "ui-background: layer stylesheet");
		}
		/**
		* Client plugin body: adopt the durable setting, paint the layers, and
		* register the General row that writes the fields.
		* @param ctx - client plugin context.
		*/
		function apply(ctx) {
			installStyles(ctx);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-background: dictionaries");
			const form = ctx.configForms.get(BACKGROUND_SETTINGS_NAMESPACE);
			const presenter = new BackgroundPresenter(ctx);
			ctx.effect(() => () => {
				presenter.dispose();
			}, "ui-background: background presenter");
			const store = createBackgroundRowStore();
			let bound;
			const adopt = () => {
				const snapshot = form.getSnapshot();
				const settings = snapshot.value;
				if (settings === void 0) return;
				presenter.apply(settings);
				bound?.sync(settings, snapshot.revision ?? 0);
			};
			ctx.effect(() => form.subscribe(adopt), "ui-background: settings adoption");
			adopt();
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "background",
				order: 12,
				store,
				locale: NS,
				inject: (actions) => {
					bound = actions;
					adopt();
					return {
						setEnabled: (enabled) => {
							form.set(BACKGROUND_ENABLED_FIELD, enabled);
						},
						setImage: (image) => {
							form.set(BACKGROUND_IMAGE_FIELD, image);
						},
						setOpacity: (mode, opacity) => {
							form.set(opacityField(mode), clampOpacity(opacity));
						}
					};
				}
			}, BackgroundRow));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map