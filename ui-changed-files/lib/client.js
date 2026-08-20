/**
 * Changed-files view plugin, browser half. Registers a "Changes" tab into the
 * conversation view ring (the 'conversation.view' list slot) after Chat and
 * Trajectory. The tab lists every file changed during the current session; each
 * file row is expandable and reveals the applied git-style diff (via the shared
 * DiffBlock primitive). The changed-files aggregate is derived from the
 * session's conversation snapshot: settled tool results whose render intent is
 * a 'diff' card contribute their applied hunks, grouped by path in first-seen
 * order.
 *
 * This bundle is hand-rolled to match the tsdown client-bundle banner/footer
 * protocol (window.__ModuleLoader__.load({ id, factory })), so it can live
 * outside the read-only harness checkout and load through the profile's
 * cordis.patch.yml dsh.client row.
 */
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-ui-changed-files',
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    const {
      IconEditOutline16,
      IconChevronDownOutline14,
      IconChevronRightOutline14,
    } = primitives;

    const h = React.createElement;

    // ---- Stylesheet (injected once; the loader removes plugin-owned tags on unload) ----
    const CSS = [
      '.dcf-root {',
      '  flex: 1;',
      '  display: flex;',
      '  flex-direction: column;',
      '  min-height: 0;',
      '  overflow: hidden;',
      '  background: var(--dsw-alias-bg-base);',
      '  color: var(--dsw-alias-label-primary);',
      '  font-family: var(--dsw-font-family);',
      '}',
      '.dcf-header {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 6px;',
      '  padding: 12px 16px;',
      '  border-bottom: 1px solid var(--dsw-alias-border-l2);',
      '  flex-shrink: 0;',
      '}',
      '.dcf-headerRow {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  min-width: 0;',
      '}',
      '.dcf-status {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 2px;',
      '  min-width: 0;',
      '}',
      '.dcf-statusLine {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  min-width: 0;',
      '  font-size: 12px;',
      '  line-height: 18px;',
      '  color: var(--dsw-alias-label-secondary);',
      '}',
      '.dcf-statusLabel {',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  white-space: nowrap;',
      '  min-width: 0;',
      '}',
      '.dcf-wsPath {',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  white-space: nowrap;',
      '  font-family: var(--ds-font-family-code, ui-monospace, monospace);',
      '  font-size: 11px;',
      '  line-height: 16px;',
      '  color: var(--dsw-alias-label-tertiary);',
      '}',
      '.dcf-statusMeta {',
      '  flex-shrink: 0;',
      '  font-size: 11px;',
      '  line-height: 16px;',
      '  color: var(--dsw-alias-label-tertiary);',
      '}',
      '.dcf-batch {',
      '  border-bottom: 1px solid var(--dsw-alias-border-l1);',
      '}',
      '.dcf-batchRow {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  width: 100%;',
      '  padding: 8px 12px;',
      '  background: none;',
      '  border: none;',
      '  cursor: pointer;',
      '  text-align: left;',
      '  color: var(--dsw-alias-label-primary);',
      '  font-family: var(--dsw-font-family);',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  line-height: 18px;',
      '  box-sizing: border-box;',
      '}',
      '.dcf-batchRow:hover {',
      '  background: var(--dsw-alias-interactive-bg-hover);',
      '}',
      '.dcf-batchBadge {',
      '  flex-shrink: 0;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  min-width: 20px;',
      '  height: 20px;',
      '  padding: 0 6px;',
      '  border-radius: 10px;',
      '  background: var(--dsw-alias-interactive-bg-hover);',
      '  color: var(--dsw-alias-label-secondary);',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '  line-height: 18px;',
      '}',
      '.dcf-batchSpacer {',
      '  flex: 1;',
      '  min-width: 0;',
      '}',
      '.dcf-batchBody {',
      '  border-top: 1px solid var(--dsw-alias-border-l1);',
      '  padding-left: 8px;',
      '}',
      '.dcf-title {',
      '  flex: 1;',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '  line-height: 20px;',
      '}',
      '.dcf-count {',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  line-height: 18px;',
      '  padding: 1px 8px;',
      '  border-radius: 10px;',
      '  background: var(--dsw-alias-interactive-bg-hover);',
      '  color: var(--dsw-alias-label-secondary);',
      '}',
      '.dcf-empty {',
      '  padding: 32px 16px;',
      '  text-align: center;',
      '  font-size: 13px;',
      '  line-height: 20px;',
      '  color: var(--dsw-alias-label-tertiary);',
      '}',
      '.dcf-list {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 0;',
      '  overflow-y: auto;',
      '  flex: 1;',
      '}',
      '.dcf-item {',
      '  border-bottom: 1px solid var(--dsw-alias-border-l1);',
      '}',
      '.dcf-row {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  width: 100%;',
      '  padding: 8px 12px;',
      '  background: none;',
      '  border: none;',
      '  cursor: pointer;',
      '  text-align: left;',
      '  color: var(--dsw-alias-label-primary);',
      '  font-family: var(--dsw-font-family);',
      '  box-sizing: border-box;',
      '}',
      '.dcf-row:hover {',
      '  background: var(--dsw-alias-interactive-bg-hover);',
      '}',
      '.dcf-chevron {',
      '  display: inline-flex;',
      '  flex-shrink: 0;',
      '  color: var(--dsw-alias-label-tertiary);',
      '}',
      '.dcf-fileicon {',
      '  flex-shrink: 0;',
      '  color: var(--dsw-alias-label-secondary);',
      '}',
      '.dcf-path {',
      '  flex: 1;',
      '  min-width: 0;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  white-space: nowrap;',
      '  font-family: var(--ds-font-family-code, ui-monospace, monospace);',
      '  font-size: 12px;',
      '  font-weight: 500;',
      '  line-height: 18px;',
      '}',
      '.dcf-meta {',
      '  flex-shrink: 0;',
      '  font-family: var(--ds-font-family-code, ui-monospace, monospace);',
      '  font-size: 11px;',
      '  line-height: 16px;',
      '  color: var(--dsw-alias-label-tertiary);',
      '}',
      '.dcf-diff {',
      '  padding: 4px 0 8px 0;',
      '  border-top: 1px solid var(--dsw-alias-border-l1);',
      '}',
      '.dcf-diffBlock {',
      '  margin-top: 8px;',
      '  border-radius: 6px;',
      '  overflow: hidden;',
      '  background: var(--dsw-alias-markdown-code-block);',
      '}',
      '.dcf-diffBody {',
      '  padding: 8px 10px;',
      '  overflow-x: auto;',
      '  overflow-y: hidden;',
      '  font-family: var(--ds-font-family-code, ui-monospace, monospace);',
      '  font-size: 12px;',
      '  line-height: 20px;',
      '  color: var(--dsw-alias-label-primary);',
      '}',
      '.dcf-diffLine {',
      '  min-height: 20px;',
      '  white-space: pre;',
      '}',
      '.dcf-diffPath {',
      '  font-weight: 600;',
      '  color: var(--dsw-alias-label-primary);',
      '}',
      '.dcf-diffGap {',
      '  color: var(--dsw-alias-label-tertiary);',
      '}',
      '.dcf-diffDel {',
      '  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 16%, transparent);',
      '}',
      '.dcf-diffDel::before {',
      '  content: "- ";',
      '  color: var(--dsw-alias-state-error-primary);',
      '}',
      '.dcf-diffAdd {',
      '  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent);',
      '}',
      '.dcf-diffAdd::before {',
      '  content: "+ ";',
      '  color: var(--dsw-alias-state-success-primary);',
      '}',
    ].join('\n');

    const STYLE_ID = '@deepseek-ai/dsh-client-ui-changed-files/changed-files.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = '@deepseek-ai/dsh-client-ui-changed-files';
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ---- Pure derivation helpers ----

    /** Collapse mixed separators and duplicate slashes to a single '/'. */
    function normalizePath(path) {
      return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    }

    /** Whether a path is absolute (POSIX root, Windows drive/UNC). */
    function isAbsolutePath(path) {
      return path.startsWith('/') || /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\');
    }

    /**
     * Resolve `path` to an absolute path against the project root `cwd` when
     * possible. Returns the normalized absolute path, or null when the path is
     * relative and no root is known to resolve it against.
     */
    function resolveAbsolutePath(path, cwd) {
      const normalized = normalizePath(path);
      if (isAbsolutePath(normalized)) return normalized;
      if (cwd == null || cwd === '') return null;
      const base = normalizePath(cwd).replace(/\/+$/, '');
      const rel = normalized.replace(/^\.\//, '').replace(/^\/+/, '');
      return base + (rel === '' ? '' : '/' + rel);
    }

    /**
     * Strip the project-root prefix from an absolute path. Returns null when
     * the path is not under the root (or no root is known), so callers can fall
     * back to the absolute form.
     */
    function relativize(abs, cwd) {
      if (cwd == null || cwd === '') return null;
      const base = normalizePath(cwd).replace(/\/+$/, '');
      if (base === '' || abs === base) return null;
      if (abs.startsWith(base + '/')) {
        const rel = abs.slice(base.length + 1);
        return rel === '' ? null : rel;
      }
      return null;
    }

    /**
     * The label a changed file renders: the path relative to the project root
     * when computable, otherwise the absolute path, and the original path as
     * the last resort when neither can be derived.
     */
    function displayPath(path, cwd) {
      if (typeof path !== 'string' || path === '') return path;
      const abs = resolveAbsolutePath(path, cwd);
      if (abs != null) {
        const rel = relativize(abs, cwd);
        return rel != null ? rel : abs;
      }
      return normalizePath(path);
    }

    /** Content-line count for one diff side (matches DiffBlock's terminator rule). */
    function countLines(text) {
      if (text === '') return 0;
      const body = text.endsWith('\n') ? text.slice(0, -1) : text;
      return body.split('\n').length;
    }

    /**
     * Reconstruct a diff-card hunk list from a settled tool call's own
     * arguments. Code-mode sessions bridge real tools as run_code
     * sub-dispatches whose render-intent resultView is not emitted for the
     * mutation tools (the result-time diff depends on presentation metadata
     * that sub-dispatches do not carry), so fall back to the stable argument
     * shapes that produce the same { path, oldText, newText } hunks.
     */
    function deriveCallDiffs(call) {
      if (call == null) return null;
      const name = call.name;
      let args = null;
      try {
        args = typeof call.argsRaw === 'string' ? JSON.parse(call.argsRaw) : call.argsRaw;
      } catch (error) {
        return null;
      }
      if (args == null || typeof args !== 'object') return null;
      if (name === 'write') {
        const path = typeof args.file_path === 'string' ? args.file_path : '';
        if (path === '') return null;
        return [{ path, oldText: null, newText: typeof args.content === 'string' ? args.content : '' }];
      }
      if (name === 'edit') {
        const path = typeof args.file_path === 'string' ? args.file_path : '';
        if (path === '') return null;
        return [{
          path,
          oldText: typeof args.old_string === 'string' ? args.old_string : null,
          newText: typeof args.new_string === 'string' ? args.new_string : '',
        }];
      }
      if (name === 'str_replace_editor') {
        const path = typeof args.path === 'string' ? args.path : '';
        if (path === '') return null;
        if (args.command === 'create') {
          return [{ path, oldText: null, newText: typeof args.file_text === 'string' ? args.file_text : '' }];
        }
        if (args.command === 'str_replace') {
          return [{
            path,
            oldText: typeof args.old_str === 'string' ? args.old_str : null,
            newText: typeof args.new_str === 'string' ? args.new_str : '',
          }];
        }
        return null;
      }
      return null;
    }

    /**
     * Accumulate one hunk into a per-batch file map, grouping by path in
     * first-seen order and totalling added/removed line counts.
     */
    function addHunk(byPath, path, oldText, newText) {
      let entry = byPath.get(path);
      if (entry === undefined) {
        entry = { path, hunks: [], added: 0, removed: 0 };
        byPath.set(path, entry);
      }
      entry.hunks.push({ path, oldText, newText });
      if (oldText !== null) entry.removed += countLines(oldText);
      entry.added += countLines(newText);
    }

    /**
     * Group every changed file by its parent root tool call. One top-level
     * 'tool-result' node (plus its recursive subCalls) is one change batch:
     * each batch is a chronological unit of edits. A file touched by two
     * different root calls therefore appears once per batch. Batches with no
     * file hunks (read-only tools) are dropped. Ordered ascending by the root
     * node's seq (monotonic), falling back to time.
     */
    function collectChangeBatches(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.nodes)) return [];
      function walk(block, byPath) {
        if (block == null) return;
        if (block.kind === 'tool-result') {
          const rv = block.resultView;
          if (rv != null && rv.card === 'diff' && Array.isArray(rv.diffs)) {
            for (const hunk of rv.diffs) {
              if (hunk == null || typeof hunk.path !== 'string') continue;
              const oldText = hunk.oldText == null ? null : String(hunk.oldText);
              const newText = typeof hunk.newText === 'string' ? hunk.newText : '';
              addHunk(byPath, hunk.path, oldText, newText);
            }
          } else if (block.isError !== true) {
            // Code-mode sub-dispatches emit no resultView for write/edit
            // (result-time diff meta is not computed for sub-dispatches), so
            // reconstruct the hunks from the mutation call's arguments.
            const derived = deriveCallDiffs(block.call);
            if (derived != null) {
              for (const hunk of derived) addHunk(byPath, hunk.path, hunk.oldText, hunk.newText);
            }
          }
        }
        if (Array.isArray(block.subCalls)) {
          for (const child of block.subCalls) walk(child, byPath);
        }
      }
      const batches = [];
      for (const node of snapshot.nodes) {
        if (node == null || node.kind !== 'tool-result') continue;
        const byPath = new Map();
        walk(node, byPath);
        const files = Array.from(byPath.values());
        if (files.length === 0) continue;
        const seq = typeof node.seq === 'number' ? node.seq : Infinity;
        const time = typeof node.time === 'number' ? node.time : null;
        batches.push({
          batchKey: typeof node.seq === 'number' ? node.seq : (time != null ? time : batches.length),
          seq: seq,
          time: time,
          files: files,
        });
      }
      batches.sort(function (a, b) {
        return (a.seq - b.seq) || (a.time != null && b.time != null ? a.time - b.time : 0);
      });
      return batches;
    }

    /**
     * Split a diff side's text into content lines. Empty text is zero lines;
     * a single trailing newline is a terminator, not an extra empty line (the
     * same rule the stock DiffBlock uses).
     */
    function contentLines(text) {
      if (text === '') return [];
      const body = text.endsWith('\n') ? text.slice(0, -1) : text;
      return body.split('\n');
    }

    /** Per-row-kind class suffix for the diff lines. */
    const DIFF_ROW_CLASS = {
      path: 'dcf-diffPath',
      del: 'dcf-diffDel',
      add: 'dcf-diffAdd',
      gap: 'dcf-diffGap',
    };

    /**
     * Flatten one file's hunks into an ordered row list: a path header opens
     * each new path, an ellipsis gap marks a same-file second hunk, then the
     * removed lines (dark red) and the added lines (dark green).
     */
    function buildDiffRows(hunks) {
      const rows = [];
      let prevPath = undefined;
      for (const hunk of hunks) {
        if (hunk == null) continue;
        const path = hunk.path;
        if (path !== prevPath) rows.push({ kind: 'path', text: path });
        else rows.push({ kind: 'gap', text: '\u22ef' });
        prevPath = path;
        if (hunk.oldText != null) {
          for (const line of contentLines(hunk.oldText)) rows.push({ kind: 'del', text: line });
        }
        for (const line of contentLines(hunk.newText)) rows.push({ kind: 'add', text: line });
      }
      return rows;
    }

    /**
     * Keyword set for the lightweight per-line highlighter (TS/JS/Python/shell
     * share most of these). Matched verbatim (case-sensitive) against
     * identifier runs; everything else renders as plain text.
     */
    const HIGHLIGHT_KEYWORDS = new Set([
      'abstract','as','async','await','break','case','catch','class','const','continue','debugger',
      'declare','default','delete','do','else','enum','export','extends','false','finally','for','from',
      'function','get','if','implements','import','in','instanceof','interface','is','keyof','let',
      'namespace','new','null','of','private','protected','public','readonly','return','satisfies',
      'set','static','super','switch','this','throw','true','try','type','typeof','undefined','var',
      'void','while','with','yield','assert','infer','never','any','unknown','number','string',
      'boolean','object','symbol','bigint',
      'def','elif','pass','lambda','raise','global','nonlocal','assert','not','and','or','None','True','False','self','print',
      'echo','local','then','fi','esac','done','until',
    ]);

    /** Extension -> language id (the same mapping the ui-files viewer uses). */
    const LANG_BY_EXTENSION = {
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
    };

    /** Derive a language id from a path's extension; undefined when unknown. */
    function langFromPath(path) {
      if (typeof path !== 'string' || path === '') return undefined;
      const dot = path.lastIndexOf('.');
      if (dot <= 0) return undefined;
      const ext = path.slice(dot + 1).toLowerCase();
      return Object.prototype.hasOwnProperty.call(LANG_BY_EXTENSION, ext) ? LANG_BY_EXTENSION[ext] : undefined;
    }

    /** Languages that use '#' comments rather than slash comments. */
    const HASH_COMMENT_LANGS = new Set(['py','rb','sh','yaml','yml','toml','ini','sql','lua']);

    /** Per-line token regexes (C-style vs hash-style comments). */
    const RE_C_COMMENT = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
    const RE_HASH_COMMENT = /(#[^\n]*|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;

    /**
     * Tokenize one diff line into colored runs. This is a lightweight
     * best-effort highlighter: the shiki highlighter is internal to
     * ui-primitives and not exported to plugins, so we color comments, strings,
     * numbers, and keywords through the theme's `--shiki-*` tokens instead.
     * Returns null for an unknown/absent language (the line renders plain).
     */
    function tokenizeLine(text, lang) {
      if (text === '' || lang == null) return null;
      const re = HASH_COMMENT_LANGS.has(lang) ? RE_HASH_COMMENT : RE_C_COMMENT;
      const out = [];
      let cursor = 0;
      for (const m of text.matchAll(re)) {
        if (m.index > cursor) out.push({ text: text.slice(cursor, m.index), color: null });
        const tok = m[0];
        const c0 = tok.charCodeAt(0);
        let color = null;
        if (c0 === 47 || c0 === 35) color = 'var(--shiki-token-comment)'; // / or #
        else if (c0 === 39 || c0 === 34 || c0 === 96) color = 'var(--shiki-token-string)'; // ' " `
        else if (c0 >= 48 && c0 <= 57) color = 'var(--shiki-token-constant)'; // 0-9
        else if (HIGHLIGHT_KEYWORDS.has(tok)) color = 'var(--shiki-token-keyword)';
        out.push({ text: tok, color: color });
        cursor = m.index + tok.length;
      }
      if (cursor < text.length) out.push({ text: text.slice(cursor), color: null });
      return out;
    }

    /**
     * Render one diff line's children: highlighted spans for a known language,
     * otherwise the bare text.
     */
    function renderDiffLine(text, lang) {
      const runs = tokenizeLine(text, lang);
      if (runs == null) return text;
      return runs.map(function (run, i) {
        return run.color == null ? run.text : h('span', { key: i, style: { color: run.color } }, run.text);
      });
    }

    /**
     * A file's inline diff. Renders removed lines on a dark-red background and
     * added lines on a dark-green background, with `- `/`+ ` prefixes drawn via
     * CSS so copy semantics stay obvious without relying on color alone. This
     * replaces the stock DiffBlock (whose hashed CSS-module classes cannot be
     * restyled from an out-of-tree plugin) so the +/- backgrounds are ours.
     */
    function ChangesDiff(props) {
      const hunks = props.hunks;
      const lang = props.lang;
      const rows = React.useMemo(function () { return buildDiffRows(hunks); }, [hunks]);
      if (rows.length === 0) return null;
      return h('div', { className: 'dcf-diffBlock' },
        h('div', { className: 'dcf-diffBody' },
          rows.map(function (row, index) {
            return h('div', { key: index, className: 'dcf-diffLine ' + DIFF_ROW_CLASS[row.kind] },
              renderDiffLine(row.text, lang));
          }),
        ),
      );
    }

    // ---- The view component ----

    function ChangesView(props) {
      const useSession = props.useSession;
      const useSessions = props.useSessions;
      const useWorkspaces = props.useWorkspaces;
      const sessionId = props.sessionId;
      const snapshot = useSession(function (s) { return s; });
      // Session row (title/cwd/running) for the current session, when known.
      const session = useSessions(function (s) { return sessionId != null ? s.byId[sessionId] : undefined; });
      const cwd = session != null ? session.cwd : undefined;
      // The workspace this session belongs to (or the most recent workspace).
      const workspace = useWorkspaces != null
        ? useWorkspaces(function (s) {
            if (s == null || !Array.isArray(s.items)) return undefined;
            if (sessionId != null) {
              const bound = s.items.find(function (w) { return Array.isArray(w.sessionIds) && w.sessionIds.indexOf(sessionId) !== -1; });
              if (bound != null) return bound;
            }
            return s.items.find(function (w) { return w.workspaceId === s.recentWorkspaceId; });
          })
        : undefined;
      const batches = React.useMemo(function () { return collectChangeBatches(snapshot); }, [snapshot]);
      const totals = React.useMemo(function () {
        const fileSet = new Set();
        let added = 0;
        let removed = 0;
        for (const b of batches) {
          for (const f of b.files) {
            fileSet.add(f.path);
            added += f.added;
            removed += f.removed;
          }
        }
        return { batchCount: batches.length, fileCount: fileSet.size, added: added, removed: removed };
      }, [batches]);
      const [openBatches, setOpenBatches] = React.useState(function () { return new Set(); });
      const [openFiles, setOpenFiles] = React.useState(function () { return new Set(); });

      function toggleSet(setter, key) {
        setter(function (prev) {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      }

      const wsTitle = workspace != null ? (workspace.title || 'Workspace') : 'No workspace';
      const wsPath = workspace != null ? workspace.path : undefined;
      const sessionTitle = session != null && session.title ? session.title : 'Untitled session';
      const sessionState = session != null && session.running ? 'running' : 'idle';

      return h('section', {
        className: 'dcf-root',
        'aria-label': 'Changes',
        'data-testid': 'changes-view',
      },
        h('header', { className: 'dcf-header' },
          h('div', { className: 'dcf-headerRow' },
            h('span', { className: 'dcf-title' }, 'Changes'),
            h('span', { className: 'dcf-count' }, String(totals.batchCount)),
          ),
          h('div', { className: 'dcf-status' },
            h('div', { className: 'dcf-statusLine' },
              h('span', { className: 'dcf-statusLabel' }, wsTitle),
              wsPath != null ? h('span', { className: 'dcf-wsPath' }, wsPath) : null,
            ),
            h('div', { className: 'dcf-statusLine' },
              h('span', { className: 'dcf-statusLabel' }, sessionTitle),
              h('span', { className: 'dcf-statusMeta' }, sessionState),
              h('span', { className: 'dcf-statusMeta' },
                String(totals.fileCount) + ' files \u00b7 +' + totals.added + ' \u2212' + totals.removed),
            ),
          ),
        ),
        batches.length === 0
          ? h('div', { className: 'dcf-empty' }, 'No files changed in this session.')
          : h('ul', { className: 'dcf-list' },
              batches.map(function (batch, bi) {
                const bOpen = openBatches.has(batch.batchKey);
                let ba = 0;
                let br = 0;
                for (const f of batch.files) { ba += f.added; br += f.removed; }
                const fileCount = batch.files.length;
                return h('li', { key: batch.batchKey, className: 'dcf-batch' },
                  h('button', {
                    type: 'button',
                    className: 'dcf-batchRow',
                    'aria-expanded': bOpen,
                    onClick: function () { toggleSet(setOpenBatches, batch.batchKey); },
                  },
                    h('span', { className: 'dcf-chevron' },
                      bOpen ? h(IconChevronDownOutline14) : h(IconChevronRightOutline14)),
                    h('span', { className: 'dcf-batchBadge' }, String(bi + 1)),
                    h('span', { className: 'dcf-batchSpacer' }),
                    h('span', { className: 'dcf-meta' },
                      String(fileCount) + ' file' + (fileCount === 1 ? '' : 's') + ' \u00b7 +' + ba + ' \u2212' + br),
                  ),
                  bOpen
                    ? h('div', { className: 'dcf-batchBody' },
                        batch.files.map(function (file) {
                          const fKey = batch.batchKey + '\u0000' + file.path;
                          const fOpen = openFiles.has(fKey);
                          const label = displayPath(file.path, cwd);
                          const abs = resolveAbsolutePath(file.path, cwd);
                          const title = abs != null ? abs : label;
                          return h('div', { key: fKey, className: 'dcf-item' },
                            h('button', {
                              type: 'button',
                              className: 'dcf-row',
                              'aria-expanded': fOpen,
                              title: title,
                              onClick: function () { toggleSet(setOpenFiles, fKey); },
                            },
                              h('span', { className: 'dcf-chevron' },
                                fOpen ? h(IconChevronDownOutline14) : h(IconChevronRightOutline14)),
                              h(IconEditOutline16, { size: 14, className: 'dcf-fileicon' }),
                              h('span', { className: 'dcf-path' }, label),
                              h('span', { className: 'dcf-meta' }, '+' + file.added + ' \u2212' + file.removed),
                            ),
                            fOpen
                              ? h('div', { className: 'dcf-diff' }, h(ChangesDiff, { hunks: file.hunks, lang: langFromPath(file.path) }))
                              : null,
                          );
                        }),
                      )
                    : null,
                );
              }),
            ),
      );
    }

    // ---- Plugin body ----

    function apply(ctx) {
      ctx.slots.inject('conversation.view', function () {
        return ctx.slots.register({
          name: 'conversation.view',
          id: 'changes',
          order: 20,
          label: function () { return 'Changes'; },
        }, ChangesView);
      });
    }

    exports.apply = apply;
    exports.inject = ['slots'];

    return module.exports;
  },
});
