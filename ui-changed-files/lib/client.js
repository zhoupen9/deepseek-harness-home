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
      DiffBlock,
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
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 12px 16px;',
      '  border-bottom: 1px solid var(--dsw-alias-border-l2);',
      '  flex-shrink: 0;',
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
     * Aggregate every changed file from a session's conversation snapshot.
     * Settled tool results whose result render intent is a 'diff' card
     * contribute their applied hunks; they are grouped by path in first-seen
     * order. Running calls and non-diff cards contribute nothing.
     */
    function collectChangedFiles(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.nodes)) return [];
      const byPath = new Map();
      function addHunk(path, oldText, newText) {
        let entry = byPath.get(path);
        if (entry === undefined) {
          entry = { path, hunks: [], added: 0, removed: 0 };
          byPath.set(path, entry);
        }
        entry.hunks.push({ path, oldText, newText });
        if (oldText !== null) entry.removed += countLines(oldText);
        entry.added += countLines(newText);
      }
      function walk(block) {
        if (block == null) return;
        if (block.kind === 'tool-result') {
          const rv = block.resultView;
          if (rv != null && rv.card === 'diff' && Array.isArray(rv.diffs)) {
            for (const hunk of rv.diffs) {
              if (hunk == null || typeof hunk.path !== 'string') continue;
              const oldText = hunk.oldText == null ? null : String(hunk.oldText);
              const newText = typeof hunk.newText === 'string' ? hunk.newText : '';
              addHunk(hunk.path, oldText, newText);
            }
          } else if (block.isError !== true) {
            // Code-mode sub-dispatches emit no resultView for write/edit
            // (result-time diff meta is not computed for sub-dispatches), so
            // reconstruct the hunks from the mutation call's arguments.
            const derived = deriveCallDiffs(block.call);
            if (derived != null) {
              for (const hunk of derived) addHunk(hunk.path, hunk.oldText, hunk.newText);
            }
          }
        }
        if (Array.isArray(block.subCalls)) {
          for (const child of block.subCalls) walk(child);
        }
      }
      for (const node of snapshot.nodes) {
        if (node != null && node.kind === 'tool-result') walk(node);
      }
      return Array.from(byPath.values());
    }

    // ---- The view component ----

    function ChangesView(props) {
      const useSession = props.useSession;
      const useSessions = props.useSessions;
      const sessionId = props.sessionId;
      const snapshot = useSession(function (s) { return s; });
      // The project root is the current session's workspace cwd; a changed file
      // is labeled relative to it (falling back to the absolute path).
      const cwd = useSessions(function (s) { return s.byId[sessionId] != null ? s.byId[sessionId].cwd : undefined; });
      const files = React.useMemo(function () { return collectChangedFiles(snapshot); }, [snapshot]);
      const [openPaths, setOpenPaths] = React.useState(function () { return new Set(); });

      function toggle(path) {
        setOpenPaths(function (prev) {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      }

      return h('section', {
        className: 'dcf-root',
        'aria-label': 'Changes',
        'data-testid': 'changes-view',
      },
        h('header', { className: 'dcf-header' },
          h('span', { className: 'dcf-title' }, 'Changes'),
          h('span', { className: 'dcf-count' }, String(files.length)),
        ),
        files.length === 0
          ? h('div', { className: 'dcf-empty' }, 'No files changed in this session.')
          : h('ul', { className: 'dcf-list' },
              files.map(function (file) {
                const open = openPaths.has(file.path);
                const label = displayPath(file.path, cwd);
                const abs = resolveAbsolutePath(file.path, cwd);
                // Hover shows the absolute path when one is known, so a
                // truncated relative label can still be disambiguated.
                const title = abs != null ? abs : label;
                return h('li', { key: file.path, className: 'dcf-item' },
                  h('button', {
                    type: 'button',
                    className: 'dcf-row',
                    'aria-expanded': open,
                    title: title,
                    onClick: function () { toggle(file.path); },
                  },
                    h('span', { className: 'dcf-chevron' },
                      open ? h(IconChevronDownOutline14) : h(IconChevronRightOutline14)),
                    h(IconEditOutline16, { size: 14, className: 'dcf-fileicon' }),
                    h('span', { className: 'dcf-path' }, label),
                    h('span', { className: 'dcf-meta' }, '+' + file.added + ' \u2212' + file.removed),
                  ),
                  open
                    ? h('div', { className: 'dcf-diff' }, h(DiffBlock, { diffs: file.hunks }))
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
