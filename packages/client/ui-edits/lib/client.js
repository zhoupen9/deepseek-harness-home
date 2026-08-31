window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-edits",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/edits-highlight.ts
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
		/** Registry keyed by the ids edits-lang.ts emits; absent = plain fallback. */
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
		* @param lang - the language hint from edits-lang.ts (or undefined).
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
		//#region src/client/edits-lang.ts
		/**
		* File-extension -> syntax-highlighting language hints for the Edits diff.
		* Covers the well-known code extensions the diff always highlights; the ids
		* are the spec keys ./edits-highlight.ts resolves (ts->typescript, py->python,
		* sh->shell, ...). Unknown or non-code extensions yield undefined and the
		* diff renders plain monospace - never an error.
		* @module @deepseek-ai/dsh-client-ui-edits/client
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
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-edits/src/client/EditsDiff.module.css.mjs
		const css$1 = ".Q3Rw_G_block{color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-markdown-code-block,#f6f8fa);border:1px solid var(--dsw-alias-border-l2,#0000001a);border-radius:8px;margin:8px 0;position:relative;overflow:hidden}.Q3Rw_G_copyButton{z-index:1;color:var(--dsw-alias-label-secondary,#59636e);cursor:pointer;background:0 0;border:none;margin:0;padding:0;font-size:12px;line-height:18px;position:absolute;top:6px;right:12px}.Q3Rw_G_copyButton:hover{color:var(--dsw-alias-label-primary,#1f2328)}.Q3Rw_G_body{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);padding:8px 12px;font-size:12px;line-height:20px;overflow:auto hidden}.Q3Rw_G_line{white-space:pre;min-height:20px}.Q3Rw_G_path{color:var(--dsw-alias-label-primary,#1f2328);padding-right:56px;font-weight:600}.Q3Rw_G_gap{color:var(--dsw-alias-label-tertiary,#59636e)}.Q3Rw_G_del:before{content:\"- \";color:var(--dsw-alias-state-error-primary,#d1242f)}.Q3Rw_G_del{background-color:color-mix(in srgb, var(--dsw-alias-state-error-primary,#d1242f) 14%, transparent);color:var(--dsw-alias-state-error-primary,#d1242f)}.Q3Rw_G_add:before{content:\"+ \";color:var(--dsw-alias-state-success-primary,#1a7f37)}.Q3Rw_G_add{background-color:color-mix(in srgb, var(--dsw-alias-state-success-primary,#1a7f37) 14%, transparent);color:var(--dsw-alias-state-success-primary,#1a7f37)}.Q3Rw_G_expand{width:100%;color:var(--dsw-alias-label-tertiary,#59636e);cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;padding:0;display:block}.Q3Rw_G_expand:hover{color:var(--dsw-alias-label-secondary,#59636e)}.Q3Rw_G_footer{font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-tertiary,#59636e);padding:4px 12px 8px;font-size:12px}.Q3Rw_G_tokComment{color:var(--shiki-token-comment,#868e96);font-style:italic}.Q3Rw_G_tokString{color:var(--shiki-token-string,#2f9e44)}.Q3Rw_G_tokKeyword{color:var(--shiki-token-keyword,#d6336c)}.Q3Rw_G_tokLiteral,.Q3Rw_G_tokNumber{color:var(--shiki-token-constant,#1c7ed6)}.Q3Rw_G_tokFunction{color:var(--shiki-token-function,#6741d9)}.Q3Rw_G_tokVariable{color:var(--shiki-token-parameter,#e8590c)}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-edits/EditsDiff.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-edits";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var EditsDiff_module_css_default = {
			"add": "Q3Rw_G_add",
			"block": "Q3Rw_G_block",
			"body": "Q3Rw_G_body",
			"copyButton": "Q3Rw_G_copyButton",
			"del": "Q3Rw_G_del",
			"expand": "Q3Rw_G_expand",
			"footer": "Q3Rw_G_footer",
			"gap": "Q3Rw_G_gap",
			"line": "Q3Rw_G_line",
			"path": "Q3Rw_G_path",
			"tokComment": "Q3Rw_G_tokComment",
			"tokFunction": "Q3Rw_G_tokFunction",
			"tokKeyword": "Q3Rw_G_tokKeyword",
			"tokLiteral": "Q3Rw_G_tokLiteral",
			"tokNumber": "Q3Rw_G_tokNumber",
			"tokString": "Q3Rw_G_tokString",
			"tokVariable": "Q3Rw_G_tokVariable"
		};
		/** Split a side's text into content lines (empty text = zero lines; a trailing newline is a terminator). */
		function contentLines(text) {
			if (text === "") return [];
			return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n");
		}
		/** Flatten hunks into rows, highlighting code lines by the file's language hint. */
		function buildRows(diffs) {
			const rows = [];
			const paths = /* @__PURE__ */ new Set();
			let added = 0;
			let removed = 0;
			let prevPath;
			for (const diff of diffs) {
				paths.add(diff.path);
				if (diff.path !== prevPath) rows.push({
					kind: "path",
					text: diff.path
				});
				else rows.push({
					kind: "gap",
					text: "⋯"
				});
				prevPath = diff.path;
				const lang = langFromPath(diff.path);
				if (diff.oldText !== null) for (const line of contentLines(diff.oldText)) {
					rows.push({
						kind: "del",
						text: line,
						tokens: highlightLine(line, lang)
					});
					removed++;
				}
				for (const line of contentLines(diff.newText)) {
					rows.push({
						kind: "add",
						text: line,
						tokens: highlightLine(line, lang)
					});
					added++;
				}
			}
			return {
				rows,
				added,
				removed,
				files: paths.size
			};
		}
		/** The plain-text diff a reader copies: each row's -/+/path prefix plus its content. */
		function copyText(rows) {
			return rows.map((row) => {
				switch (row.kind) {
					case "del": return "- " + row.text;
					case "add": return "+ " + row.text;
					case "path": return row.text;
					case "gap": return row.text;
				}
			}).join("\n");
		}
		/** Token kind -> CSS class; plain inherits the line's color. */
		const TOKEN_CLASS = {
			comment: EditsDiff_module_css_default.tokComment,
			string: EditsDiff_module_css_default.tokString,
			keyword: EditsDiff_module_css_default.tokKeyword,
			literal: EditsDiff_module_css_default.tokLiteral,
			number: EditsDiff_module_css_default.tokNumber,
			function: EditsDiff_module_css_default.tokFunction,
			variable: EditsDiff_module_css_default.tokVariable,
			plain: void 0
		};
		/** Render one body row, highlighting its code when tokens are present. */
		function Row({ row }) {
			const cls = row.kind === "path" ? EditsDiff_module_css_default.path : row.kind === "gap" ? EditsDiff_module_css_default.gap : row.kind === "del" ? EditsDiff_module_css_default.del : EditsDiff_module_css_default.add;
			const tokens = row.tokens;
			if (tokens === void 0 || tokens.length === 1 && tokens[0].kind === "plain") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: EditsDiff_module_css_default.line + " " + cls,
				children: row.text
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: EditsDiff_module_css_default.line + " " + cls,
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
		* Render file mutations as an inline diff: removed lines on a dark red
		* background, added lines on a dark green background, with the code always
		* syntax-highlighted for well-known code extensions.
		*/
		function EditsDiff({ diffs, labels, maxLines = 16, className }) {
			const { rows, added, removed, files } = (0, react.useMemo)(() => buildRows(diffs), [diffs]);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [copied, setCopied] = (0, react.useState)(false);
			const onCopy = (0, react.useCallback)(() => {
				if (copied) return;
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(copyText(rows)).then((ok) => {
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
			const head = capped ? rows.slice(0, headLines) : rows;
			const tail = capped ? rows.slice(rows.length - tailLines) : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: className === void 0 ? EditsDiff_module_css_default.block : EditsDiff_module_css_default.block + " " + className,
				"data-diff": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: EditsDiff_module_css_default.copyButton,
						onClick: onCopy,
						children: copied ? labels.copied : labels.copy
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: EditsDiff_module_css_default.body,
						children: [
							head.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { row }, "h" + index)),
							hidden > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: EditsDiff_module_css_default.expand,
								"aria-label": expanded ? labels.collapseAria : labels.expandAria(hidden),
								"aria-expanded": expanded,
								onClick: onToggle,
								children: expanded ? labels.collapse : labels.expand(hidden)
							}),
							tail.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { row }, "t" + index))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: EditsDiff_module_css_default.footer,
						children: [
							"└",
							" +",
							added,
							" -",
							removed,
							" ",
							"·",
							" ",
							labels.files(files)
						]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/zhoupeng/.dsh/packages/client/ui-edits/src/client/EditsView.module.css.mjs
		const css = ".sFFisa_view{flex-direction:column;gap:12px;padding:16px;display:flex}.sFFisa_empty{color:var(--dsh-text-secondary,#8b949e);padding:24px 16px;font-size:14px}.sFFisa_older{border:1px solid var(--dsh-border,#30363d);color:inherit;cursor:pointer;background:0 0;border-radius:6px;align-self:flex-start;padding:4px 12px;font-size:13px}.sFFisa_older:disabled{opacity:.6;cursor:default}.sFFisa_turn{flex-direction:column;gap:8px;display:flex}.sFFisa_turnHeader{border-bottom:1px solid var(--dsh-border,#30363d);padding-bottom:6px}.sFFisa_turnToggle{width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:8px;margin:0;padding:0;display:flex}.sFFisa_turnToggle:hover .sFFisa_turnTitle{text-decoration:underline}.sFFisa_chevron{opacity:.7;border-top:5px solid;border-left:4px solid #0000;border-right:4px solid #0000;flex:none;width:0;height:0;transition:transform .12s}.sFFisa_chevron[data-collapsed=true]{transform:rotate(-90deg)}.sFFisa_turnTitle{margin:0;font-size:13px;font-weight:600}.sFFisa_turnCount{color:var(--dsh-text-secondary,#8b949e);font-size:12px}.sFFisa_entry{border:1px solid var(--dsh-border,#30363d);border-radius:8px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.sFFisa_entryHeader{align-items:center;gap:8px;min-width:0;display:flex}.sFFisa_badge{background:var(--dsh-badge-bg,#7f7f7f29);color:var(--dsh-text-secondary,#8b949e);border-radius:10px;flex:none;padding:1px 8px;font-size:11px;line-height:18px}.sFFisa_path{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--dsh-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);flex:1;font-size:12px;overflow:hidden}.sFFisa_error{color:var(--dsh-danger,#f85149);flex:none;font-size:11px}.sFFisa_diff{border-radius:6px;overflow:hidden}";
		const tagId = "@deepseek-ai/dsh-client-ui-edits/EditsView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-edits";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var EditsView_module_css_default = {
			"badge": "sFFisa_badge",
			"chevron": "sFFisa_chevron",
			"diff": "sFFisa_diff",
			"empty": "sFFisa_empty",
			"entry": "sFFisa_entry",
			"entryHeader": "sFFisa_entryHeader",
			"error": "sFFisa_error",
			"older": "sFFisa_older",
			"path": "sFFisa_path",
			"turn": "sFFisa_turn",
			"turnCount": "sFFisa_turnCount",
			"turnHeader": "sFFisa_turnHeader",
			"turnTitle": "sFFisa_turnTitle",
			"turnToggle": "sFFisa_turnToggle",
			"view": "sFFisa_view"
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
		function toolLabel(t, tool) {
			if (tool === "edit") return t("kind.edit");
			if (tool === "write") return t("kind.write");
			return t("kind.unknown");
		}
		function EditsView({ useSession, useEdits, loadOlder, t }) {
			const snapshot = useEdits((value) => value);
			const hasMore = useSession((value) => value.hasMore);
			const loadingOlder = useSession((value) => value.loadingOlder);
			const labels = diffLabels(t);
			const turns = snapshot.turns;
			const [collapsedTurns, setCollapsedTurns] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const toggleTurn = (0, react.useCallback)((turn) => {
				setCollapsedTurns((prev) => {
					const next = new Set(prev);
					if (next.has(turn)) next.delete(turn);
					else next.add(turn);
					return next;
				});
			}, []);
			if (turns.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: EditsView_module_css_default.empty,
				children: t("empty.noEdits")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: EditsView_module_css_default.view,
				children: [hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: EditsView_module_css_default.older,
					disabled: loadingOlder,
					onClick: () => {
						loadOlder();
					},
					children: loadingOlder ? t("older.loading") : t("older.load")
				}), turns.map((turn) => {
					const collapsed = collapsedTurns.has(turn.turn);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: EditsView_module_css_default.turn,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
							className: EditsView_module_css_default.turnHeader,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: EditsView_module_css_default.turnToggle,
								"aria-expanded": !collapsed,
								"aria-label": collapsed ? t("turn.expandAria", { turn: turn.turn }) : t("turn.collapseAria", { turn: turn.turn }),
								onClick: () => {
									toggleTurn(turn.turn);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: EditsView_module_css_default.chevron,
										"data-collapsed": collapsed,
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: EditsView_module_css_default.turnTitle,
										children: t("turn.label", { turn: turn.turn })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: EditsView_module_css_default.turnCount,
										children: turn.edits.length
									})
								]
							})
						}), !collapsed && turn.edits.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: EditsView_module_css_default.entry,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: EditsView_module_css_default.entryHeader,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: EditsView_module_css_default.badge,
										children: toolLabel(t, entry.tool)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: EditsView_module_css_default.path,
										title: entry.diffs[0]?.path,
										children: entry.diffs[0]?.path
									}),
									entry.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: EditsView_module_css_default.error,
										children: t("entry.error")
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditsDiff, {
								diffs: [...entry.diffs],
								labels,
								maxLines: 8,
								className: EditsView_module_css_default.diff
							})]
						}, entry.key))]
					}, turn.turn);
				})]
			});
		}
		//#endregion
		//#region src/client/edits-definition.ts
		/** Tools whose results carry the contextual-diff `meta` payload. */
		const EDIT_TOOLS = /* @__PURE__ */ new Set(["edit", "write"]);
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
		/** Extract a settled result from a `tool/result` match, or null when it carries no usable diffs. */
		function resultFromMatch(match) {
			if (match.event.type !== "tool/result") return null;
			const diffs = narrowDiffs(match.event.data.meta);
			if (diffs === null) return null;
			return {
				seq: match.event.seq,
				time: match.event.time,
				turn: match.event.data.turn,
				step: match.event.data.step,
				diffs,
				...match.event.data.error === void 0 ? {} : { error: match.event.data.error }
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
		* Reconstruct one intended file mutation from a nested dispatch's call
		* arguments, mirroring the chat diff card's argument-derived fallback (PTC
		* mode logs no result `meta`).
		* @param name - dispatched tool name.
		* @param args - JSON-normalized call arguments.
		* @returns the reconstructed hunk, or null when the arguments are unusable.
		*/
		function dispatchDiffs(name, args) {
			if (typeof args !== "object" || args === null || Array.isArray(args)) return null;
			const record = args;
			const path = record.file_path;
			if (typeof path !== "string" || path.trim() === "") return null;
			if (name === "write") {
				const content = record.content;
				return typeof content === "string" ? [{
					path,
					oldText: null,
					newText: content
				}] : null;
			}
			if (name !== "edit") return null;
			const oldText = record.old_string;
			const newText = record.new_string;
			const replaceAll = record.replace_all;
			if (typeof oldText !== "string" || typeof newText !== "string") return null;
			if (replaceAll !== void 0 && typeof replaceAll !== "boolean") return null;
			return [{
				path,
				oldText: oldText || null,
				newText
			}];
		}
		/** Extract a settled result from a nested `tool/code-dispatch` match, or null when it has no usable mutation. */
		function dispatchResult(match) {
			if (match.event.type !== "tool/code-dispatch") return null;
			if (match.event.data.isError === true) return null;
			const diffs = dispatchDiffs(match.event.data.name, match.event.data.arguments);
			if (diffs === null) return null;
			return {
				seq: match.event.seq,
				time: match.event.time,
				turn: locationTurn(match),
				step: locationStep(match),
				diffs
			};
		}
		/** State adopted when the window opened inside a settled result (call head outside). */
		function fallbackState(context) {
			for (const match of context.matches) {
				if (match.event.type === "tool/result") {
					const result = resultFromMatch(match);
					if (result === void 0) continue;
					return {
						callId: String(match.event.data.message.source.callId),
						tool: null,
						result
					};
				}
				if (match.event.type === "tool/code-dispatch") {
					const result = dispatchResult(match);
					if (result === void 0) continue;
					return {
						callId: String(match.event.data.subCallId),
						tool: match.event.data.name,
						result
					};
				}
			}
		}
		/** Project the settled entry, or null while the call is still pending or failed. */
		function entryFor(context, state) {
			const result = state.result;
			if (result === null) return null;
			return {
				key: context.key,
				callId: state.callId,
				tool: state.tool,
				seq: result.seq,
				time: result.time,
				turn: result.turn,
				step: result.step,
				diffs: result.diffs,
				...result.error === void 0 ? {} : { error: result.error }
			};
		}
		/** Wrap one entry in the Engine-owned target envelope. */
		function editsNode(context, anchorSeq, entry) {
			return {
				key: context.key,
				kind: context.kind,
				id: context.id,
				target: "edits",
				anchorSeq,
				location: context.start?.location ?? { kind: "unresolved" },
				data: {
					kind: "edit",
					entry
				}
			};
		}
		/** Edits-owned lifecycle: start on an edit/write call or dispatch, settle on its result. */
		const editsDefinition = {
			kind: "edits-result",
			target: "edits",
			match: (event) => {
				if (event.type === "tool/call") return EDIT_TOOLS.has(event.data.name) ? {
					id: String(event.data.callId),
					role: "start"
				} : null;
				if (event.type === "tool/result") return narrowDiffs(event.data.meta) === null ? null : {
					id: String(event.data.message.source.callId),
					role: "update"
				};
				if (event.type === "tool/code-dispatch-start" || event.type === "tool/code-dispatch") {
					if (!EDIT_TOOLS.has(event.data.name)) return null;
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
					result: null
				};
				if (match.event.type === "tool/code-dispatch-start") return {
					callId: String(match.event.data.subCallId),
					tool: match.event.data.name,
					result: null
				};
				throw new Error("edits-result start requires tool/call or tool/code-dispatch-start");
			},
			update: (context, match) => {
				if (match.event.type === "tool/result") {
					const result = resultFromMatch(match);
					if (result === null) return context.state;
					return {
						...context.state,
						result
					};
				}
				if (match.event.type === "tool/code-dispatch") {
					const result = dispatchResult(match);
					if (result === null) return context.state;
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
				const entry = entryFor(context, state);
				if (entry === null) return null;
				return editsNode(context, context.start?.event.seq ?? entry.seq, entry);
			}
		};
		/**
		* Register the Edits lifecycle.
		* @param ctx - Plugin context receiving the Definition.
		*/
		function registerEditsDefinition(ctx) {
			ctx.uiConversation.events.register(editsDefinition);
		}
		//#endregion
		//#region src/client/edits-contract.ts
		/** Stable empty snapshot used before a Session has assembled Edits records. */
		const EMPTY_EDITS_SNAPSHOT = { turns: [] };
		//#endregion
		//#region src/client/edits-snapshot-builder.ts
		/** Aggregate per-turn edit records into the published snapshot. */
		var EditsSnapshotBuilder = class {
			entries = /* @__PURE__ */ new Map();
			empty = EMPTY_EDITS_SNAPSHOT;
			replace(input) {
				this.entries.clear();
				for (const node of input.nodes) this.entries.set(node.key, node.data.entry);
				return this.snapshot();
			}
			apply(input) {
				for (const node of input.upserts) this.entries.set(node.key, node.data.entry);
				return this.snapshot();
			}
			snapshot() {
				const byTurn = /* @__PURE__ */ new Map();
				for (const entry of this.entries.values()) {
					const list = byTurn.get(entry.turn);
					if (list === void 0) byTurn.set(entry.turn, [entry]);
					else list.push(entry);
				}
				return { turns: [...byTurn.entries()].map(([turn, edits]) => ({
					turn,
					edits: [...edits].sort((left, right) => left.seq - right.seq)
				})).sort((left, right) => left.turn - right.turn) };
			}
		};
		/** Edits target factory preserving the per-turn stage-oriented view model. */
		const editsViewDefinition = {
			target: "edits",
			create: () => new EditsSnapshotBuilder()
		};
		/**
		* Register the Edits target builder.
		* @param ctx - Plugin context receiving the view Definition.
		*/
		function registerEditsConversationView(ctx) {
			ctx.uiConversation.views.register(editsViewDefinition);
		}
		//#endregion
		//#region src/client/locales.ts
		/** `edits` namespace dictionaries for the Edits view surface. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "edits";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"view.edits": "编辑",
			"empty.noEdits": "本会话尚未产生文件修改。",
			"turn.label": "第 {turn} 轮",
			"turn.collapseAria": "收起第 {turn} 轮修改",
			"turn.expandAria": "展开第 {turn} 轮修改",
			"older.load": "加载更早的修改",
			"older.loading": "正在加载…",
			"kind.edit": "编辑",
			"kind.write": "写入",
			"kind.unknown": "修改",
			"entry.error": "失败",
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
			"view.edits": "Edits",
			"empty.noEdits": "No file changes in this session yet.",
			"turn.label": "Turn {turn}",
			"turn.collapseAria": "Collapse turn {turn}",
			"turn.expandAria": "Expand turn {turn}",
			"older.load": "Load earlier edits",
			"older.loading": "Loading…",
			"kind.edit": "Edit",
			"kind.write": "Write",
			"kind.unknown": "Change",
			"entry.error": "Failed",
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
		* Client plugin body: register the Edits view tab. The registration rides the
		* slot service's effect wrapper, so plugin unload removes the tab.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const editsSources = /* @__PURE__ */ new WeakMap();
			const editsSource = (binding) => {
				let source = editsSources.get(binding);
				if (source === void 0) {
					const target = ctx.uiConversation.binding(binding).target("edits");
					source = {
						getSnapshot: () => target.getSnapshot() ?? EMPTY_EDITS_SNAPSHOT,
						subscribe: (listener) => target.subscribe(listener)
					};
					editsSources.set(binding, source);
				}
				return source;
			};
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-edits: dictionaries");
			const t = ctx.locale.bind(NS);
			registerEditsConversationView(ctx);
			registerEditsDefinition(ctx);
			ctx.uiSession.provide({
				hooks: ["edits"],
				resolve: (binding) => ({ hooks: { edits: editsSource(binding) } })
			});
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "edits",
				order: 20,
				locale: NS,
				label: () => t("view.edits"),
				children: {},
				inject: (sessionId) => {
					const session = ctx.sessions.binding(sessionId)?.session;
					if (session === void 0) throw new Error(`ui-edits: session "${sessionId}" is unavailable`);
					const target = ctx.uiConversation.binding(sessionId).target("edits");
					return { loadOlder: async () => {
						const before = target.getSnapshot();
						await session.loadOlder();
						return target.getSnapshot() !== before;
					} };
				}
			}, EditsView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map