window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-changes",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/changes-text.ts
		/**
		* Shared text helpers for the Changes reconstruction and net-diff rendering.
		* @module @deepseek-ai/dsh-client-ui-changes/client
		*/
		/**
		* Split a side's text into its content lines, mirroring DiffBlock's rule: empty
		* text is zero lines, a single trailing newline is a terminator rather than an
		* extra empty line, and an interior blank line survives.
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
		/**
		* LCS work cap in DP cells: beyond it the alignment falls back to one
		* unaligned full-replace region (still a correct, if coarser, difference).
		*/
		const MAX_LCS_CELLS = 2e5;
		/**
		* Compute the LCS alignment of `before`/`after` as an event stream
		* (matches, deletions, insertions in file order), falling back to a full
		* replace for oversized inputs.
		*/
		function lcsEvents(before, after) {
			const n = before.length;
			const m = after.length;
			if (n * m > MAX_LCS_CELLS) {
				const events = [];
				for (const text of before) events.push({
					kind: "del",
					text
				});
				for (const text of after) events.push({
					kind: "add",
					text
				});
				return events;
			}
			const width = m + 1;
			const dir = new Uint8Array((n + 1) * width);
			let prev = new Uint32Array(width);
			let cur = new Uint32Array(width);
			for (let i = 1; i <= n; i++) {
				cur[0] = 0;
				const line = before[i - 1];
				for (let j = 1; j <= m; j++) if (line === after[j - 1]) {
					cur[j] = prev[j - 1] + 1;
					dir[i * width + j] = 3;
				} else if (prev[j] >= cur[j - 1]) {
					cur[j] = prev[j];
					dir[i * width + j] = 1;
				} else {
					cur[j] = cur[j - 1];
					dir[i * width + j] = 2;
				}
				[prev, cur] = [cur, prev];
			}
			const events = [];
			let i = n;
			let j = m;
			while (i > 0 || j > 0) if (i > 0 && j > 0 && dir[i * width + j] === 3) {
				events.push({
					kind: "match",
					text: before[i - 1]
				});
				i--;
				j--;
			} else if (i > 0 && (j === 0 || dir[i * width + j] === 1)) {
				events.push({
					kind: "del",
					text: before[i - 1]
				});
				i--;
			} else {
				events.push({
					kind: "add",
					text: after[j - 1]
				});
				j--;
			}
			events.reverse();
			return events;
		}
		/**
		* Align `before`/`after` into change regions padded with up to `context`
		* unchanged lines each side, joined by gap rows where context does not overlap.
		* @param before - the original content.
		* @param after - the current content.
		* @param context - unchanged lines shown per region side.
		* @returns the rendered rows; empty when the texts are identical.
		*/
		function computeNetDiff(before, after, context = 2) {
			const events = lcsEvents(contentLines(before), contentLines(after));
			const rows = [];
			let lastConsumed = 0;
			let i = 0;
			while (i < events.length) {
				if (events[i].kind === "match") {
					i++;
					continue;
				}
				const lookback = [];
				for (let k = i - 1; k >= 0 && lookback.length < context && events[k].kind === "match"; k--) lookback.unshift(events[k].text);
				const dels = [];
				const adds = [];
				let j = i;
				while (j < events.length && events[j].kind !== "match") {
					if (events[j].kind === "del") dels.push(events[j].text);
					else adds.push(events[j].text);
					j++;
				}
				const lookahead = [];
				for (let k = j; k < events.length && lookahead.length < context && events[k].kind === "match"; k++) lookahead.push(events[k].text);
				const end = j + lookahead.length;
				if (rows.length > 0 && i > lastConsumed) rows.push({ kind: "gap" });
				for (const text of lookback) rows.push({
					kind: "ctx",
					text
				});
				for (const text of dels) rows.push({
					kind: "del",
					text
				});
				for (const text of adds) rows.push({
					kind: "add",
					text
				});
				for (const text of lookahead) rows.push({
					kind: "ctx",
					text
				});
				lastConsumed = end;
				i = end;
			}
			return rows;
		}
		/** Tally added/removed lines from rendered rows. */
		function summarizeRows(rows) {
			let added = 0;
			let removed = 0;
			for (const row of rows) if (row.kind === "del") removed++;
			else if (row.kind === "add") added++;
			return {
				added,
				removed
			};
		}
		/** The plain-text rendering of the rows (copy payload). */
		function rowsToText(rows) {
			return rows.map((row) => {
				switch (row.kind) {
					case "del": return `- ${row.text}`;
					case "add": return `+ ${row.text}`;
					case "ctx": return row.text;
					case "gap": return "⋯";
				}
			}).join("\n");
		}
		//#endregion
		//#region src/client/changes-highlight.ts
		const JS_KEYWORDS = [
			"abstract",
			"as",
			"assert",
			"asserts",
			"async",
			"await",
			"break",
			"case",
			"catch",
			"class",
			"const",
			"continue",
			"debugger",
			"declare",
			"default",
			"delete",
			"do",
			"else",
			"enum",
			"export",
			"extends",
			"finally",
			"for",
			"from",
			"function",
			"get",
			"if",
			"implements",
			"import",
			"in",
			"infer",
			"instanceof",
			"interface",
			"is",
			"keyof",
			"let",
			"module",
			"namespace",
			"never",
			"new",
			"object",
			"of",
			"package",
			"private",
			"protected",
			"public",
			"readonly",
			"require",
			"return",
			"satisfies",
			"set",
			"static",
			"string",
			"super",
			"switch",
			"symbol",
			"throw",
			"try",
			"type",
			"typeof",
			"unique",
			"unknown",
			"var",
			"void",
			"while",
			"with",
			"yield"
		];
		const PYTHON_KEYWORDS = [
			"and",
			"as",
			"assert",
			"async",
			"await",
			"break",
			"class",
			"continue",
			"def",
			"del",
			"elif",
			"else",
			"except",
			"finally",
			"for",
			"from",
			"global",
			"if",
			"import",
			"in",
			"is",
			"lambda",
			"nonlocal",
			"not",
			"or",
			"pass",
			"raise",
			"return",
			"try",
			"while",
			"with",
			"yield"
		];
		const SHELL_KEYWORDS = [
			"if",
			"then",
			"else",
			"elif",
			"fi",
			"for",
			"while",
			"do",
			"done",
			"case",
			"esac",
			"function",
			"select",
			"until",
			"in",
			"return",
			"break",
			"continue",
			"exit",
			"export",
			"readonly",
			"local",
			"set",
			"unset",
			"shift",
			"source",
			"declare",
			"typeset",
			"eval",
			"exec",
			"trap",
			"echo",
			"printf",
			"cd",
			"pwd"
		];
		const GO_KEYWORDS = [
			"break",
			"case",
			"chan",
			"const",
			"continue",
			"default",
			"defer",
			"else",
			"fallthrough",
			"for",
			"func",
			"go",
			"goto",
			"if",
			"import",
			"interface",
			"map",
			"package",
			"range",
			"return",
			"select",
			"struct",
			"switch",
			"type",
			"var"
		];
		const RUST_KEYWORDS = [
			"as",
			"async",
			"await",
			"break",
			"const",
			"continue",
			"crate",
			"dyn",
			"else",
			"enum",
			"extern",
			"fn",
			"for",
			"if",
			"impl",
			"in",
			"let",
			"loop",
			"match",
			"mod",
			"move",
			"mut",
			"pub",
			"ref",
			"return",
			"self",
			"Self",
			"static",
			"struct",
			"super",
			"trait",
			"type",
			"unsafe",
			"use",
			"where",
			"while"
		];
		const JAVA_KEYWORDS = [
			"abstract",
			"assert",
			"boolean",
			"break",
			"byte",
			"case",
			"catch",
			"char",
			"class",
			"const",
			"continue",
			"default",
			"do",
			"double",
			"else",
			"enum",
			"extends",
			"final",
			"finally",
			"float",
			"for",
			"goto",
			"if",
			"implements",
			"import",
			"instanceof",
			"int",
			"interface",
			"long",
			"native",
			"new",
			"package",
			"private",
			"protected",
			"public",
			"return",
			"short",
			"static",
			"strictfp",
			"super",
			"switch",
			"synchronized",
			"this",
			"throw",
			"throws",
			"transient",
			"try",
			"void",
			"volatile",
			"while"
		];
		const C_KEYWORDS = [
			"auto",
			"break",
			"case",
			"char",
			"const",
			"continue",
			"default",
			"do",
			"double",
			"else",
			"enum",
			"extern",
			"float",
			"for",
			"goto",
			"if",
			"inline",
			"int",
			"long",
			"register",
			"restrict",
			"return",
			"short",
			"signed",
			"sizeof",
			"static",
			"struct",
			"switch",
			"typedef",
			"union",
			"unsigned",
			"void",
			"volatile",
			"while"
		];
		const CPP_KEYWORDS = [
			...C_KEYWORDS,
			"alignas",
			"alignof",
			"and",
			"and_eq",
			"asm",
			"bitand",
			"bitor",
			"bool",
			"catch",
			"class",
			"compl",
			"concept",
			"constexpr",
			"consteval",
			"constinit",
			"decltype",
			"delete",
			"dynamic_cast",
			"explicit",
			"export",
			"friend",
			"mutable",
			"namespace",
			"new",
			"noexcept",
			"not",
			"not_eq",
			"operator",
			"or",
			"or_eq",
			"private",
			"protected",
			"public",
			"reinterpret_cast",
			"requires",
			"static_assert",
			"static_cast",
			"template",
			"this",
			"thread_local",
			"throw",
			"try",
			"typeid",
			"typename",
			"using",
			"virtual",
			"wchar_t",
			"xor",
			"xor_eq"
		];
		/** Registry keyed by the ids changes-lang.ts emits; absent = plain fallback. */
		const SPECS = {
			typescript: {
				keywords: JS_KEYWORDS,
				literals: [
					"true",
					"false",
					"null",
					"undefined",
					"this"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				backtickStrings: true,
				functionStyle: true,
				dollarIdentifiers: true
			},
			json: {
				keywords: [],
				literals: [
					"true",
					"false",
					"null"
				],
				lineComments: [],
				blockComments: []
			},
			python: {
				keywords: PYTHON_KEYWORDS,
				literals: [
					"True",
					"False",
					"None",
					"self"
				],
				lineComments: ["#"],
				blockComments: [],
				tripleQuotes: true,
				functionStyle: true
			},
			shell: {
				keywords: SHELL_KEYWORDS,
				literals: [],
				lineComments: ["#"],
				blockComments: [],
				dollarVariables: true
			},
			ruby: {
				keywords: [
					"alias",
					"and",
					"begin",
					"break",
					"case",
					"class",
					"def",
					"defined",
					"do",
					"else",
					"elsif",
					"end",
					"ensure",
					"for",
					"if",
					"in",
					"module",
					"next",
					"not",
					"or",
					"redo",
					"rescue",
					"retry",
					"return",
					"self",
					"super",
					"then",
					"undef",
					"unless",
					"until",
					"when",
					"while",
					"yield"
				],
				literals: [
					"true",
					"false",
					"nil",
					"self"
				],
				lineComments: ["#"],
				blockComments: [],
				functionStyle: true
			},
			go: {
				keywords: GO_KEYWORDS,
				literals: [
					"true",
					"false",
					"nil"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				backtickStrings: true,
				functionStyle: true
			},
			rust: {
				keywords: RUST_KEYWORDS,
				literals: ["true", "false"],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			java: {
				keywords: JAVA_KEYWORDS,
				literals: [
					"true",
					"false",
					"null",
					"this"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			c: {
				keywords: C_KEYWORDS,
				literals: ["NULL"],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			cpp: {
				keywords: CPP_KEYWORDS,
				literals: [
					"true",
					"false",
					"nullptr",
					"NULL",
					"this"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			csharp: {
				keywords: [
					"abstract",
					"as",
					"base",
					"bool",
					"break",
					"byte",
					"case",
					"catch",
					"char",
					"checked",
					"class",
					"const",
					"continue",
					"decimal",
					"default",
					"delegate",
					"do",
					"double",
					"else",
					"enum",
					"event",
					"explicit",
					"extern",
					"finally",
					"fixed",
					"float",
					"for",
					"foreach",
					"goto",
					"if",
					"implicit",
					"in",
					"int",
					"interface",
					"internal",
					"is",
					"lock",
					"long",
					"namespace",
					"new",
					"object",
					"operator",
					"out",
					"override",
					"params",
					"private",
					"protected",
					"public",
					"readonly",
					"ref",
					"return",
					"sbyte",
					"sealed",
					"short",
					"sizeof",
					"stackalloc",
					"static",
					"string",
					"struct",
					"switch",
					"this",
					"throw",
					"try",
					"typeof",
					"uint",
					"ulong",
					"unchecked",
					"unsafe",
					"ushort",
					"using",
					"virtual",
					"void",
					"volatile",
					"while"
				],
				literals: [
					"true",
					"false",
					"null",
					"this",
					"base"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			kotlin: {
				keywords: [
					"as",
					"break",
					"class",
					"continue",
					"do",
					"else",
					"for",
					"fun",
					"if",
					"in",
					"interface",
					"is",
					"object",
					"package",
					"return",
					"super",
					"this",
					"throw",
					"try",
					"typealias",
					"typeof",
					"val",
					"var",
					"when",
					"while",
					"by",
					"catch",
					"constructor",
					"delegate",
					"dynamic",
					"field",
					"file",
					"finally",
					"get",
					"import",
					"init",
					"param",
					"property",
					"receiver",
					"set",
					"setparam",
					"where",
					"actual",
					"abstract",
					"annotation",
					"companion",
					"const",
					"crossinline",
					"data",
					"enum",
					"expect",
					"external",
					"final",
					"infix",
					"inline",
					"inner",
					"internal",
					"lateinit",
					"noinline",
					"open",
					"operator",
					"out",
					"override",
					"private",
					"protected",
					"public",
					"reified",
					"sealed",
					"suspend",
					"tailrec",
					"vararg",
					"it"
				],
				literals: [
					"true",
					"false",
					"null",
					"this",
					"super"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			swift: {
				keywords: [
					"associatedtype",
					"class",
					"deinit",
					"enum",
					"extension",
					"fileprivate",
					"func",
					"import",
					"init",
					"inout",
					"internal",
					"let",
					"open",
					"operator",
					"private",
					"protocol",
					"public",
					"rethrows",
					"static",
					"struct",
					"subscript",
					"typealias",
					"var",
					"break",
					"case",
					"continue",
					"default",
					"defer",
					"do",
					"else",
					"fallthrough",
					"for",
					"guard",
					"if",
					"in",
					"repeat",
					"return",
					"switch",
					"where",
					"while",
					"as",
					"catch",
					"is",
					"throw",
					"throws",
					"try"
				],
				literals: [
					"true",
					"false",
					"nil",
					"self",
					"Self",
					"super"
				],
				lineComments: ["//"],
				blockComments: [["/*", "*/"]],
				functionStyle: true
			},
			php: {
				keywords: [
					"abstract",
					"and",
					"array",
					"as",
					"break",
					"callable",
					"case",
					"catch",
					"class",
					"clone",
					"const",
					"continue",
					"declare",
					"default",
					"do",
					"echo",
					"else",
					"elseif",
					"empty",
					"enddeclare",
					"endfor",
					"endforeach",
					"endif",
					"endswitch",
					"endwhile",
					"enum",
					"extends",
					"final",
					"finally",
					"fn",
					"for",
					"foreach",
					"function",
					"global",
					"goto",
					"if",
					"implements",
					"include",
					"include_once",
					"instanceof",
					"insteadof",
					"interface",
					"isset",
					"list",
					"match",
					"namespace",
					"new",
					"or",
					"print",
					"private",
					"protected",
					"public",
					"readonly",
					"require",
					"require_once",
					"return",
					"static",
					"switch",
					"throw",
					"trait",
					"try",
					"unset",
					"use",
					"var",
					"while",
					"xor",
					"yield"
				],
				literals: [
					"true",
					"false",
					"null",
					"this"
				],
				lineComments: ["//", "#"],
				blockComments: [["/*", "*/"]],
				dollarVariables: true,
				functionStyle: true
			},
			lua: {
				keywords: [
					"and",
					"break",
					"do",
					"else",
					"elseif",
					"end",
					"for",
					"function",
					"goto",
					"if",
					"in",
					"local",
					"not",
					"or",
					"repeat",
					"return",
					"then",
					"until",
					"while"
				],
				literals: [
					"true",
					"false",
					"nil"
				],
				lineComments: ["--"],
				blockComments: [["--[[", "]]"]]
			},
			yaml: {
				keywords: [],
				literals: [
					"true",
					"false",
					"null",
					"yes",
					"no",
					"on",
					"off"
				],
				lineComments: ["#"],
				blockComments: []
			},
			toml: {
				keywords: [],
				literals: ["true", "false"],
				lineComments: ["#"],
				blockComments: []
			},
			html: {
				keywords: [],
				literals: [],
				lineComments: [],
				blockComments: [["<!--", "-->"]]
			},
			css: {
				keywords: [],
				literals: [],
				lineComments: [],
				blockComments: [["/*", "*/"]]
			},
			sql: {
				keywords: [
					"select",
					"from",
					"where",
					"insert",
					"into",
					"update",
					"delete",
					"create",
					"alter",
					"drop",
					"table",
					"index",
					"view",
					"join",
					"inner",
					"left",
					"right",
					"outer",
					"on",
					"group",
					"by",
					"order",
					"having",
					"limit",
					"offset",
					"as",
					"and",
					"or",
					"not",
					"null",
					"in",
					"is",
					"like",
					"between",
					"union",
					"all",
					"distinct",
					"count",
					"sum",
					"avg",
					"min",
					"max",
					"case",
					"when",
					"then",
					"else",
					"end",
					"values",
					"set",
					"primary",
					"key",
					"foreign",
					"references"
				],
				literals: [
					"true",
					"false",
					"null"
				],
				lineComments: ["--"],
				blockComments: [["/*", "*/"]]
			}
		};
		const RESOLVED = /* @__PURE__ */ new WeakMap();
		function resolveSpec(spec) {
			let resolved = RESOLVED.get(spec);
			if (resolved === void 0) {
				resolved = {
					keywords: new Set(spec.keywords),
					literals: new Set(spec.literals)
				};
				RESOLVED.set(spec, resolved);
			}
			return resolved;
		}
		const IDENT_START = /[A-Za-z_]/;
		const IDENT_START_DOLLAR = /[A-Za-z_$]/;
		const IDENT_PART = /[A-Za-z0-9_]/;
		const IDENT_PART_DOLLAR = /[A-Za-z0-9_$]/;
		const DIGIT = /[0-9]/;
		const HEX = /[0-9a-fA-F]/;
		const BINARY = /[01]/;
		const OCTAL = /[0-7]/;
		/** Match a line comment at i against the spec's prefixes; returns length to end of line. */
		function matchLineComment(line, i, prefixes) {
			for (const p of prefixes) if (line.startsWith(p, i)) return line.length - i;
			return null;
		}
		/** Match a block comment at i; unclosed spans to end of line. */
		function matchBlockComment(line, i, blocks) {
			for (const [open, close] of blocks) if (line.startsWith(open, i)) {
				const end = line.indexOf(close, i + open.length);
				return end === -1 ? line.length - i : end + close.length - i;
			}
			return null;
		}
		/** Match a quoted string at i; honors escapes and triple quotes. */
		function matchString(line, i, spec) {
			const ch = line[i];
			if (spec.tripleQuotes === true && (ch === "'" || ch === "\"")) {
				const triple = ch + ch + ch;
				if (line.startsWith(triple, i)) {
					const end = line.indexOf(triple, i + 3);
					return end === -1 ? line.length - i : end + 3 - i;
				}
			}
			if (ch === "'" || ch === "\"") {
				let j = i + 1;
				while (j < line.length) {
					if (line[j] === "\\") {
						j += 2;
						continue;
					}
					if (line[j] === ch) return j + 1 - i;
					j++;
				}
				return line.length - i;
			}
			if (spec.backtickStrings === true && ch === "`") {
				let j = i + 1;
				while (j < line.length) {
					if (line[j] === "\\") {
						j += 2;
						continue;
					}
					if (line[j] === "`") return j + 1 - i;
					j++;
				}
				return line.length - i;
			}
			return null;
		}
		/** Match a numeric literal at i (int/float/hex/bin/oct). */
		function matchNumber(line, i) {
			const n = line.length;
			if (line[i] === "0" && i + 1 < n) {
				const c = line[i + 1];
				if (c === "x" || c === "X") {
					let j = i + 2;
					while (j < n && HEX.test(line[j])) j++;
					if (j > i + 2) return j - i;
					return null;
				}
				if (c === "b" || c === "B") {
					let j = i + 2;
					while (j < n && BINARY.test(line[j])) j++;
					if (j > i + 2) return j - i;
					return null;
				}
				if (c === "o" || c === "O") {
					let j = i + 2;
					while (j < n && OCTAL.test(line[j])) j++;
					if (j > i + 2) return j - i;
					return null;
				}
			}
			let j = i;
			let hasDigit = false;
			while (j < n && DIGIT.test(line[j])) {
				j++;
				hasDigit = true;
			}
			if (j < n && line[j] === ".") {
				let k = j + 1;
				let hasFrac = false;
				while (k < n && DIGIT.test(line[k])) {
					k++;
					hasFrac = true;
				}
				if (hasFrac) j = k;
			}
			if (j < n && (line[j] === "e" || line[j] === "E")) {
				let k = j + 1;
				if (k < n && (line[k] === "+" || line[k] === "-")) k++;
				let hasExp = false;
				while (k < n && DIGIT.test(line[k])) {
					k++;
					hasExp = true;
				}
				if (hasExp) j = k;
			}
			return hasDigit ? j - i : null;
		}
		/** Match a shell/php variable at i ($name, ${name}, $1, $?). Caller ensures line[i] is $. */
		function matchDollarVariable(line, i) {
			const n = line.length;
			if (i + 1 < n && line[i + 1] === "{") {
				const end = line.indexOf("}", i + 2);
				return end === -1 ? n - i : end + 1 - i;
			}
			if (i + 1 < n && IDENT_START.test(line[i + 1])) {
				let j = i + 2;
				while (j < n && IDENT_PART.test(line[j])) j++;
				return j - i;
			}
			return i + 1 < n ? 2 : 1;
		}
		/** Match an identifier at i, classifying keyword / literal / function. */
		function matchWord(line, i, spec) {
			const start = spec.dollarIdentifiers === true ? IDENT_START_DOLLAR : IDENT_START;
			const part = spec.dollarIdentifiers === true ? IDENT_PART_DOLLAR : IDENT_PART;
			if (!start.test(line[i])) return null;
			let j = i + 1;
			while (j < line.length && part.test(line[j])) j++;
			const word = line.slice(i, j);
			const len = j - i;
			const resolved = resolveSpec(spec);
			if (resolved.keywords.has(word)) return {
				len,
				kind: "keyword"
			};
			if (resolved.literals.has(word)) return {
				len,
				kind: "literal"
			};
			if (spec.functionStyle === true) {
				let k = j;
				while (k < line.length && line[k] === " ") k++;
				if (k < line.length && line[k] === "(") return {
					len,
					kind: "function"
				};
			}
			return {
				len,
				kind: "plain"
			};
		}
		/**
		* Classify one source line into token spans for `lang`. A language not in
		* {@link SPECS} (or undefined) returns a single plain span; scanning is
		* line-local, so block-comment state does not cross lines (acceptable for a
		* diff, which shows individual + and - lines).
		* @param line - the source text of one diff line.
		* @param lang - the language hint from changes-lang.ts (or undefined).
		* @returns the token spans (always at least one).
		*/
		function highlightLine(line, lang) {
			const spec = lang === void 0 ? void 0 : SPECS[lang];
			if (spec === void 0) return [{
				text: line,
				kind: "plain"
			}];
			const tokens = [];
			let plain = "";
			let i = 0;
			const n = line.length;
			const flush = () => {
				if (plain !== "") {
					tokens.push({
						text: plain,
						kind: "plain"
					});
					plain = "";
				}
			};
			while (i < n) {
				let matched = null;
				const comment = matchLineComment(line, i, spec.lineComments);
				if (comment !== null) matched = {
					len: comment,
					kind: "comment"
				};
				if (matched === null && spec.blockComments.length > 0) {
					const bc = matchBlockComment(line, i, spec.blockComments);
					if (bc !== null) matched = {
						len: bc,
						kind: "comment"
					};
				}
				if (matched === null) {
					const s = matchString(line, i, spec);
					if (s !== null) matched = {
						len: s,
						kind: "string"
					};
				}
				if (matched === null && spec.dollarVariables === true && line[i] === "$") matched = {
					len: matchDollarVariable(line, i),
					kind: "variable"
				};
				if (matched === null) {
					const num = matchNumber(line, i);
					if (num !== null) matched = {
						len: num,
						kind: "number"
					};
				}
				if (matched === null) {
					const word = matchWord(line, i, spec);
					if (word !== null) matched = word;
				}
				if (matched === null) {
					plain += line[i];
					i++;
				} else if (matched.kind === "plain") {
					plain += line.slice(i, i + matched.len);
					i += matched.len;
				} else {
					flush();
					tokens.push({
						text: line.slice(i, i + matched.len),
						kind: matched.kind
					});
					i += matched.len;
				}
			}
			flush();
			return tokens;
		}
		//#endregion
		//#region src/client/changes-lang.ts
		/**
		* File-extension -> syntax-highlighting language hints for the Changes diff.
		* Covers the well-known code extensions the diff always highlights; the ids
		* are the spec keys ./changes-highlight.ts resolves (ts->typescript, py->python,
		* sh->shell, ...). Unknown or non-code extensions yield undefined and the
		* diff renders plain monospace - never an error.
		* @module @deepseek-ai/dsh-client-ui-changes/client
		*/
		/** Extension (without dot, lower-cased) -> language hint. */
		const LANG_BY_EXTENSION = {
			ts: "typescript",
			tsx: "typescript",
			mts: "typescript",
			cts: "typescript",
			js: "typescript",
			jsx: "typescript",
			mjs: "typescript",
			cjs: "typescript",
			json: "json",
			jsonc: "json",
			py: "python",
			sh: "shell",
			bash: "shell",
			zsh: "shell",
			rb: "ruby",
			go: "go",
			rs: "rust",
			java: "java",
			c: "c",
			h: "c",
			cc: "cpp",
			cpp: "cpp",
			cxx: "cpp",
			hpp: "cpp",
			hh: "cpp",
			cs: "csharp",
			kt: "kotlin",
			kts: "kotlin",
			swift: "swift",
			php: "php",
			lua: "lua",
			yaml: "yaml",
			yml: "yaml",
			toml: "toml",
			html: "html",
			htm: "html",
			xml: "html",
			xhtml: "html",
			css: "css",
			scss: "css",
			less: "css",
			sql: "sql"
		};
		/**
		* Derive a syntax-highlighting language hint from a path's file extension.
		* Pure and case-insensitive on the extension; a dotfile with no extension
		* ('.gitignore') and an unknown extension both yield undefined (plain
		* monospace in the diff - never an error).
		* @param path - the model-facing path of the changed file.
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
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-changes/src/client/ChangesView.module.css.mjs
		const css = ".PZ4YaG_view{width:100%;max-width:var(--dsh-chat-content-width);box-sizing:border-box;flex-direction:column;gap:12px;margin:0 auto;padding:16px;display:flex}.PZ4YaG_empty{color:var(--dsh-text-secondary,#8b949e);padding:24px 16px;font-size:14px}.PZ4YaG_older{border:1px solid var(--dsh-border,#30363d);color:inherit;cursor:pointer;background:0 0;border-radius:6px;align-self:flex-start;padding:4px 12px;font-size:13px}.PZ4YaG_older:disabled{opacity:.6;cursor:default}.PZ4YaG_summary{color:var(--dsh-text-secondary,#8b949e);font-size:12px}.PZ4YaG_file{border:1px solid var(--dsh-border,#30363d);border-radius:8px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.PZ4YaG_fileHeader{align-items:center;gap:8px;min-width:0;display:flex}.PZ4YaG_badge{background:var(--dsh-badge-bg,#7f7f7f29);color:var(--dsh-text-secondary,#8b949e);border-radius:10px;flex:none;padding:1px 8px;font-size:11px;line-height:18px}.PZ4YaG_path{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex:1;font-size:12px;overflow:hidden}.PZ4YaG_degraded{color:var(--dsh-warning,#d29922);cursor:help;flex:none;font-size:12px}.PZ4YaG_fileFooter{color:var(--dsh-text-secondary,#8b949e);font-size:11px}.PZ4YaG_diff{border:1px solid var(--dsh-border,#30363d);border-radius:6px;position:relative;overflow:hidden}.PZ4YaG_copyButton{z-index:1;border:1px solid var(--dsh-border,#30363d);background:var(--dsh-surface,#0d1117);color:var(--dsh-text-secondary,#8b949e);cursor:pointer;opacity:.85;border-radius:4px;padding:2px 8px;font-size:11px;position:absolute;top:8px;right:8px}.PZ4YaG_copyButton:hover{opacity:1}.PZ4YaG_body{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex-direction:column;font-size:12px;line-height:1.5;display:flex;position:relative}.PZ4YaG_line{white-space:pre-wrap;word-break:break-word;padding:0 10px}.PZ4YaG_ctx{color:var(--dsh-text-secondary,#8b949e)}.PZ4YaG_del:before{content:\"- \";color:var(--dsh-diff-del-sign,#f85149)}.PZ4YaG_del{background-color:var(--dsh-diff-del-bg,#f851492e);color:var(--dsh-diff-del-fg,#ffa198)}.PZ4YaG_add:before{content:\"+ \";color:var(--dsh-diff-add-sign,#3fb950)}.PZ4YaG_add{background-color:var(--dsh-diff-add-bg,#3fb9502e);color:var(--dsh-diff-add-fg,#7ee787)}.PZ4YaG_gap{text-align:center;color:var(--dsh-text-secondary,#8b949e);user-select:none;padding:0}.PZ4YaG_expand{color:var(--dsh-text-secondary,#8b949e);cursor:pointer;text-align:left;background:0 0;border:none;padding:2px 10px;font-size:12px}.PZ4YaG_expand:hover{color:inherit}.PZ4YaG_footer{border-top:1px solid var(--dsh-border,#30363d);color:var(--dsh-text-secondary,#8b949e);padding:4px 10px;font-size:11px}.PZ4YaG_tokComment{color:#8b949e;font-style:italic}.PZ4YaG_tokString{color:#a5d6ff}.PZ4YaG_tokKeyword{color:#ff7b72}.PZ4YaG_tokLiteral,.PZ4YaG_tokNumber{color:#79c0ff}.PZ4YaG_tokFunction{color:#d2a8ff}.PZ4YaG_tokVariable{color:#ffa657}";
		const tagId = "@deepseek-ai/dsh-client-ui-changes/ChangesView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-changes";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ChangesView_module_css_default = {
			"add": "PZ4YaG_add",
			"badge": "PZ4YaG_badge",
			"body": "PZ4YaG_body",
			"copyButton": "PZ4YaG_copyButton",
			"ctx": "PZ4YaG_ctx",
			"degraded": "PZ4YaG_degraded",
			"del": "PZ4YaG_del",
			"diff": "PZ4YaG_diff",
			"empty": "PZ4YaG_empty",
			"expand": "PZ4YaG_expand",
			"file": "PZ4YaG_file",
			"fileFooter": "PZ4YaG_fileFooter",
			"fileHeader": "PZ4YaG_fileHeader",
			"footer": "PZ4YaG_footer",
			"gap": "PZ4YaG_gap",
			"line": "PZ4YaG_line",
			"older": "PZ4YaG_older",
			"path": "PZ4YaG_path",
			"summary": "PZ4YaG_summary",
			"tokComment": "PZ4YaG_tokComment",
			"tokFunction": "PZ4YaG_tokFunction",
			"tokKeyword": "PZ4YaG_tokKeyword",
			"tokLiteral": "PZ4YaG_tokLiteral",
			"tokNumber": "PZ4YaG_tokNumber",
			"tokString": "PZ4YaG_tokString",
			"tokVariable": "PZ4YaG_tokVariable",
			"view": "PZ4YaG_view"
		};
		/** Localized diff-card chrome, mirroring the chat row's label split. */
		function diffLabels(t) {
			return {
				copy: t("diff.copy"),
				copied: t("diff.copied"),
				collapseAria: t("diff.collapseAria"),
				expandAria: (hidden) => t("diff.expandAria", { hidden }),
				collapse: t("diff.collapse"),
				expand: (hidden) => t("diff.expand", { hidden }),
				files: (count) => t("diff.files", { count })
			};
		}
		/** The dim class per row kind (gap chrome vs the diff's own +/- colors). */
		const ROW_CLASS = {
			ctx: ChangesView_module_css_default.ctx,
			del: ChangesView_module_css_default.del,
			add: ChangesView_module_css_default.add,
			gap: ChangesView_module_css_default.gap
		};
		/** Token kind -> CSS class; plain inherits the line's color. */
		const TOKEN_CLASS = {
			comment: ChangesView_module_css_default.tokComment,
			string: ChangesView_module_css_default.tokString,
			keyword: ChangesView_module_css_default.tokKeyword,
			literal: ChangesView_module_css_default.tokLiteral,
			number: ChangesView_module_css_default.tokNumber,
			function: ChangesView_module_css_default.tokFunction,
			variable: ChangesView_module_css_default.tokVariable,
			plain: void 0
		};
		/** Render one diff body row, highlighting code when the language is known. */
		function Row({ row }) {
			const cls = ROW_CLASS[row.kind];
			if (row.kind === "gap") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ChangesView_module_css_default.line + " " + cls,
				children: "⋯"
			});
			if (row.kind === "ctx") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ChangesView_module_css_default.line + " " + cls,
				children: row.text
			});
			const tokens = row.tokens;
			if (tokens.length === 1 && tokens[0].kind === "plain") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ChangesView_module_css_default.line + " " + cls,
				children: row.text
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ChangesView_module_css_default.line + " " + cls,
				children: tokens.map((token, index) => {
					const tokenCls = TOKEN_CLASS[token.kind];
					return tokenCls === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: token.text }, index) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: tokenCls,
						children: token.text
					}, index);
				})
			});
		}
		/**
		* Aligned net diff surface: renders the LCS-computed change regions with
		* context, the same head/tail cap arithmetic as the primitives' DiffBlock.
		*/
		function NetDiff({ before, after, path, labels, maxLines = 16 }) {
			const rows = (0, react.useMemo)(() => computeNetDiff(before, after), [before, after]);
			const display = (0, react.useMemo)(() => {
				const lang = langFromPath(path);
				return rows.map((row) => {
					if (row.kind === "del") return {
						kind: "del",
						text: row.text,
						tokens: highlightLine(row.text, lang)
					};
					if (row.kind === "add") return {
						kind: "add",
						text: row.text,
						tokens: highlightLine(row.text, lang)
					};
					return row;
				});
			}, [rows, path]);
			const summary = (0, react.useMemo)(() => summarizeRows(rows), [rows]);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [copied, setCopied] = (0, react.useState)(false);
			const onCopy = (0, react.useCallback)(() => {
				if (copied) return;
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(rowsToText(rows)).then((ok) => {
					if (!ok) return;
					setCopied(true);
					window.setTimeout(() => {
						setCopied(false);
					}, 1e3);
				});
			}, [copied, rows]);
			const onToggle = (0, react.useCallback)(() => {
				setExpanded((value) => !value);
			}, []);
			if (rows.length === 0) return null;
			const hidden = rows.length - maxLines;
			const capped = hidden > 0 && !expanded;
			const headLines = Math.ceil(maxLines / 2);
			const tailLines = maxLines - headLines;
			const head = capped ? display.slice(0, headLines) : display;
			const tail = capped ? display.slice(display.length - tailLines) : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ChangesView_module_css_default.diff,
				"data-net-diff": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: ChangesView_module_css_default.copyButton,
						onClick: onCopy,
						children: copied ? labels.copied : labels.copy
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ChangesView_module_css_default.body,
						children: [
							head.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { row }, index)),
							hidden > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ChangesView_module_css_default.expand,
								onClick: onToggle,
								"aria-expanded": expanded,
								children: expanded ? labels.collapse : labels.expand(hidden)
							}),
							tail.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { row }, index))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ChangesView_module_css_default.footer,
						children: [
							"└ +",
							summary.added,
							" -",
							summary.removed
						]
					})
				]
			});
		}
		function fileFooter(t, file) {
			const when = new Date(file.lastTime).toLocaleTimeString();
			return `${t("entry.turn", { turn: file.lastTurn })} · ${when}`;
		}
		function ChangesView({ useSession, useChanges, loadOlder, t }) {
			const snapshot = useChanges((value) => value);
			const hasMore = useSession((value) => value.hasMore);
			const loadingOlder = useSession((value) => value.loadingOlder);
			const labels = diffLabels(t);
			const files = snapshot.files;
			if (files.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ChangesView_module_css_default.empty,
				children: t("empty.noChanges")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ChangesView_module_css_default.view,
				children: [
					hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: ChangesView_module_css_default.older,
						disabled: loadingOlder,
						onClick: () => {
							loadOlder();
						},
						children: loadingOlder ? t("older.loading") : t("older.load")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
						className: ChangesView_module_css_default.summary,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summary.files", { count: files.length }) })
					}),
					files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: ChangesView_module_css_default.file,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: ChangesView_module_css_default.fileHeader,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ChangesView_module_css_default.badge,
										children: file.status === "created" ? t("status.created") : t("status.modified")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ChangesView_module_css_default.path,
										title: file.path,
										children: file.path
									}),
									file.degraded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ChangesView_module_css_default.degraded,
										title: t("entry.approximated"),
										children: "≈"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NetDiff, {
								before: file.before,
								after: file.after,
								path: file.path,
								labels
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("footer", {
								className: ChangesView_module_css_default.fileFooter,
								children: fileFooter(t, file)
							})
						]
					}, file.path))
				]
			});
		}
		//#endregion
		//#region src/client/changes-definition.ts
		/** Tools whose results carry the contextual-diff `meta` payload. */
		const FILE_TOOLS = /* @__PURE__ */ new Set(["edit", "write"]);
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
		/** Extract a settled result from a `tool/result` match. */
		function resultFromMatch(match) {
			if (match.event.type !== "tool/result") return null;
			return {
				seq: match.event.seq,
				time: match.event.time,
				turn: match.event.data.turn,
				step: match.event.data.step,
				hunks: narrowDiffs(match.event.data.meta),
				...match.event.data.error === void 0 ? {} : { error: match.event.data.error }
			};
		}
		/**
		* Parse a tool call's raw arguments JSON into the fields the Changes view
		* needs; null when the arguments are unusable.
		* @param name - the tool name (write content is only read for `write`).
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
			const filePath = typeof record.file_path === "string" ? record.file_path : void 0;
			if (filePath === void 0) return null;
			return {
				filePath,
				content: name === "write" && typeof record.content === "string" ? record.content : void 0
			};
		}
		/** Turn number of a matched event, derived from its resolved Session location. */
		function locationTurn(match) {
			return match.location.kind === "step" || match.location.kind === "turn" ? match.location.turn.turn : 0;
		}
		/** Step number of a matched event, derived from its resolved Session location. */
		function locationStep(match) {
			return match.location.kind === "step" ? match.location.step.step : 0;
		}
		/**
		* Extract path/content from a code-dispatch's already-parsed arguments object
		* (PTC mode logs `arguments` as JSON, not the raw string `tool/call` carries).
		*/
		function parseDispatchArgs(name, args) {
			if (typeof args !== "object" || args === null || Array.isArray(args)) return null;
			const record = args;
			const filePath = typeof record.file_path === "string" ? record.file_path : void 0;
			if (filePath === void 0) return null;
			return {
				filePath,
				content: name === "write" && typeof record.content === "string" ? record.content : void 0
			};
		}
		/**
		* Reconstruct one intended file mutation from a nested PTC-mode dispatch's
		* call arguments (PTC mode logs no result `meta`).
		*/
		function dispatchResult(match) {
			if (match.event.type !== "tool/code-dispatch") return null;
			if (match.event.data.isError === true) return null;
			const name = match.event.data.name;
			const args = match.event.data.arguments;
			if (typeof args !== "object" || args === null || Array.isArray(args)) return null;
			const record = args;
			const path = record.file_path;
			if (typeof path !== "string" || path.trim() === "") return null;
			if (name === "write") return {
				seq: match.event.seq,
				time: match.event.time,
				turn: locationTurn(match),
				step: locationStep(match),
				hunks: null
			};
			if (name !== "edit") return null;
			const oldText = record.old_string;
			const newText = record.new_string;
			const replaceAll = record.replace_all;
			if (typeof oldText !== "string" || typeof newText !== "string") return null;
			if (replaceAll !== void 0 && typeof replaceAll !== "boolean") return null;
			return {
				seq: match.event.seq,
				time: match.event.time,
				turn: locationTurn(match),
				step: locationStep(match),
				hunks: [{
					path,
					oldText: oldText || null,
					newText
				}]
			};
		}
		/** State adopted when the window opened inside a result (call head outside). */
		function fallbackState(context) {
			for (const match of context.matches) {
				if (match.event.type === "tool/result") {
					const result = resultFromMatch(match);
					if (result === null || result.hunks === null) continue;
					return {
						callId: String(match.event.data.message.source.callId),
						tool: null,
						args: null,
						result
					};
				}
				if (match.event.type === "tool/code-dispatch") {
					const result = dispatchResult(match);
					if (result === null || result.hunks === null) continue;
					return {
						callId: String(match.event.data.subCallId),
						tool: match.event.data.name,
						args: null,
						result
					};
				}
			}
		}
		/** Project the applied mutation, or null while the call is pending, failed, or unknowable. */
		function mutationFor(context, state) {
			const result = state.result;
			if (result === null || result.error !== void 0) return null;
			if (result.hunks === null) {
				if (state.tool !== "write" || state.args?.filePath === void 0 || state.args.content === void 0) return null;
				return {
					key: context.key,
					callId: state.callId,
					tool: state.tool,
					seq: result.seq,
					time: result.time,
					turn: result.turn,
					step: result.step,
					path: state.args.filePath,
					kind: "create",
					content: state.args.content
				};
			}
			const path = result.hunks[0]?.path;
			if (path === void 0) return null;
			return {
				key: context.key,
				callId: state.callId,
				tool: state.tool,
				seq: result.seq,
				time: result.time,
				turn: result.turn,
				step: result.step,
				path,
				kind: "hunks",
				hunks: result.hunks
			};
		}
		/** Wrap one mutation in the Engine-owned target envelope. */
		function changesNode(context, anchorSeq, mutation) {
			return {
				key: context.key,
				kind: context.kind,
				id: context.id,
				target: "changes",
				anchorSeq,
				location: context.start?.location ?? { kind: "unresolved" },
				data: {
					kind: "change",
					mutation
				}
			};
		}
		/** Changes-owned lifecycle: start on an edit/write call, settle on its result. */
		const changesDefinition = {
			kind: "changes-result",
			target: "changes",
			match: (event) => {
				if (event.type === "tool/call") return FILE_TOOLS.has(event.data.name) ? {
					id: String(event.data.callId),
					role: "start"
				} : null;
				if (event.type === "tool/result") return {
					id: String(event.data.message.source.callId),
					role: "update"
				};
				if (event.type === "tool/code-dispatch-start" || event.type === "tool/code-dispatch") {
					if (!FILE_TOOLS.has(event.data.name)) return null;
					const role = event.type === "tool/code-dispatch-start" ? "start" : "update";
					return {
						id: String(event.data.subCallId),
						role
					};
				}
				return null;
			},
			start: (_context, match) => {
				if (match.event.type === "tool/call") return {
					callId: String(match.event.data.callId),
					tool: match.event.data.name,
					args: parseArgs(match.event.data.name, match.event.data.arguments),
					result: null
				};
				if (match.event.type === "tool/code-dispatch-start") return {
					callId: String(match.event.data.subCallId),
					tool: match.event.data.name,
					args: parseDispatchArgs(match.event.data.name, match.event.data.arguments),
					result: null
				};
				throw new Error("changes-result start requires tool/call or tool/code-dispatch-start");
			},
			update: (context, match) => {
				if (match.event.type === "tool/result") {
					const result = resultFromMatch(match);
					if (result === null) return context.state;
					if (context.state.tool !== "write" && result.hunks === null) return context.state;
					return {
						...context.state,
						result
					};
				}
				if (match.event.type === "tool/code-dispatch") {
					const result = dispatchResult(match);
					if (result === null) return context.state;
					if (context.state.tool !== "write" && result.hunks === null) return context.state;
					return {
						...context.state,
						result
					};
				}
				return context.state;
			},
			buildViewNode: (context) => {
				const state = context.state ?? fallbackState(context);
				if (state === void 0) return null;
				const mutation = mutationFor(context, state);
				if (mutation === null) return null;
				return changesNode(context, context.start?.event.seq ?? mutation.seq, mutation);
			}
		};
		/**
		* Register the Changes lifecycle.
		* @param ctx - Plugin context receiving the Definition.
		*/
		function registerChangesDefinition(ctx) {
			ctx.uiConversation.events.register(changesDefinition);
		}
		//#endregion
		//#region src/client/changes-contract.ts
		/** Stable empty snapshot used before a Session has assembled Changes records. */
		const EMPTY_CHANGES_SNAPSHOT = { files: [] };
		//#endregion
		//#region src/client/changes-reconstruct.ts
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
		* Fold `mutations` (ascending seq) into one file's net difference. The first
		* content seeds both documents; later hunks replace in place when their
		* context anchors, and append as standalone regions otherwise (flagged
		* `degraded`). A write-create resets to the whole-file content.
		* @param path - the file's model-facing path.
		* @param mutations - the file's mutations, any order (sorted by seq here).
		* @returns the reconstructed net difference.
		*/
		function reconstructFile(path, mutations) {
			const sorted = [...mutations].sort((left, right) => left.seq - right.seq);
			let baseline = [];
			let doc = [];
			let status = "modified";
			let degraded = false;
			let last;
			for (const mutation of sorted) {
				if (mutation.kind === "create") {
					doc = contentLines(mutation.content ?? "");
					baseline = [];
					status = "created";
					last = mutation;
					continue;
				}
				for (const hunk of mutation.hunks ?? []) {
					const oldLines = contentLines(hunk.oldText ?? "");
					const newLines = contentLines(hunk.newText);
					if (doc.length === 0 && baseline.length === 0) {
						baseline = oldLines.slice();
						doc = newLines.slice();
					} else {
						const index = indexOfLines(doc, oldLines);
						if (index === -1) {
							degraded = true;
							baseline.push(...oldLines);
							doc.push(...newLines);
						} else doc.splice(index, oldLines.length, ...newLines);
					}
				}
				last = mutation;
			}
			return {
				path,
				status,
				before: joinLines(baseline),
				after: joinLines(doc),
				lastSeq: last?.seq ?? 0,
				lastTime: last?.time ?? 0,
				lastTurn: last?.turn ?? 0,
				degraded
			};
		}
		//#endregion
		//#region src/client/changes-snapshot-builder.ts
		/** Aggregate per-file mutations into the published net snapshot. */
		var ChangesSnapshotBuilder = class {
			mutations = /* @__PURE__ */ new Map();
			empty = EMPTY_CHANGES_SNAPSHOT;
			replace(input) {
				this.mutations.clear();
				for (const node of input.nodes) this.mutations.set(node.key, node.data.mutation);
				return this.snapshot();
			}
			apply(input) {
				for (const node of input.upserts) this.mutations.set(node.key, node.data.mutation);
				return this.snapshot();
			}
			snapshot() {
				const byPath = /* @__PURE__ */ new Map();
				for (const mutation of this.mutations.values()) {
					const list = byPath.get(mutation.path);
					if (list === void 0) byPath.set(mutation.path, [mutation]);
					else list.push(mutation);
				}
				return { files: [...byPath.entries()].map(([path, mutations]) => reconstructFile(path, mutations)).sort((left, right) => right.lastSeq - left.lastSeq) };
			}
		};
		/** Changes target factory preserving the cumulative net-difference view model. */
		const changesViewDefinition = {
			target: "changes",
			create: () => new ChangesSnapshotBuilder()
		};
		/**
		* Register the Changes target builder.
		* @param ctx - Plugin context receiving the view Definition.
		*/
		function registerChangesConversationView(ctx) {
			ctx.uiConversation.views.register(changesViewDefinition);
		}
		//#endregion
		//#region src/client/locales.ts
		/** `changes` namespace dictionaries for the Changes view surface. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "changes";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"view.changes": "变更",
			"empty.noChanges": "本会话尚未产生文件变更。",
			"summary.files": "{count} 个文件",
			"older.load": "加载更早的变更",
			"older.loading": "正在加载…",
			"status.created": "新建",
			"status.modified": "已修改",
			"entry.turn": "第 {turn} 轮",
			"entry.approximated": "部分区域按变更顺序近似合并（无法精确锚定）",
			"diff.copy": "复制",
			"diff.copied": "已复制",
			"diff.collapse": "收起",
			"diff.collapseAria": "收起差异",
			"diff.expand": "展开（隐藏 {hidden} 行）",
			"diff.expandAria": "展开差异（隐藏 {hidden} 行）",
			"diff.files": "{count} 个文件"
		};
		/** English dictionary, checked complete against the Chinese source of truth. */
		const en = {
			"view.changes": "Changes",
			"empty.noChanges": "No file changes in this session yet.",
			"summary.files": "{count} files",
			"older.load": "Load earlier changes",
			"older.loading": "Loading…",
			"status.created": "Created",
			"status.modified": "Modified",
			"entry.turn": "Turn {turn}",
			"entry.approximated": "Some regions merged in change order (could not be anchored exactly)",
			"diff.copy": "Copy",
			"diff.copied": "Copied",
			"diff.collapse": "Collapse",
			"diff.collapseAria": "Collapse diff",
			"diff.expand": "Expand ({hidden} hidden lines)",
			"diff.expandAria": "Expand diff ({hidden} hidden lines)",
			"diff.files": "{count} files"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the conversation slot, registries, ordinary Session paging, and the locale service. */
		const inject = [
			"slots",
			"sessions",
			"uiSession",
			"uiConversation",
			"locale"
		];
		/**
		* Client plugin body: register the Changes view tab. The registration rides the
		* slot service's effect wrapper, so plugin unload removes the tab.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const changesSources = /* @__PURE__ */ new WeakMap();
			const changesSource = (binding) => {
				let source = changesSources.get(binding);
				if (source === void 0) {
					const target = ctx.uiConversation.binding(binding).target("changes");
					source = {
						getSnapshot: () => target.getSnapshot() ?? EMPTY_CHANGES_SNAPSHOT,
						subscribe: (listener) => target.subscribe(listener)
					};
					changesSources.set(binding, source);
				}
				return source;
			};
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-changes: dictionaries");
			const t = ctx.locale.bind(NS);
			registerChangesConversationView(ctx);
			registerChangesDefinition(ctx);
			ctx.uiSession.provide({
				hooks: ["changes"],
				resolve: (binding) => ({ hooks: { changes: changesSource(binding) } })
			});
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "changes",
				order: 21,
				locale: NS,
				label: () => t("view.changes"),
				children: {},
				inject: (sessionId) => {
					const session = ctx.sessions.binding(sessionId)?.session;
					if (session === void 0) throw new Error(`ui-changes: session "${sessionId}" is unavailable`);
					const target = ctx.uiConversation.binding(sessionId).target("changes");
					return { loadOlder: async () => {
						const before = target.getSnapshot();
						await session.loadOlder();
						return target.getSnapshot() !== before;
					} };
				}
			}, ChangesView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map