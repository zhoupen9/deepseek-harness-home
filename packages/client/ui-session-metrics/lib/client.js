window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-session-metrics",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
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
		* Exact integer token count with locale-owned digit grouping.
		* @param value - non-negative safe integer token count.
		* @param t - namespace-bound translator.
		* @returns an unrounded display string.
		*/
		function formatExactTokens(value, t) {
			const digits = String(value);
			const groups = [];
			for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end));
			return groups.join(t("number.groupSeparator"));
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
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-session-metrics/src/client/SessionMetrics.module.css.mjs
		const css = "._33_2oW_root{align-items:center;display:inline-flex}._33_2oW_trigger{color:var(--dsw-alias-label-secondary);cursor:default;border:.5px solid var(--dsw-alias-border-l4);box-sizing:border-box;height:26px;font-family:var(--dsw-font-family);white-space:nowrap;font-variant-numeric:tabular-nums;background:0 0;border-radius:13px;align-items:center;gap:6px;margin-bottom:0;padding:5px 10px;font-size:11px;font-weight:400;line-height:16px;display:inline-flex}._33_2oW_trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._33_2oW_trigger:active{background:var(--dsw-alias-interactive-bg-hover-solid)}._33_2oW_sep{color:var(--dsw-alias-label-caption);flex:none}._33_2oW_segment{align-items:baseline;gap:4px;display:inline-flex}._33_2oW_glyph{color:var(--dsw-alias-label-caption);font-variant-emoji:text;font-size:10px;line-height:16px}._33_2oW_glyphValue{font-variant-numeric:tabular-nums}._33_2oW_panel{z-index:1100;box-sizing:border-box;width:max-content;min-width:224px;max-width:min(380px,100vw - 24px);color:var(--dsw-alias-label-secondary);cursor:default;background:var(--dsw-specific-menu);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);border:0;border-radius:12px;padding:12px 14px;font-size:12px;line-height:18px;position:fixed}._33_2oW_title{color:var(--dsw-alias-label-primary);white-space:nowrap;margin:0 0 4px;font-size:12px;font-weight:500;line-height:18px}._33_2oW_caption{color:var(--dsw-alias-label-tertiary);white-space:nowrap;margin:0 0 6px}._33_2oW_row{justify-content:space-between;align-items:baseline;gap:24px;padding:1px 0;display:flex}._33_2oW_label{color:var(--dsw-alias-label-tertiary);white-space:nowrap}._33_2oW_labelSub{padding-left:14px}._33_2oW_value{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;font-weight:500}._33_2oW_valueSub{color:var(--dsw-alias-label-secondary);font-weight:400}._33_2oW_valueRate{color:var(--dsw-alias-state-business-primary);font-weight:500}._33_2oW_divider{border-top:.5px solid var(--dsw-alias-border-l2);margin:6px 0}._33_2oW_hidden{display:none}";
		const tagId = "@deepseek-ai/dsh-client-ui-session-metrics/SessionMetrics.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-session-metrics";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SessionMetrics_module_css_default = {
			"caption": "_33_2oW_caption",
			"divider": "_33_2oW_divider",
			"glyph": "_33_2oW_glyph",
			"glyphValue": "_33_2oW_glyphValue",
			"hidden": "_33_2oW_hidden",
			"label": "_33_2oW_label",
			"labelSub": "_33_2oW_labelSub",
			"panel": "_33_2oW_panel",
			"root": "_33_2oW_root",
			"row": "_33_2oW_row",
			"segment": "_33_2oW_segment",
			"sep": "_33_2oW_sep",
			"title": "_33_2oW_title",
			"trigger": "_33_2oW_trigger",
			"value": "_33_2oW_value",
			"valueRate": "_33_2oW_valueRate",
			"valueSub": "_33_2oW_valueSub"
		};
		//#endregion
		//#region src/client/SessionMetrics.tsx
		/**
		* Session-metrics header capsule and its hover details panel.
		*
		* The compact capsule (glyph-prefixed token speed · cache-hit rate · input
		* tokens · output tokens) renders as the leftmost entry of the Session
		* Header's right-aligned utilities row (order -11, left of the shipped
		* "Open In…" split button and the "Session log" download capsule). Hovering
		* (or keyboard-focusing) the capsule opens a portaled details panel with the
		* full session metrics — turn/step counts, model/tool wall times, TTFT and
		* decode throughput from the `sessionStats` projection, and the exact token
		* buckets plus cache-hit share from the `tokenUsage` projection.
		*
		* The sibling `SessionMetricsSuppressed` occupant replaces the shipped
		* bottom-of-chat stats strip (ui-chat's StatsLine entry, id `stats`) by
		* registering the same cell id at a lower priority (the slot ledger keeps
		* same-id entries at distinct priorities, lowest renders) and rendering
		* nothing: the strip's content now lives in this header capsule.
		*/
		/** Milliseconds of grace before the panel closes after leaving the trigger. */
		const CLOSE_GRACE_MS = 180;
		/**
		* Text glyphs of the compact metrics (glyphs on purpose — no SVG dependency).
		* Swap characters here to restyle the capsule without touching logic.
		*
		* U+26A1 (lightning) defaults to emoji presentation in browsers, which picks
		* a colored glyph; the U+FE0E variation selector after it forces the text
		* (monochrome) presentation. `.glyph` additionally sets
		* `font-variant-emoji: text` as a modern-browser guard.
		*/
		const GLYPH_SPEED = "⚡︎";
		const GLYPH_CACHE = "↻";
		const GLYPH_INPUT = "↓";
		const GLYPH_OUTPUT = "↑";
		/** One label/value row of the details panel. */
		function MetricRow({ label, value, sub = false, rate = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SessionMetrics_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: sub ? SessionMetrics_module_css_default.label + " " + SessionMetrics_module_css_default.labelSub : SessionMetrics_module_css_default.label,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: rate ? SessionMetrics_module_css_default.value + " " + SessionMetrics_module_css_default.valueRate : sub ? SessionMetrics_module_css_default.value + " " + SessionMetrics_module_css_default.valueSub : SessionMetrics_module_css_default.value,
					children: value
				})]
			});
		}
		/**
		* Render the compact metrics capsule plus, while hovered or focused, its
		* portaled details panel.
		* @param props - runtime seats.
		* @returns the capsule, or null while the session has no billable usage.
		*/
		const SessionMetricsTrigger = (0, react.memo)(function SessionMetricsTrigger({ useProjection, t }) {
			const usage = useProjection("tokenUsage");
			const stats = useProjection("sessionStats");
			const facts = (0, react.useMemo)(() => {
				if (usage === void 0) return null;
				const derived = tokenFacts(usage);
				return hasUsage(derived) ? derived : null;
			}, [usage]);
			const [open, setOpen] = (0, react.useState)(false);
			const [anchor, setAnchor] = (0, react.useState)(null);
			const triggerRef = (0, react.useRef)(null);
			const closeTimerRef = (0, react.useRef)(void 0);
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
			(0, react.useEffect)(() => {
				if (!open) return;
				const measure = () => {
					const el = triggerRef.current;
					if (el === null) return;
					const rect = el.getBoundingClientRect();
					setAnchor({
						top: rect.bottom + 6,
						right: window.innerWidth - rect.right
					});
				};
				measure();
				window.addEventListener("scroll", measure, true);
				window.addEventListener("resize", measure);
				return () => {
					window.removeEventListener("scroll", measure, true);
					window.removeEventListener("resize", measure);
				};
			}, [open]);
			(0, react.useEffect)(() => clearCloseTimer, [clearCloseTimer]);
			if (facts === null) return null;
			const decodeSpeed = stats !== void 0 && stats.decodeMs > 0 && stats.decodeTokens > 0 ? stats.decodeTokens / (stats.decodeMs / 1e3) : void 0;
			const speedText = decodeSpeed === void 0 ? void 0 : t("value.tokensPerSecond", { throughput: formatThroughput(decodeSpeed) });
			const inputText = formatCompactTokens(facts.billedInputTokens, t);
			const outputText = formatCompactTokens(facts.outputTokens, t);
			const cacheText = facts.cacheHitPercent === null ? void 0 : facts.cacheHitPercent + "%";
			const segments = [];
			const pushSegment = (node) => {
				if (segments.length > 0) segments.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.sep,
					"aria-hidden": "true",
					children: "·"
				}, "sep" + segments.length));
				segments.push(node);
			};
			if (speedText !== void 0) pushSegment(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: SessionMetrics_module_css_default.segment,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyph,
					"aria-hidden": "true",
					children: GLYPH_SPEED
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyphValue,
					children: speedText
				})]
			}, "speed"));
			if (cacheText !== void 0) pushSegment(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: SessionMetrics_module_css_default.segment,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyph,
					"aria-hidden": "true",
					children: GLYPH_CACHE
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyphValue,
					children: cacheText
				})]
			}, "cache"));
			pushSegment(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: SessionMetrics_module_css_default.segment,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyph,
					"aria-hidden": "true",
					children: GLYPH_INPUT
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyphValue,
					children: inputText
				})]
			}, "input"));
			pushSegment(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: SessionMetrics_module_css_default.segment,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyph,
					"aria-hidden": "true",
					children: GLYPH_OUTPUT
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionMetrics_module_css_default.glyphValue,
					children: outputText
				})]
			}, "output"));
			const ariaParts = [];
			if (speedText !== void 0) ariaParts.push(t("aria.speed", { speed: speedText }));
			if (facts.cacheHitPercent !== null) ariaParts.push(t("aria.cache", { percent: facts.cacheHitPercent }));
			ariaParts.push(t("aria.input", { input: inputText }));
			ariaParts.push(t("aria.output", { output: outputText }));
			const ariaLabel = t("aria.metrics", { items: ariaParts.join(" · ") });
			const panel = open && anchor !== null ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SessionMetrics_module_css_default.panel,
				role: "tooltip",
				style: {
					top: anchor.top,
					right: anchor.right
				},
				onMouseEnter: keepOpen,
				onMouseLeave: () => setOpen(false),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionMetricsDetails, {
					usage,
					stats,
					t
				})
			}), document.body) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SessionMetrics_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					ref: triggerRef,
					type: "button",
					className: SessionMetrics_module_css_default.trigger,
					"aria-label": ariaLabel,
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
		/**
		* Render the full session-metrics details panel body.
		* @param props - projection values and the locale seat.
		* @returns the details panel.
		*/
		function SessionMetricsDetails({ usage, stats, t }) {
			const billed = usage === void 0 ? 0 : billedInputTokens(usage);
			const output = usage === void 0 ? 0 : usage.outputTokens;
			const cachePercent = usage === void 0 ? null : cacheHitPercentText(usage);
			const timings = usage !== void 0 && stats !== void 0 && stats.steps > 0;
			const timingRows = [];
			if (timings) {
				if (stats.llmMs > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					label: t("panel.modelTime"),
					value: formatDuration(stats.llmMs, t)
				}, "model"));
				if (stats.toolMs > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					label: t("panel.toolTime"),
					value: formatDuration(stats.toolMs, t)
				}, "tool"));
				if (stats.ttftSteps > 0) timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					label: t("panel.ttft"),
					value: formatDuration(stats.ttftMs / stats.ttftSteps, t)
				}, "ttft"));
				if (stats.decodeMs > 0 && stats.decodeTokens > 0) {
					const tps = stats.decodeTokens / (stats.decodeMs / 1e3);
					timingRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
						label: t("panel.decode"),
						value: t("value.tokensPerSecond", { throughput: formatThroughput(tps) })
					}, "decode"));
				}
			}
			const tokenRows = [];
			if (billed > 0) {
				tokenRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					label: t("panel.input"),
					value: formatExactTokens(billed, t)
				}, "input"));
				if (usage.cacheReadTokens > 0) tokenRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					sub: true,
					label: t("panel.cacheRead"),
					value: formatExactTokens(usage.cacheReadTokens, t)
				}, "cacheRead"));
				if (usage.cacheWriteTokens > 0) tokenRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					sub: true,
					label: t("panel.cacheWrite"),
					value: formatExactTokens(usage.cacheWriteTokens, t)
				}, "cacheWrite"));
				if (usage.uncachedInputTokens > 0) tokenRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
					sub: true,
					label: t("panel.uncached"),
					value: formatExactTokens(usage.uncachedInputTokens, t)
				}, "uncached"));
			}
			if (output > 0) tokenRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
				label: t("panel.output"),
				value: formatExactTokens(output, t)
			}, "output"));
			if (cachePercent !== null && billed > 0) tokenRows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
				rate: true,
				label: t("panel.cacheRate"),
				value: cachePercent + "%"
			}, "cacheRate"));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SessionMetrics_module_css_default.title,
					children: t("panel.title")
				}),
				timings && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SessionMetrics_module_css_default.caption,
					children: t("panel.caption", {
						turns: stats.turns,
						steps: stats.steps
					})
				}),
				timingRows,
				timingRows.length > 0 && tokenRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SessionMetrics_module_css_default.divider }),
				tokenRows
			] });
		}
		/**
		* Replacement occupant of the shipped bottom-of-chat stats strip: this entry
		* reuses the `stats` cell of `conversation.composer.dock` at a lower
		* priority, so the ui-chat StatsLine (priority 0) is shadowed and the strip
		* disappears — its metrics moved into the Session Header capsule above.
		*/
		const SessionMetricsSuppressed = (0, react.memo)(function SessionMetricsSuppressed() {
			return null;
		});
		//#endregion
		//#region src/client/locales.ts
		/** Session-metrics namespace dictionaries for the chat-header metrics surface. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "session-metrics";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"panel.title": "会话指标",
			"panel.caption": "{turns} 轮 · {steps} 步",
			"panel.modelTime": "模型耗时",
			"panel.toolTime": "工具耗时",
			"panel.ttft": "首 token 平均延迟",
			"panel.decode": "解码速度",
			"panel.input": "输入 tokens",
			"panel.cacheRead": "缓存读取",
			"panel.cacheWrite": "缓存写入",
			"panel.uncached": "未命中缓存",
			"panel.output": "输出 tokens",
			"panel.cacheRate": "缓存命中率",
			"value.tokensPerSecond": "{throughput} tok/s",
			"aria.speed": "解码速度 {speed}",
			"aria.cache": "缓存命中率 {percent}%",
			"aria.input": "输入 {input} tokens",
			"aria.output": "输出 {output} tokens",
			"aria.metrics": "会话指标：{items}",
			"number.groupSeparator": ",",
			"number.thousand": "{value}K",
			"number.million": "{value}M",
			"duration.compactSeconds": "{seconds}秒",
			"duration.compactMinutes": "{minutes}分{seconds}秒"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"panel.title": "Session metrics",
			"panel.caption": "{turns} turns · {steps} steps",
			"panel.modelTime": "Model time",
			"panel.toolTime": "Tool time",
			"panel.ttft": "Avg TTFT",
			"panel.decode": "Decode speed",
			"panel.input": "Input tokens",
			"panel.cacheRead": "Cache read",
			"panel.cacheWrite": "Cache write",
			"panel.uncached": "Uncached",
			"panel.output": "Output tokens",
			"panel.cacheRate": "Cache hit rate",
			"value.tokensPerSecond": "{throughput} tok/s",
			"aria.speed": "Decode speed {speed}",
			"aria.cache": "Cache hit rate {percent}%",
			"aria.input": "Input {input} tokens",
			"aria.output": "Output {output} tokens",
			"aria.metrics": "Session metrics: {items}",
			"number.groupSeparator": ",",
			"number.thousand": "{value}K",
			"number.million": "{value}M",
			"duration.compactSeconds": "{seconds}s",
			"duration.compactMinutes": "{minutes}m{seconds}s"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot ledger and the locale face. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register the header capsule and shadow the shipped
		* stats strip. All registrations ride the slot service's effect wrapper, so
		* plugin unload removes them.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-session-metrics: dictionaries");
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "session-metrics",
				order: -11,
				locale: NS
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