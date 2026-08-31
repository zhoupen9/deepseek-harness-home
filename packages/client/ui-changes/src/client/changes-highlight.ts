/**
 * Lightweight line-based syntax highlighter for the Changes diff. Self-contained
 * (no shiki, no cross-plugin value imports): a small scanner that classifies
 * each source line into token spans - comments, strings, keywords, literals,
 * numbers, function calls, and shell/php variables - for the well-known code
 * extensions the diff always highlights. Unknown languages fall back to a
 * single plain span; colors live in ChangesView.module.css, never here.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */

/** A token category; the view maps each to a CSS class (plain = inherited). */
export type HighlightKind =
  | 'comment' | 'string' | 'keyword' | 'literal' | 'number' | 'function' | 'variable' | 'plain'

/** One classified run of a source line. */
export interface HighlightToken {
  readonly text: string
  readonly kind: HighlightKind
}

/** Per-language scanner config; words are matched case-sensitively. */
interface LanguageSpec {
  readonly keywords: readonly string[]
  readonly literals: readonly string[]
  readonly lineComments: readonly string[]
  readonly blockComments: readonly (readonly [string, string])[]
  /** JS-family backtick template strings. */
  readonly backtickStrings?: boolean
  /** Python triple-quoted strings. */
  readonly tripleQuotes?: boolean
  /** Shell/PHP $name and ${name} variables. */
  readonly dollarVariables?: boolean
  /** Identifier followed by ( renders as a function call. */
  readonly functionStyle?: boolean
  /** Allow $ inside identifiers (JS family). */
  readonly dollarIdentifiers?: boolean
}

const JS_KEYWORDS = [
  'abstract', 'as', 'assert', 'asserts', 'async', 'await', 'break', 'case', 'catch',
  'class', 'const', 'continue', 'debugger', 'declare', 'default', 'delete', 'do',
  'else', 'enum', 'export', 'extends', 'finally', 'for', 'from', 'function', 'get',
  'if', 'implements', 'import', 'in', 'infer', 'instanceof', 'interface', 'is',
  'keyof', 'let', 'module', 'namespace', 'never', 'new', 'object', 'of', 'package',
  'private', 'protected', 'public', 'readonly', 'require', 'return', 'satisfies',
  'set', 'static', 'string', 'super', 'switch', 'symbol', 'throw', 'try', 'type',
  'typeof', 'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield',
]

const PYTHON_KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
  'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield',
]

const SHELL_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case',
  'esac', 'function', 'select', 'until', 'in', 'return', 'break', 'continue',
  'exit', 'export', 'readonly', 'local', 'set', 'unset', 'shift', 'source',
  'declare', 'typeset', 'eval', 'exec', 'trap', 'echo', 'printf', 'cd', 'pwd',
]

const GO_KEYWORDS = [
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map',
  'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var',
]

const RUST_KEYWORDS = [
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
  'enum', 'extern', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match',
  'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
  'struct', 'super', 'trait', 'type', 'unsafe', 'use', 'where', 'while',
]

const JAVA_KEYWORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while',
]

const C_KEYWORDS = [
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline',
  'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof',
  'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while',
]

const CPP_KEYWORDS = [
  ...C_KEYWORDS,
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'bitand', 'bitor', 'bool',
  'catch', 'class', 'compl', 'concept', 'constexpr', 'consteval', 'constinit',
  'decltype', 'delete', 'dynamic_cast', 'explicit', 'export', 'friend', 'mutable',
  'namespace', 'new', 'noexcept', 'not', 'not_eq', 'operator', 'or', 'or_eq',
  'private', 'protected', 'public', 'reinterpret_cast', 'requires',
  'static_assert', 'static_cast', 'template', 'this', 'thread_local', 'throw',
  'try', 'typeid', 'typename', 'using', 'virtual', 'wchar_t', 'xor', 'xor_eq',
]

const CSHARP_KEYWORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'finally',
  'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int',
  'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new', 'object',
  'operator', 'out', 'override', 'params', 'private', 'protected', 'public',
  'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof',
  'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'try',
  'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual',
  'void', 'volatile', 'while',
]

