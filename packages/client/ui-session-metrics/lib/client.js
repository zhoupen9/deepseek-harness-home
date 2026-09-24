window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-session-metrics",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/session-metrics.ts
		/**
		* Sum the three disjoint prompt-side billing buckets.
		* @param usage - the session's token-usage projection value.
		* @returns billed input tokens.
		*/
		function billedInputTokens(usage) {
			return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
		}
		/**
		* Session-wide token total the shipped session-statistics dialog headlines:
		* every prompt-side billing bucket plus output.
		* @param usage - the session's token-usage projection value.
		* @returns billed input plus output tokens.
		*/
		function sessionTotalTokens(usage) {
			return billedInputTokens(usage) + usage.outputTokens;
		}
		/** Whole-number rounding units, positive ties rounded up (ui-chat mirror). */
		function roundedPercentUnits(cacheReadTokens, denominator, decimalPlaces) {
			const scale = (decimalPlaces === 0 ? 1 : 10) * 100;
			const doubledScale = scale * 2;
			const denominatorQuotient = Math.floor(denominator / doubledScale);
			const denominatorRemainder = denominator % doubledScale;
			let lower = 0;
			let upper = scale;
			while (lower < upper) {
				const candidate = Math.floor((lower + upper + 1) / 2);
				const factor = candidate * 2 - 1;
				if (cacheReadTokens >= factor * denominatorQuotient + Math.ceil(factor * denominatorRemainder / doubledScale)) lower = candidate;
				else upper = candidate - 1;
			}
			return lower;
		}
		/** Render percentage units at the requested decimal precision. */
		function displayPercentUnits(units, decimalPlaces) {
			if (decimalPlaces === 0) return String(units);
			const whole = Math.floor(units / 10);
			const tenths = units % 10;
			return tenths === 0 ? String(whole) : String(whole) + "." + String(tenths);
		}
		/**
		* Display-ready cache-hit share of prompt-side input over the whole durable log.
		* @param cacheReadTokens - exact prompt tokens served from cache.
		* @param promptTokens - exact aggregate prompt tokens.
		* @returns integer text when integer rounding stays below 100, otherwise the
		* minimum decimal precision that still rounds below 100; a full hit returns
		* 100, and no billed input returns null.
		*/
		function formatCacheHitPercent(cacheReadTokens, promptTokens) {
			if (promptTokens === 0) return null;
			const missedInputTokens = promptTokens - cacheReadTokens;
			if (missedInputTokens === 0) return "100";
			const roundedUnits = roundedPercentUnits(cacheReadTokens, promptTokens, 0);
			if (roundedUnits < 100) return displayPercentUnits(roundedUnits, 0);
			let distinguishingPlaces = 1;
			let scaledDoubleGap = missedInputTokens * 200;
			const denominatorTens = Math.floor(promptTokens / 10);
			while (scaledDoubleGap <= denominatorTens) {
				scaledDoubleGap *= 10;
				distinguishingPlaces += 1;
			}
			const denominatorOnes = promptTokens % 10;
			let roundedLoss = 5;
			for (let loss = 1; loss < 5; loss += 1) {
				const factor = loss * 2 + 1;
				const threshold = factor * denominatorTens + Math.floor(factor * denominatorOnes / 10);
				if (scaledDoubleGap <= threshold) {
					roundedLoss = loss;
					break;
				}
			}
			return "99." + ("9".repeat(distinguishingPlaces - 1) + String(10 - roundedLoss));
		}
		/**
		* Display-ready cache-hit share for a token-usage projection.
		* @param usage - the session's token-usage projection value.
		* @returns the percentage text, or null when there is no billed input.
		*/
		function cacheHitPercentText(usage) {
			return formatCacheHitPercent(usage.cacheReadTokens, billedInputTokens(usage));
		}
		/**
		* Compact token count: 517 / 12.2K / 517K / 1.2M (ui-chat display rule).
		* @param value - non-negative token count.
		* @param t - namespace-bound translator.
		* @returns locale-owned compact display string.
		*/
		function formatCompactTokens(value, t) {
			const scaled = (candidate) => candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10);
			if (value < 1e3) return String(value);
			if (value < 1e6) return t("number.thousand", { value: scaled(value / 1e3) });
			return t("number.million", { value: scaled(value / 1e6) });
		}
		/**
		* Compact duration: 45.2s under a minute, 2m42s from there on (ui-chat rule).
		* @param ms - duration in milliseconds.
		* @param t - namespace-bound translator.
		* @returns display string.
		*/
		function formatDuration(ms, t) {
			const s = ms / 1e3;
			if (s < 60) return t("duration.compactSeconds", { seconds: Math.round(s * 10) / 10 });
			const whole = Math.round(s);
			return t("duration.compactMinutes", {
				minutes: Math.floor(whole / 60),
				seconds: whole % 60
			});
		}
		/**
		* Decode-throughput digits: integers from 10 tok/s up, one decimal below.
		* @param tps - tokens per second.
		* @returns display string without the unit.
		*/
		function formatThroughput(tps) {
			const clamped = Math.max(0, tps);
			return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
		}
		/**
		* Derive the compact token facts from a token-usage projection value.
		* @param usage - the session's token-usage projection value.
		* @returns the derived facts.
		*/
		function tokenFacts(usage) {
			return {
				billedInputTokens: billedInputTokens(usage),
				outputTokens: usage.outputTokens,
				cacheHitPercent: cacheHitPercentText(usage)
			};
		}
		/**
		* Whether the session has any billable usage yet (the pill visibility rule).
		* @param facts - derived token facts.
		* @returns true when any billed input or output exists.
		*/
		function hasUsage(facts) {
			return facts.billedInputTokens > 0 || facts.outputTokens > 0;
		}
		/**
		* Resolve display occupancy from the independently updated pressure fields,
		* mirroring ui-conversation's own fold so the capsule and the shipped meter it
		* replaces never disagree about the percentage. A missing sample, a missing
		* capacity, or a non-positive capacity yields null — the shipped fold divides
		* by that capacity and would report a full 100% (or a negative share) into a
		* surface this plugin now owns.
		* @param pressure - latest token-meter context-pressure projection.
		* @returns occupancy, or null until numerator and capacity are usable.
		*/
		function contextOccupancy(pressure) {
			const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens;
			const contextWindow = pressure?.contextWindow;
			if (usedTokens === void 0 || contextWindow === void 0 || contextWindow <= 0) return null;
			return {
				percent: Math.min(100, Math.round(usedTokens / contextWindow * 100)),
				usedTokens,
				contextWindow
			};
		}
		/** Radius of the context ring in user units — the shipped meter's own geometry. */
		const CONTEXT_RING_RADIUS = 5.5;
		/** Full circumference of the context ring in user units. */
		const CONTEXT_RING_CIRCUMFERENCE = 2 * Math.PI * CONTEXT_RING_RADIUS;
		/**
		* Stroke dash pattern drawing one occupancy reading onto the context ring.
		* The shipped meter and this capsule share the geometry, so both rings show
		* the same arc for the same percentage.
		* @param percent - occupancy percentage, 0-100.
		* @returns the `stroke-dasharray` value: the filled arc, then the whole ring.
		*/
		function contextRingDash(percent) {
			return String(CONTEXT_RING_CIRCUMFERENCE * Math.min(100, Math.max(0, percent)) / 100) + " " + String(CONTEXT_RING_CIRCUMFERENCE);
		}
		/** Detail level a session presents without an explicit Chat preference. */
		const DEFAULT_PERFORMANCE_USAGE = "detailed";
		/**
		* Derive the compact readings the shipped composer strip presents for its
		* compact detail level — decode throughput and the cache-hit share — under the
		* shipped conditions: throughput needs a decode-timed step, and the share needs
		* billed input.
		* @param usage - the session's token-usage projection value, when served.
		* @param stats - the session's whole-log statistics projection value, when served.
		* @returns the two readings; each is null while its own source cannot answer.
		*/
		function compactFacts(usage, stats) {
			const facts = usage === void 0 ? null : tokenFacts(usage);
			return {
				speed: stats !== void 0 && stats.decodeMs > 0 ? formatThroughput(stats.decodeTokens / (stats.decodeMs / 1e3)) : null,
				cacheHitPercent: facts !== null && hasUsage(facts) ? facts.cacheHitPercent : null
			};
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-session-metrics/src/client/SessionMetrics.module.css.mjs
		const css = "._33_2oW_root{align-items:center;display:inline-flex}._33_2oW_trigger{color:var(--dsw-alias-label-secondary);cursor:default;border:.5px solid var(--dsw-alias-border-l4);box-sizing:border-box;height:26px;font-family:var(--dsw-font-family);white-space:nowrap;font-variant-numeric:tabular-nums;background:0 0;border-radius:13px;align-items:center;gap:6px;margin-bottom:0;padding:5px 10px;font-size:11px;font-weight:400;line-height:16px;display:inline-flex}._33_2oW_trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._33_2oW_trigger:active{background:var(--dsw-alias-interactive-bg-hover-solid)}._33_2oW_sep{color:var(--dsw-alias-label-caption);flex:none}._33_2oW_segment{align-items:center;gap:4px;display:inline-flex}._33_2oW_icon{width:14px;height:14px;color:var(--dsw-alias-label-caption);flex:none}._33_2oW_value{font-variant-numeric:tabular-nums}._33_2oW_ringTrack{fill:none;stroke:var(--dsw-alias-border-l3);stroke-width:2px}._33_2oW_ringFill{fill:none;stroke:var(--dsw-alias-label-tertiary);stroke-width:2px;stroke-linecap:round}._33_2oW_panel{z-index:1100;box-sizing:border-box;background:var(--dsw-specific-menu);width:max-content;min-width:min(300px,100vw - 24px);max-width:min(440px,100vw - 24px);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;border:0;border-radius:12px;padding:16px;font-size:12px;line-height:18px;position:fixed}._33_2oW_title{color:var(--dsw-alias-label-primary);justify-content:space-between;gap:16px;margin-bottom:8px;font-weight:500;display:flex}._33_2oW_titleRule{border-top:.5px solid var(--dsw-alias-border-l2);margin-bottom:10px}._33_2oW_titleValue{font-variant-numeric:tabular-nums}._33_2oW_titleLabel{align-items:center;gap:6px;min-width:0;display:inline-flex}._33_2oW_titleLabel svg{flex:none;width:14px;height:14px}._33_2oW_details{color:var(--dsw-alias-label-tertiary);grid-template-columns:minmax(76px,auto) minmax(0,1fr);gap:6px 16px;margin:0;display:grid}._33_2oW_details dt,._33_2oW_details dd{min-width:0;margin:0}._33_2oW_details dd{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;text-align:right}._33_2oW_section+._33_2oW_section{margin-top:14px}._33_2oW_bar{corner-shape:round;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;gap:1px;height:4px;margin:0 0 10px;display:flex;overflow:hidden}._33_2oW_barSegment{background:var(--meter-tint,var(--dsw-alias-label-tertiary));border-radius:1px;flex:none;min-width:2px;height:100%}._33_2oW_swatch{background:var(--meter-tint);vertical-align:baseline;border-radius:2px;width:8px;height:8px;margin-right:6px;display:inline-block}._33_2oW_colorSystem{--meter-tint:var(--dsw-static-neutral-bluish-400)}._33_2oW_colorTools{--meter-tint:#a78bfa}._33_2oW_colorMessages{--meter-tint:var(--dsw-static-blue-450)}";
		const tagId = "@deepseek-ai/dsh-client-ui-session-metrics/SessionMetrics.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-session-metrics";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SessionMetrics_module_css_default = {
			"bar": "_33_2oW_bar",
			"barSegment": "_33_2oW_barSegment",
			"colorMessages": "_33_2oW_colorMessages",
			"colorSystem": "_33_2oW_colorSystem",
			"colorTools": "_33_2oW_colorTools",
			"details": "_33_2oW_details",
			"icon": "_33_2oW_icon",
			"panel": "_33_2oW_panel",
			"ringFill": "_33_2oW_ringFill",
			"ringTrack": "_33_2oW_ringTrack",
			"root": "_33_2oW_root",
			"section": "_33_2oW_section",
			"segment": "_33_2oW_segment",
			"sep": "_33_2oW_sep",
			"swatch": "_33_2oW_swatch",
			"title": "_33_2oW_title",
			"titleLabel": "_33_2oW_titleLabel",
			"titleRule": "_33_2oW_titleRule",
			"titleValue": "_33_2oW_titleValue",
			"trigger": "_33_2oW_trigger",
			"value": "_33_2oW_value"
		};
		//#endregion
		//#region src/client/SessionMetrics.tsx
		/**
		* Session-metrics header capsule and its merged details panel.
		*
		* The compact capsule (icon-prefixed input tokens · output tokens · context
		* occupancy, using the shipped metric icons) renders as the leftmost entry of
		* the Session Header's right-aligned utilities row (order -11, left of the
		* shipped "Open In…" split button and the "Session log" download capsule).
		* Hovering (or keyboard-focusing) it opens one portaled panel that merges the
		* shipped stat dialogs — ui-chat's session-statistics and token-usage dialogs
		* plus ui-conversation's context-usage panel — so a session's figures are read
		* in one place instead of three separate popups.
		*
		* The panel wears the shipped stat-dialog skin and row set exactly, and takes
		* its placement from the same `ui-primitives` seat the shipped dialogs use
		* (`useAnchoredPosition`). It mirrors rather than imports them: a feature
		* plugin may not import another feature plugin's values, so the labels,
		* formatting, and surface are reimplemented here (numeric rules live in
		* session-metrics.ts, copy in locales.ts).
		*
		* The sibling `SessionMetricsSuppressed` occupant replaces the shipped
		* bottom-of-chat stats pills (ui-chat's StatsPills entry, id `stats`) by
		* registering the same cell id at a lower priority (the slot ledger keeps
		* same-id entries at distinct priorities, lowest renders) and rendering
		* nothing: those pills and the dialogs they opened now live in this header
		* capsule. The shipped composer context meter owns no slot cell to shadow, so
		* the plugin's apply hides it with an injected stylesheet (see index.ts).
		*/
		/** Milliseconds of grace before the panel closes after leaving the trigger. */
		const CLOSE_GRACE_MS = 180;
		/** Distance between the trigger's bottom edge and the panel. */
		const PANEL_GAP = 6;
		/** Viewport margin the placement clamp keeps. */
		const PANEL_MARGIN = 12;
		/**
		* Unplaced panel style: hidden but laid out, so the placement hook measures
		* real dimensions on its first pass (the shipped dialogs' own seat).
		*/
		const MEASURE_STYLE = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		/**
		* Live context ring: the shipped meter's 14px ring, its arc drawn from the
		* occupancy reading. The capsule carries the percentage as the arc itself
		* rather than as text; the trigger's spoken label and the panel still state
		* the number.
		* @param props - the occupancy percentage to draw.
		* @returns the ring, hidden from assistive technology.
		*/
		function ContextRing({ percent }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: SessionMetrics_module_css_default.icon,
				viewBox: "0 0 14 14",
				width: "14",
				height: "14",
				"aria-hidden": true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					className: SessionMetrics_module_css_default.ringTrack,
					cx: "7",
					cy: "7",
					r: CONTEXT_RING_RADIUS
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					className: SessionMetrics_module_css_default.ringFill,
					cx: "7",
					cy: "7",
					r: CONTEXT_RING_RADIUS,
					strokeDasharray: contextRingDash(percent),
					transform: "rotate(-90 7 7)"
				})]
			});
		}
		/**
		* Render the compact metrics capsule plus, while hovered or focused, its
		* portaled merged-details panel.
		* @param props - runtime seats.
		* @returns the capsule, or null while the session has neither a step, nor
		* billable usage, nor a context sample with a known capacity.
		*/
		const SessionMetricsTrigger = (0, react.memo)(function SessionMetricsTrigger({ useProjection, usePerformanceUsage, t }) {
			const compact = usePerformanceUsage((value) => value) === "compact";
			const usage = useProjection("tokenUsage");
			const stats = useProjection("sessionStats");
			const pressure = useProjection("contextPressure");
			const breakdown = useProjection("contextBreakdown");
			const facts = (0, react.useMemo)(() => {
				if (usage === void 0) return null;
				const derived = tokenFacts(usage);
				return hasUsage(derived) ? derived : null;
			}, [usage]);
			const occupancy = (0, react.useMemo)(() => contextOccupancy(pressure), [pressure]);
			const stepped = stats !== void 0 && stats.steps > 0;
			const [open, setOpen] = (0, react.useState)(false);
			const triggerRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const closeTimerRef = (0, react.useRef)(void 0);
			const pos = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: triggerRef,
				panelRef,
				side: "bottom",
				gap: PANEL_GAP,
				margin: PANEL_MARGIN
			});
			const clearCloseTimer = (0, react.useCallback)(() => {
				if (closeTimerRef.current !== void 0) {
					window.clearTimeout(closeTimerRef.current);
					closeTimerRef.current = void 0;
				}
			}, []);
			const scheduleClose = (0, react.useCallback)(() => {
				clearCloseTimer();
				closeTimerRef.current = window.setTimeout(() => {
					closeTimerRef.current = void 0;
					setOpen(false);
				}, CLOSE_GRACE_MS);
			}, [clearCloseTimer]);
			const keepOpen = (0, react.useCallback)(() => {
				clearCloseTimer();
				setOpen(true);
			}, [clearCloseTimer]);
			(0, react.useEffect)(() => clearCloseTimer, [clearCloseTimer]);
			const compactReadings = compact ? compactFacts(usage, stats) : null;
			const speedText = compactReadings?.speed ?? void 0;
			const cacheHitText = compactReadings?.cacheHitPercent ?? void 0;
			if (compact) {
				if (speedText === void 0 && cacheHitText === void 0 && occupancy === null) return null;
			} else if (facts === null && occupancy === null && !stepped) return null;
			const inputText = facts === null ? void 0 : formatCompactTokens(facts.billedInputTokens, t);
			const outputText = facts === null ? void 0 : formatCompactTokens(facts.outputTokens, t);
			const contextText = occupancy === null ? void 0 : occupancy.percent + "%";
			const segments = [];
			const pushSegment = (key, icon, values) => {
				if (segments.length > 0) segments.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.sep,
					"aria-hidden": "true",
					children: "·"
				}, "sep-" + key));
				const parts = [];
				values.forEach((value, index) => {
					if (index > 0) parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SessionMetrics_module_css_default.sep,
						"aria-hidden": "true",
						children: "·"
					}, "inner-" + index));
					parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SessionMetrics_module_css_default.value,
						children: value
					}, "value-" + index));
				});
				segments.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SessionMetrics_module_css_default.segment,
					children: [icon, parts]
				}, key));
			};
			if (compact) {
				if (speedText !== void 0) pushSegment("speed", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGaugeOutlineRegular, { className: SessionMetrics_module_css_default.icon }), [t("value.tokensPerSecond", { throughput: speedText })]);
				if (cacheHitText !== void 0) pushSegment("cacheHit", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { className: SessionMetrics_module_css_default.icon }), [t("value.cacheHit", { percent: cacheHitText })]);
			} else {
				const tokenValues = [];
				if (inputText !== void 0) tokenValues.push(inputText);
				if (outputText !== void 0) tokenValues.push(outputText);
				if (tokenValues.length > 0) pushSegment("tokens", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { className: SessionMetrics_module_css_default.icon }), tokenValues);
			}
			if (occupancy !== null) pushSegment("context", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextRing, { percent: occupancy.percent }), []);
			const ariaParts = [];
			if (compact) {
				if (speedText !== void 0) ariaParts.push(t("value.tokensPerSecond", { throughput: speedText }));
				if (cacheHitText !== void 0) ariaParts.push(t("value.cacheHit", { percent: cacheHitText }));
			} else {
				if (inputText !== void 0) ariaParts.push(t("aria.input", { input: inputText }));
				if (outputText !== void 0) ariaParts.push(t("aria.output", { output: outputText }));
			}
			if (occupancy !== null && contextText !== void 0) ariaParts.push(t("aria.context", { percent: contextText }));
			const ariaLabel = t("aria.metrics", { items: ariaParts.join(" · ") });
			const panel = open && !compact ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: panelRef,
				className: SessionMetrics_module_css_default.panel,
				role: "dialog",
				"aria-label": t("aria.panel"),
				style: pos ?? MEASURE_STYLE,
				onMouseEnter: keepOpen,
				onMouseLeave: () => setOpen(false),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionMetricsDetails, {
					usage,
					stats,
					pressure,
					breakdown,
					t
				})
			}), document.body) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SessionMetrics_module_css_default.root,
				children: [compact ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.trigger,
					role: "group",
					"aria-label": ariaLabel,
					children: segments
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					ref: triggerRef,
					type: "button",
					className: SessionMetrics_module_css_default.trigger,
					"aria-label": ariaLabel,
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					onMouseEnter: keepOpen,
					onMouseLeave: scheduleClose,
					onFocus: keepOpen,
					onBlur: scheduleClose,
					onKeyDown: (event) => {
						if (event.key === "Escape") setOpen(false);
					},
					children: segments
				}), panel]
			});
		});
		/** One titled section of the merged panel. */
		function Section({ icon, label, value, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SessionMetrics_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SessionMetrics_module_css_default.title,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SessionMetrics_module_css_default.titleLabel,
							children: [icon, label]
						}), value !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SessionMetrics_module_css_default.titleValue,
							children: value
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SessionMetrics_module_css_default.titleRule,
						"aria-hidden": true
					}),
					children
				]
			});
		}
		/**
		* Render the merged panel body: the shipped session-statistics, token-usage,
		* and context-usage surfaces, in that order, each under its own heading.
		* @param props - projection values and the locale seat.
		* @returns the panel sections.
		*/
		function SessionMetricsDetails({ usage, stats, pressure, breakdown, t }) {
			const counts = stats !== void 0 && stats.steps > 0 ? t("panel.counts", {
				turns: stats.turns,
				steps: stats.steps
			}) : void 0;
			const timingRows = [];
			if (stats !== void 0 && stats.steps > 0) {
				if (stats.llmMs > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.llmTime") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: formatDuration(stats.llmMs, t) })] }, "llm"));
				if (stats.toolMs > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.toolTime") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: formatDuration(stats.toolMs, t) })] }, "tool"));
				if (stats.ttftSteps > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.ttft") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: formatDuration(stats.ttftMs / stats.ttftSteps, t) })] }, "ttft"));
				if (stats.decodeMs > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.speed") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("value.tokensPerSecond", { throughput: formatThroughput(stats.decodeTokens / (stats.decodeMs / 1e3)) }) })] }, "speed"));
			}
			const total = usage === void 0 ? 0 : sessionTotalTokens(usage);
			const cacheHit = usage === void 0 ? null : cacheHitPercentText(usage);
			const usageRows = [];
			if (usage !== void 0 && total > 0) {
				if (cacheHit !== null) usageRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.cacheHit") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: cacheHit + "%" })] }, "cache"));
				usageRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.input") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("panel.count", { count: formatCompactTokens(usage.uncachedInputTokens, t) }) })] }, "input"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.cacheRead") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("panel.count", { count: formatCompactTokens(usage.cacheReadTokens, t) }) })] }, "cacheRead"));
				if (usage.cacheWriteTokens !== 0) usageRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.cacheWrite") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("panel.count", { count: formatCompactTokens(usage.cacheWriteTokens, t) }) })] }, "cacheWrite"));
				usageRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.output") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("panel.count", { count: formatCompactTokens(usage.outputTokens, t) }) })] }, "output"));
			}
			const occupancy = contextOccupancy(pressure);
			const breakdownTotal = breakdown === void 0 ? 0 : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
			const contextRows = [];
			let contextBar = null;
			if (occupancy !== null) {
				const parts = breakdown === void 0 || breakdownTotal === 0 ? [{
					key: "total",
					width: occupancy.percent
				}] : [
					{
						key: "system",
						color: SessionMetrics_module_css_default.colorSystem,
						width: occupancy.percent * breakdown.systemTokens / breakdownTotal
					},
					{
						key: "tools",
						color: SessionMetrics_module_css_default.colorTools,
						width: occupancy.percent * breakdown.toolsTokens / breakdownTotal
					},
					{
						key: "messages",
						color: SessionMetrics_module_css_default.colorMessages,
						width: occupancy.percent * breakdown.messageTokens / breakdownTotal
					}
				];
				contextBar = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SessionMetrics_module_css_default.bar,
					children: parts.filter((part) => part.width > 0).map((part) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: part.color === void 0 ? SessionMetrics_module_css_default.barSegment : SessionMetrics_module_css_default.barSegment + " " + part.color,
						style: { width: part.width + "%" }
					}, part.key))
				});
				contextRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("panel.contextUsed") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("panel.contextFigures", {
					used: formatCompactTokens(occupancy.usedTokens, t),
					window: formatCompactTokens(occupancy.contextWindow, t)
				}) })] }, "used"));
				if (breakdown !== void 0) {
					const legend = [
						{
							key: "system",
							color: SessionMetrics_module_css_default.colorSystem,
							label: t("panel.contextSystem"),
							tokens: breakdown.systemTokens
						},
						{
							key: "tools",
							color: SessionMetrics_module_css_default.colorTools,
							label: t("panel.contextTools"),
							tokens: breakdown.toolsTokens
						},
						{
							key: "messages",
							color: SessionMetrics_module_css_default.colorMessages,
							label: t("panel.contextMessages"),
							tokens: breakdown.messageTokens
						}
					];
					for (const row of legend) contextRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SessionMetrics_module_css_default.swatch + " " + row.color,
						"aria-hidden": true
					}), row.label] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: "~" + formatCompactTokens(row.tokens, t) })] }, row.key));
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				counts !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGaugeOutlineRegular, {}),
					label: t("panel.title"),
					value: counts,
					children: timingRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: SessionMetrics_module_css_default.details,
						children: timingRows
					})
				}),
				usageRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, {}),
					label: t("panel.usageTitle"),
					value: t("panel.count", { count: formatCompactTokens(total, t) }),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: SessionMetrics_module_css_default.details,
						children: usageRows
					})
				}),
				occupancy !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCompactOutlineRegular, {}),
					label: t("panel.context"),
					value: occupancy.percent + "%",
					children: [contextBar, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: SessionMetrics_module_css_default.details,
						children: contextRows
					})]
				})
			] });
		}
		/**
		* Replacement occupant of the shipped bottom-of-chat stats pills: this entry
		* reuses the `stats` cell of `conversation.composer.dock` at a lower
		* priority, so ui-chat's StatsPills (priority 0) are shadowed and the strip
		* disappears — those figures moved into the Session Header capsule above.
		*/
		const SessionMetricsSuppressed = (0, react.memo)(function SessionMetricsSuppressed() {
			return null;
		});
		//#endregion
		//#region src/client/locales.ts
		/** Session-metrics namespace dictionaries for the chat-header metrics surface.
		*
		* Row labels and templates mirror ui-chat's own `stats.dialog.*` and
		* `message.turnUsage.*` copy and ui-conversation's `context.*` copy, so the
		* merged panel reads exactly like the shipped dialogs it replaces; the two
		* dictionaries stay complete against each other.
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "session-metrics";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"panel.title": "会话统计",
			"panel.usageTitle": "Token 用量",
			"panel.context": "上下文占用",
			"panel.counts": "{turns} 轮 {steps} 步",
			"panel.llmTime": "模型用时",
			"panel.toolTime": "工具调用用时",
			"panel.ttft": "首 token 平均（TTFT）",
			"panel.speed": "输出速度（TPS）",
			"panel.cacheHit": "缓存命中",
			"panel.input": "未缓存输入",
			"panel.cacheRead": "缓存读取",
			"panel.cacheWrite": "缓存写入",
			"panel.output": "输出",
			"panel.count": "{count} tok",
			"panel.contextUsed": "上下文已用",
			"panel.contextFigures": "~{used} / {window}",
			"panel.contextSystem": "系统提示词",
			"panel.contextTools": "工具定义",
			"panel.contextMessages": "对话消息",
			"value.tokensPerSecond": "{throughput} tok/s",
			"value.cacheHit": "缓存命中 {percent}%",
			"aria.input": "输入 {input} tokens",
			"aria.output": "输出 {output} tokens",
			"aria.context": "上下文已用 {percent}",
			"aria.panel": "会话指标",
			"aria.metrics": "会话指标：{items}",
			"number.thousand": "{value}K",
			"number.million": "{value}M",
			"duration.compactSeconds": "{seconds}秒",
			"duration.compactMinutes": "{minutes}分{seconds}秒"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"panel.title": "Session statistics",
			"panel.usageTitle": "Token usage",
			"panel.context": "Context usage",
			"panel.counts": "{turns} turns {steps} steps",
			"panel.llmTime": "LLM time",
			"panel.toolTime": "Tool time",
			"panel.ttft": "Avg time to first token (TTFT)",
			"panel.speed": "Tokens per second (TPS)",
			"panel.cacheHit": "Cache hit",
			"panel.input": "Uncached input",
			"panel.cacheRead": "Cached input",
			"panel.cacheWrite": "Cache write",
			"panel.output": "Output",
			"panel.count": "{count} tok",
			"panel.contextUsed": "of context used",
			"panel.contextFigures": "~{used} / {window}",
			"panel.contextSystem": "System prompt",
			"panel.contextTools": "Tool definitions",
			"panel.contextMessages": "Messages",
			"value.tokensPerSecond": "{throughput} tok/s",
			"value.cacheHit": "Cache hit {percent}%",
			"aria.input": "Input {input} tokens",
			"aria.output": "Output {output} tokens",
			"aria.context": "{percent} of context used",
			"aria.panel": "Session metrics",
			"aria.metrics": "Session metrics: {items}",
			"number.thousand": "{value}K",
			"number.million": "{value}M",
			"duration.compactSeconds": "{seconds}s",
			"duration.compactMinutes": "{minutes}m{seconds}s"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot ledger, the locale face, and the configuration forms. */
		const inject = [
			"slots",
			"locale",
			"configForms"
		];
		/**
		* Hides the shipped composer context meter. It is named by the static facts
		* its markup exposes — a `span` whose direct child is the meter button,
		* whose own direct child is the 14px progress ring — because it carries no
		* stable class, id, or data attribute of its own. Both ring spellings are
		* listed: an SVG attribute name is matched case-sensitively by a CSS
		* selector, while the `width`/`height` pair is not.
		*/
		const HIDE_COMPOSER_CONTEXT_METER = ["span:has(> button[aria-haspopup='dialog'] > svg[viewBox='0 0 14 14'] > circle)", "span:has(> button[aria-haspopup='dialog'] > svg[width='14'][height='14'] > circle)"].join(",\n") + " { display: none !important; }";
		/**
		* Inject the composer-meter suppression stylesheet into the page.
		* @returns disposer removing the stylesheet when the plugin unloads.
		*/
		function hideComposerContextMeter() {
			const style = document.createElement("style");
			style.dataset.sessionMetrics = "composer-context-meter";
			style.textContent = HIDE_COMPOSER_CONTEXT_METER;
			document.head.append(style);
			return () => {
				style.remove();
			};
		}
		/** Namespace owning the Chat target's durable settings section. */
		const CHAT_SETTINGS_NAMESPACE = "ui-chat";
		/**
		* Mirror the accepted performance-and-usage detail level, so the capsule can
		* present the readings the shipped composer strip presents for that level. The
		* Settings row stays the only writer; this source never writes.
		* @param ctx - client root context holding the configuration-form service.
		* @returns live source of the accepted detail level.
		*/
		function performanceUsageSource(ctx) {
			const mode = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(DEFAULT_PERFORMANCE_USAGE);
			const form = ctx.configForms.get(CHAT_SETTINGS_NAMESPACE);
			ctx.effect(() => {
				const adopt = () => {
					const accepted = form.getSnapshot().value?.performanceUsage;
					if (accepted !== void 0) mode.set(accepted);
				};
				const unsubscribe = form.subscribe(adopt);
				adopt();
				return unsubscribe;
			}, "ui-session-metrics: performance-usage level");
			return mode;
		}
		/**
		* Client plugin body: register the header capsule, shadow the shipped stats
		* strip, and hide the shipped composer context meter. Every effect is removed
		* on plugin unload, which restores the shipped surfaces.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-session-metrics: dictionaries");
			ctx.effect(hideComposerContextMeter, "ui-session-metrics: composer context meter");
			const performanceUsage = performanceUsageSource(ctx);
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "session-metrics",
				order: -11,
				locale: NS,
				inject: () => ({ hooks: { performanceUsage } })
			}, SessionMetricsTrigger));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "stats",
				priority: -1,
				locale: NS
			}, SessionMetricsSuppressed));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map