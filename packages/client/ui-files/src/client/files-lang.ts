/**
 * File-extension → syntax-highlighting language hints for the Files view.
 * Mirrors the `read` tool's own extension table (packages/fs/tool-fs
 * read-render.ts) so the Files view and the chat's read cards highlight the
 * same file the same way; the ids are the aliases the shared ReadBlock /
 * shiki highlighter resolves (py→python, sh→shellscript, md→markdown, ...).
 * @module @deepseek-ai/dsh-client-ui-files/client
 */

/** Extension (without dot, lower-cased) → language hint. */
const LANG_BY_EXTENSION: Readonly<Record<string, string>> = {
  ts: 'ts', tsx: 'tsx', mts: 'ts', cts: 'ts',
  js: 'js', jsx: 'jsx', mjs: 'js', cjs: 'js',
  json: 'json', jsonc: 'json',
  py: 'py', rb: 'rb', go: 'go', rs: 'rs', java: 'java',
  c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', hpp: 'cpp', cxx: 'cpp',
  cs: 'cs', kt: 'kotlin', swift: 'swift', php: 'php',
  sh: 'sh', bash: 'sh', zsh: 'sh',
  yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini',
  md: 'md', markdown: 'md', mdx: 'mdx',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
  sql: 'sql', xml: 'xml', lua: 'lua',
}

/**
 * Derive a syntax-highlighting language hint from a path's file extension.
 * Pure and case-insensitive on the extension; a dotfile with no extension
 * (`.gitignore`) and an unknown extension both yield undefined (plain
 * monospace in ReadBlock — never an error).
 * @param path - the model-facing path.
 * @returns the language hint, or undefined when the extension maps to none.
 */
export function langFromPath(path: string): string | undefined {
  const base = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
  const dot = base.lastIndexOf('.')
  // A leading dot is a dotfile (no extension), not an empty extension.
  if (dot <= 0) return undefined
  const ext = base.slice(dot + 1).toLowerCase()
  // Own-property check only: a filename whose extension is an Object.prototype
  // key (`foo.constructor`, `foo.__proto__`) must map to no language.
  return Object.hasOwn(LANG_BY_EXTENSION, ext) ? LANG_BY_EXTENSION[ext] : undefined
}