const KOTLIN_KEYWORDS = [
  'as', 'break', 'class', 'continue', 'do', 'else', 'for', 'fun', 'if', 'in',
  'interface', 'is', 'object', 'package', 'return', 'super', 'this', 'throw',
  'try', 'typealias', 'typeof', 'val', 'var', 'when', 'while', 'by', 'catch',
  'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get',
  'import', 'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where',
  'actual', 'abstract', 'annotation', 'companion', 'const', 'crossinline',
  'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner',
  'internal', 'lateinit', 'noinline', 'open', 'operator', 'out', 'override',
  'private', 'protected', 'public', 'reified', 'sealed', 'suspend', 'tailrec',
  'vararg', 'it',
]

const SWIFT_KEYWORDS = [
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate',
  'func', 'import', 'init', 'inout', 'internal', 'let', 'open', 'operator',
  'private', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript',
  'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do',
  'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return',
  'switch', 'where', 'while', 'as', 'catch', 'is', 'throw', 'throws', 'try',
]

const PHP_KEYWORDS = [
  'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch',
  'class', 'clone', 'const', 'continue', 'declare', 'default', 'do', 'echo',
  'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif',
  'endswitch', 'endwhile', 'enum', 'extends', 'final', 'finally', 'fn', 'for',
  'foreach', 'function', 'global', 'goto', 'if', 'implements', 'include',
  'include_once', 'instanceof', 'insteadof', 'interface', 'isset', 'list',
  'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public',
  'readonly', 'require', 'require_once', 'return', 'static', 'switch', 'throw',
  'trait', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield',
]

const RUBY_KEYWORDS = [
  'alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'defined', 'do',
  'else', 'elsif', 'end', 'ensure', 'for', 'if', 'in', 'module', 'next', 'not',
  'or', 'redo', 'rescue', 'retry', 'return', 'self', 'super', 'then', 'undef',
  'unless', 'until', 'when', 'while', 'yield',
]

const SQL_KEYWORDS = [
  'select', 'from', 'where', 'insert', 'into', 'update', 'delete', 'create',
  'alter', 'drop', 'table', 'index', 'view', 'join', 'inner', 'left', 'right',
  'outer', 'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'as',
  'and', 'or', 'not', 'null', 'in', 'is', 'like', 'between', 'union', 'all',
  'distinct', 'count', 'sum', 'avg', 'min', 'max', 'case', 'when', 'then',
  'else', 'end', 'values', 'set', 'primary', 'key', 'foreign', 'references',
]

const LUA_KEYWORDS = [
  'and', 'break', 'do', 'else', 'elseif', 'end', 'for', 'function', 'goto',
  'if', 'in', 'local', 'not', 'or', 'repeat', 'return', 'then', 'until', 'while',
]

/** Registry keyed by the ids changes-lang.ts emits; absent = plain fallback. */
const SPECS: Readonly<Record<string, LanguageSpec>> = {
  typescript: {
    keywords: JS_KEYWORDS, literals: ['true', 'false', 'null', 'undefined', 'this'],
    lineComments: ['//'], blockComments: [['/*', '*/']],
    backtickStrings: true, functionStyle: true, dollarIdentifiers: true,
  },
  json: {
    keywords: [], literals: ['true', 'false', 'null'],
    lineComments: [], blockComments: [],
  },
  python: {
    keywords: PYTHON_KEYWORDS, literals: ['True', 'False', 'None', 'self'],
    lineComments: ['#'], blockComments: [], tripleQuotes: true, functionStyle: true,
  },
  shell: {
    keywords: SHELL_KEYWORDS, literals: [],
    lineComments: ['#'], blockComments: [], dollarVariables: true,
  },
  ruby: {
    keywords: RUBY_KEYWORDS, literals: ['true', 'false', 'nil', 'self'],
    lineComments: ['#'], blockComments: [], functionStyle: true,
  },
  go: {
    keywords: GO_KEYWORDS, literals: ['true', 'false', 'nil'],
    lineComments: ['//'], blockComments: [['/*', '*/']], backtickStrings: true, functionStyle: true,
  },
  rust: {
    keywords: RUST_KEYWORDS, literals: ['true', 'false'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  java: {
    keywords: JAVA_KEYWORDS, literals: ['true', 'false', 'null', 'this'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  c: {
    keywords: C_KEYWORDS, literals: ['NULL'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  cpp: {
    keywords: CPP_KEYWORDS, literals: ['true', 'false', 'nullptr', 'NULL', 'this'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  csharp: {
    keywords: CSHARP_KEYWORDS, literals: ['true', 'false', 'null', 'this', 'base'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  kotlin: {
    keywords: KOTLIN_KEYWORDS, literals: ['true', 'false', 'null', 'this', 'super'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  swift: {
    keywords: SWIFT_KEYWORDS, literals: ['true', 'false', 'nil', 'self', 'Self', 'super'],
    lineComments: ['//'], blockComments: [['/*', '*/']], functionStyle: true,
  },
  php: {
    keywords: PHP_KEYWORDS, literals: ['true', 'false', 'null', 'this'],
    lineComments: ['//', '#'], blockComments: [['/*', '*/']], dollarVariables: true, functionStyle: true,
  },
  lua: {
    keywords: LUA_KEYWORDS, literals: ['true', 'false', 'nil'],
    lineComments: ['--'], blockComments: [['--[[', ']]']],
  },
  yaml: {
    keywords: [], literals: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
    lineComments: ['#'], blockComments: [],
  },
  toml: {
    keywords: [], literals: ['true', 'false'],
    lineComments: ['#'], blockComments: [],
  },
  html: {
    keywords: [], literals: [],
    lineComments: [], blockComments: [['<!--', '-->']],
  },
  css: {
    keywords: [], literals: [],
    lineComments: [], blockComments: [['/*', '*/']],
  },
  sql: {
    keywords: SQL_KEYWORDS, literals: ['true', 'false', 'null'],
    lineComments: ['--'], blockComments: [['/*', '*/']],
  },
}

/** A spec with its keyword/literal sets precomputed, cached per spec identity. */
interface ResolvedSpec {
  readonly keywords: ReadonlySet<string>
  readonly literals: ReadonlySet<string>
}

const RESOLVED = new WeakMap<LanguageSpec, ResolvedSpec>()

function resolveSpec(spec: LanguageSpec): ResolvedSpec {
  let resolved = RESOLVED.get(spec)
  if (resolved === undefined) {
    resolved = { keywords: new Set(spec.keywords), literals: new Set(spec.literals) }
    RESOLVED.set(spec, resolved)
  }
  return resolved
}

const IDENT_START = /[A-Za-z_]/
const IDENT_START_DOLLAR = /[A-Za-z_$]/
const IDENT_PART = /[A-Za-z0-9_]/
const IDENT_PART_DOLLAR = /[A-Za-z0-9_$]/
const DIGIT = /[0-9]/
const HEX = /[0-9a-fA-F]/
const BINARY = /[01]/
const OCTAL = /[0-7]/

/** Match a line comment at i against the spec's prefixes; returns length to end of line. */
function matchLineComment(line: string, i: number, prefixes: readonly string[]): number | null {
  for (const p of prefixes) {
    if (line.startsWith(p, i)) return line.length - i
  }
  return null
}

/** Match a block comment at i; unclosed spans to end of line. */
function matchBlockComment(line: string, i: number, blocks: readonly (readonly [string, string])[]): number | null {
  for (const [open, close] of blocks) {
    if (line.startsWith(open, i)) {
      const end = line.indexOf(close, i + open.length)
      return end === -1 ? line.length - i : end + close.length - i
    }
  }
  return null
}

/** Match a quoted string at i; honors escapes and triple quotes. */
function matchString(line: string, i: number, spec: LanguageSpec): number | null {
  const ch = line[i]
  if (spec.tripleQuotes === true && (ch === "'" || ch === '"')) {
    const triple = ch + ch + ch
    if (line.startsWith(triple, i)) {
      const end = line.indexOf(triple, i + 3)
      return end === -1 ? line.length - i : end + 3 - i
    }
  }
  if (ch === "'" || ch === '"') {
    let j = i + 1
    while (j < line.length) {
      if (line[j] === '\\') { j += 2; continue }
      if (line[j] === ch) return j + 1 - i
      j++
    }
    return line.length - i
  }
  if (spec.backtickStrings === true && ch === '`') {
    let j = i + 1
    while (j < line.length) {
      if (line[j] === '\\') { j += 2; continue }
      if (line[j] === '`') return j + 1 - i
      j++
    }
    return line.length - i
  }
  return null
}

/** Match a numeric literal at i (int/float/hex/bin/oct). */
function matchNumber(line: string, i: number): number | null {
  const n = line.length
  if (line[i] === '0' && i + 1 < n) {
    const c = line[i + 1]
    if (c === 'x' || c === 'X') {
      let j = i + 2
      while (j < n && HEX.test(line[j])) j++
      if (j > i + 2) return j - i
      return null
    }
    if (c === 'b' || c === 'B') {
      let j = i + 2
      while (j < n && BINARY.test(line[j])) j++
      if (j > i + 2) return j - i
      return null
    }
    if (c === 'o' || c === 'O') {
      let j = i + 2
      while (j < n && OCTAL.test(line[j])) j++
      if (j > i + 2) return j - i
      return null
    }
  }
  let j = i
  let hasDigit = false
  while (j < n && DIGIT.test(line[j])) { j++; hasDigit = true }
  if (j < n && line[j] === '.') {
    let k = j + 1
    let hasFrac = false
    while (k < n && DIGIT.test(line[k])) { k++; hasFrac = true }
    if (hasFrac) j = k
  }
  if (j < n && (line[j] === 'e' || line[j] === 'E')) {
    let k = j + 1
    if (k < n && (line[k] === '+' || line[k] === '-')) k++
    let hasExp = false
    while (k < n && DIGIT.test(line[k])) { k++; hasExp = true }
    if (hasExp) j = k
  }
  return hasDigit ? j - i : null
}

/** Match a shell/php variable at i ($name, ${name}, $1, $?). Caller ensures line[i] is $. */
function matchDollarVariable(line: string, i: number): number {
  const n = line.length
  if (i + 1 < n && line[i + 1] === '{') {
    const end = line.indexOf('}', i + 2)
    return end === -1 ? n - i : end + 1 - i
  }
  if (i + 1 < n && (IDENT_START.test(line[i + 1]))) {
    let j = i + 2
    while (j < n && IDENT_PART.test(line[j])) j++
    return j - i
  }
  return i + 1 < n ? 2 : 1
}

/** Match an identifier at i, classifying keyword / literal / function. */
function matchWord(line: string, i: number, spec: LanguageSpec): { len: number; kind: HighlightKind } | null {
  const start = spec.dollarIdentifiers === true ? IDENT_START_DOLLAR : IDENT_START
  const part = spec.dollarIdentifiers === true ? IDENT_PART_DOLLAR : IDENT_PART
  if (!start.test(line[i])) return null
  let j = i + 1
  while (j < line.length && part.test(line[j])) j++
  const word = line.slice(i, j)
  const len = j - i
  const resolved = resolveSpec(spec)
  if (resolved.keywords.has(word)) return { len, kind: 'keyword' }
  if (resolved.literals.has(word)) return { len, kind: 'literal' }
  if (spec.functionStyle === true) {
    let k = j
    while (k < line.length && line[k] === ' ') k++
    if (k < line.length && line[k] === '(') return { len, kind: 'function' }
  }
  return { len, kind: 'plain' }
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
export function highlightLine(line: string, lang: string | undefined): readonly HighlightToken[] {
  const spec = lang === undefined ? undefined : SPECS[lang]
  if (spec === undefined) return [{ text: line, kind: 'plain' }]
  const tokens: HighlightToken[] = []
  let plain = ''
  let i = 0
  const n = line.length
  const flush = (): void => {
    if (plain !== '') { tokens.push({ text: plain, kind: 'plain' }); plain = '' }
  }
  while (i < n) {
    let matched: { len: number; kind: HighlightKind } | null = null
    const comment = matchLineComment(line, i, spec.lineComments)
    if (comment !== null) { matched = { len: comment, kind: 'comment' } }
    if (matched === null && spec.blockComments.length > 0) {
      const bc = matchBlockComment(line, i, spec.blockComments)
      if (bc !== null) matched = { len: bc, kind: 'comment' }
    }
    if (matched === null) {
      const s = matchString(line, i, spec)
      if (s !== null) matched = { len: s, kind: 'string' }
    }
    if (matched === null && spec.dollarVariables === true && line[i] === '$') {
      matched = { len: matchDollarVariable(line, i), kind: 'variable' }
    }
    if (matched === null) {
      const num = matchNumber(line, i)
      if (num !== null) matched = { len: num, kind: 'number' }
    }
    if (matched === null) {
      const word = matchWord(line, i, spec)
      if (word !== null) matched = word
    }
    if (matched === null) {
      plain += line[i]
      i++
    } else if (matched.kind === 'plain') {
      // A non-keyword identifier: fold it into the plain run without a span.
      plain += line.slice(i, i + matched.len)
      i += matched.len
    } else {
      flush()
      tokens.push({ text: line.slice(i, i + matched.len), kind: matched.kind })
      i += matched.len
    }
  }
  flush()
  return tokens
}
