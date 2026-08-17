/**
 * Files view plugin, browser half. Registers a "Files" tab into the
 * conversation view ring (the 'conversation.view' list slot) after Chat,
 * Trajectory, and Changes. Two panes:
 *
 *   - Left: directory/file navigation tree from the workspace browse
 *     capability (workspaces.listDirectory now returns entries = directories
 *     and files = regular files).
 *   - Right: a file viewer that reads content on demand via
 *     workspaces.readFile and renders it with shiki syntax highlighting
 *     (extension-mapped language hint) through the shared CodeBlock primitive.
 *
 * It also provides a 'filesView' reveal service so chat file links (once wired)
 * can request a file to be shown here.
 *
 * Hand-rolled to match the tsdown client-bundle banner/footer protocol, loaded
 * through the profile's cordis.patch.yml dsh.client row.
 */
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-ui-files',
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    const {
      CodeBlock,
      IconChevronDownOutline14,
      IconChevronRightOutline14,
      IconFolderOpen16,
      IconCodeOutline16,
    } = primitives;

    const h = React.createElement;

    const CSS = [
      '.dff-root { flex: 1; height: 100%; display: flex; flex-direction: row; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: var(--dsw-font-family); }',
      '.dff-nav { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--dsw-alias-border-l2); }',
      '.dff-navhead { padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); font-size: 12px; font-weight: 600; line-height: 18px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.04em; }',
      '.dff-tree { flex: 1; overflow-y: auto; padding: 4px 0; }',
      '.dfi-row { display: flex; align-items: center; gap: 6px; height: 26px; padding-right: 8px; cursor: pointer; user-select: none; white-space: nowrap; }',
      '.dfi-row:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dfi-selected { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dfi-hidden { opacity: 0.6; }',
      '.dfi-chevron { display: inline-flex; flex-shrink: 0; width: 14px; color: var(--dsw-alias-label-tertiary); }',
      '.dfi-foldericon { flex-shrink: 0; color: var(--dsw-alias-label-secondary); }',
      '.dfi-fileicon { flex-shrink: 0; color: var(--dsw-alias-label-tertiary); }',
      '.dfi-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-family: var(--ds-font-family-code, ui-monospace, monospace); font-size: 12px; line-height: 18px; }',
      '.dfi-note { padding: 2px 8px 2px 0; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.dfi-error { color: var(--dsw-alias-state-error-primary); }',
      '.dff-viewer { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: auto; padding-bottom: calc(var(--dsh-composer-height, 152px) + 16px); }',
      '.dff-filehead { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2); font-family: var(--ds-font-family-code, ui-monospace, monospace); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }',
      '.dff-filepath { flex: 1; min-width: 0; word-break: break-all; }',
      '.dff-findbtn { flex-shrink: 0; height: 24px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }',
      '.dff-findbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dff-findbar { position: sticky; top: 0; z-index: 7; display: flex; align-items: center; gap: 6px; padding: 6px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }',
      '.dff-findinput-wrap { position: relative; flex: 0 0 220px; }',
      '.dff-findinput { width: 100%; height: 24px; padding: 0 24px 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: var(--ds-font-family-code, ui-monospace, monospace); font-size: 12px; line-height: 18px; outline: none; box-sizing: border-box; }',
      '.dff-findinput:focus { border-color: var(--dsw-alias-brand-primary); }',
      '.dff-findclear { position: absolute; top: 50%; right: 3px; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: none; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 1; cursor: pointer; }',
      '.dff-findclear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
      '.dff-findcount { flex-shrink: 0; min-width: 64px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }',
      '.dff-findcount-empty { color: var(--dsw-alias-state-error-primary); }',
      '.dff-findnav { flex-shrink: 0; height: 24px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }',
      '.dff-findnav:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dff-findclose { flex-shrink: 0; width: 24px; height: 24px; border: none; border-radius: 4px; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 16px; line-height: 1; cursor: pointer; }',
      '.dff-findclose:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dff-empty { padding: 32px 16px; text-align: center; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }',
      '.dff-note { padding: 6px 16px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }',
      '.dff-code { margin: 0; border-radius: 0; border: none; }',
      '.dff-codewrap { min-width: 0; }',
      '::highlight(dff-find-all) { background-color: #5b21b6; color: #fff; }',
      '::highlight(dff-find-current) { background-color: #16a34a; color: #fff; }',
      '.dff-find-match { background-color: #5b21b6; color: #fff; border-radius: 0; }',
      '.dff-find-current { background-color: #16a34a; color: #fff; }',
      '.dff-findopt { flex-shrink: 0; height: 24px; min-width: 24px; padding: 0 6px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }',
      '.dff-findopt:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dff-findopt-active { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-interactive-bg-hover-accent); }',
    ].join('\n');

    const STYLE_ID = '@deepseek-ai/dsh-client-ui-files/files.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = '@deepseek-ai/dsh-client-ui-files';
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function basename(path) {
      const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      return at === -1 ? path : path.slice(at + 1);
    }

    function parentOf(path) {
      const at = path.lastIndexOf('/');
      if (at <= 0) return path;
      return path.slice(0, at);
    }

    function resolveWorkspacePath(cwd, path) {
      if (path.startsWith('/') || /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\')) return path;
      if (cwd === undefined || cwd === '') return path;
      const base = cwd.replace(/[/\\]+$/, '');
      const rel = path.replace(/^[/\\]+/, '');
      return base + '/' + rel;
    }

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

    function langFromPath(path) {
      const base = basename(path);
      const dot = base.lastIndexOf('.');
      if (dot <= 0) return undefined;
      const ext = base.slice(dot + 1).toLowerCase();
      return Object.prototype.hasOwnProperty.call(LANG_BY_EXTENSION, ext) ? LANG_BY_EXTENSION[ext] : undefined;
    }

    // Escape a literal search string for use inside a RegExp so metacharacters
    // in the query match themselves rather than acting as pattern syntax.
    function escapeRegExp(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Every [start, end) match range in `text`. Case-sensitive when
    // `matchCase` is true, case-insensitive otherwise; empty query yields [].
    function findAllMatches(text, query, matchCase) {
      if (query === '') return [];
      const re = new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi');
      const matches = [];
      let m;
      while ((m = re.exec(text)) !== null) {
        matches.push([m.index, m.index + m[0].length]);
        if (m[0].length === 0) re.lastIndex += 1;
      }
      return matches;
    }

    // Names of the two CSS Custom Highlight groups this plugin registers.
    const HIGHLIGHT_ALL = 'dff-find-all';
    const HIGHLIGHT_CURRENT = 'dff-find-current';

    // Whether the CSS Custom Highlight API (Highlight + CSS.highlights) exists.
    function supportsHighlightApi() {
      return typeof CSS !== 'undefined' && typeof CSS.highlights !== 'undefined' && typeof Highlight !== 'undefined';
    }

    // Remove every <mark> this plugin created, restoring the token tree (or
    // plain source) it wrapped.
    function unwrapFindMarks(root) {
      const marks = root.querySelectorAll('mark.dff-find-match');
      for (let i = 0; i < marks.length; i++) {
        const mark = marks[i];
        const parent = mark.parentNode;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
    }

    // Drop any highlights this plugin registered (API groups and mark elements).
    function clearFindHighlights(root) {
      if (supportsHighlightApi()) {
        if (CSS.highlights.has(HIGHLIGHT_ALL)) CSS.highlights.delete(HIGHLIGHT_ALL);
        if (CSS.highlights.has(HIGHLIGHT_CURRENT)) CSS.highlights.delete(HIGHLIGHT_CURRENT);
      }
      if (root != null) unwrapFindMarks(root);
    }

    // Collect the non-empty text nodes under `root` in document order.
    function collectTextNodes(root) {
      const textNodes = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode()) !== null) {
        if (node.nodeValue.length > 0) textNodes.push(node);
      }
      return textNodes;
    }

    // Build a DOM Range over `textNodes` spanning [start, end) character
    // offsets, without splitting or wrapping any node. Returns null only when
    // the offsets cannot be mapped (not expected for computed matches).
    function makeRange(textNodes, start, end) {
      const range = document.createRange();
      let offset = 0;
      let startNode = null;
      let startOffset = 0;
      let endNode = null;
      let endOffset = 0;
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        const len = node.nodeValue.length;
        const nodeStart = offset;
        const nodeEnd = offset + len;
        if (startNode === null && start >= nodeStart && start < nodeEnd) {
          startNode = node;
          startOffset = start - nodeStart;
        }
        if (end > nodeStart && end <= nodeEnd) {
          endNode = node;
          endOffset = end - nodeStart;
          break;
        }
        offset = nodeEnd;
      }
      if (startNode === null || endNode === null) return null;
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    }

    // Create a Highlight holding the given ranges.
    function makeHighlight(ranges) {
      const highlight = new Highlight();
      for (let i = 0; i < ranges.length; i++) highlight.add(ranges[i]);
      return highlight;
    }

    // Fallback for browsers without the CSS Custom Highlight API: wrap the
    // matched text fragments in <mark> elements (selection-style, no radius).
    function applyMarksFallback(pre, textNodes, matches, currentIndex, highlightAll) {
      unwrapFindMarks(pre);
      const idx = Math.min(currentIndex, matches.length - 1);
      const perNode = textNodes.map(function () { return []; });
      let offset = 0;
      for (let i = 0; i < textNodes.length; i++) {
        const len = textNodes[i].nodeValue.length;
        const nodeStart = offset;
        const nodeEnd = offset + len;
        for (let m = 0; m < matches.length; m++) {
          if (!highlightAll && m !== idx) continue;
          const ms = matches[m][0];
          const me = matches[m][1];
          if (me <= nodeStart || ms >= nodeEnd) continue;
          perNode[i].push({ start: Math.max(ms, nodeStart) - nodeStart, end: Math.min(me, nodeEnd) - nodeStart, index: m });
        }
        offset = nodeEnd;
      }
      for (let i = 0; i < textNodes.length; i++) {
        const ranges = perNode[i];
        if (ranges.length === 0) continue;
        ranges.sort(function (a, b) { return b.start - a.start; });
        let cur = textNodes[i];
        for (let r = 0; r < ranges.length; r++) {
          const range = ranges[r];
          cur.splitText(range.end);
          const mid = cur.splitText(range.start);
          const mark = document.createElement('mark');
          mark.className = 'dff-find-match' + (range.index === idx ? ' dff-find-current' : '');
          mid.parentNode.replaceChild(mark, mid);
          mark.appendChild(mid);
        }
      }
      return matches.length;
    }

    // Highlight every match (and the current match) via the CSS Custom Highlight
    // API when available, falling back to <mark> wrapping otherwise. Returns the
    // match count and the current match's Range (for scrolling; null on the mark
    // fallback, where scrolling targets the current mark).
    function applyFindHighlights(container, query, currentIndex, matchCase, highlightAll) {
      const pre = container.querySelector('pre');
      clearFindHighlights(pre);
      if (query === '' || pre == null) return { count: 0, currentRange: null };
      const textNodes = collectTextNodes(pre);
      if (textNodes.length === 0) return { count: 0, currentRange: null };
      const fullText = textNodes.map(function (n) { return n.nodeValue; }).join('');
      const matches = findAllMatches(fullText, query, matchCase);
      if (matches.length === 0) return { count: 0, currentRange: null };
      if (supportsHighlightApi()) {
        const ranges = [];
        for (let m = 0; m < matches.length; m++) {
          const r = makeRange(textNodes, matches[m][0], matches[m][1]);
          if (r != null) ranges.push(r);
        }
        if (ranges.length === 0) return { count: 0, currentRange: null };
        const idx = Math.min(currentIndex, ranges.length - 1);
        if (highlightAll) CSS.highlights.set(HIGHLIGHT_ALL, makeHighlight(ranges));
        CSS.highlights.set(HIGHLIGHT_CURRENT, makeHighlight([ranges[idx]]));
        return { count: ranges.length, currentRange: ranges[idx] };
      }
      const count = applyMarksFallback(pre, textNodes, matches, currentIndex, highlightAll);
      return { count: count, currentRange: null };
    }

    // Scroll the viewer so the current match sits vertically centered. Uses the
    // current Range on the API path, or the current <mark> on the fallback.
    function scrollCurrentIntoView(container, viewerEl, currentRange) {
      if (viewerEl == null) return;
      let rect = null;
      if (currentRange != null) {
        rect = currentRange.getBoundingClientRect();
      } else {
        const mark = container.querySelector('mark.dff-find-current');
        if (mark != null) rect = mark.getBoundingClientRect();
      }
      if (rect == null) return;
      const viewerRect = viewerEl.getBoundingClientRect();
      viewerEl.scrollTop = viewerEl.scrollTop + (rect.top - viewerRect.top) - viewerRect.height / 2 + rect.height / 2;
    }

    function FilesView(props) {
      const useSessions = props.useSessions;
      const sessionId = props.sessionId;
      const listDirectory = props.listDirectory;
      const readFile = props.readFile;
      const revealService = props.revealService;

      const cwd = useSessions(function (s) { return s.byId[sessionId] != null ? s.byId[sessionId].cwd : undefined; });

      const [selected, setSelected] = React.useState(null);
      const [expanded, setExpanded] = React.useState(function () { return new Set(); });
      const [dirs, setDirs] = React.useState(function () { return new Map(); });
      const [content, setContent] = React.useState({ status: 'idle' });

      // Find state: bar visibility, the query, the active match index, the
      // total match count, and the two find options (held in state so the bar
      // re-renders on change).
      const [findOpen, setFindOpen] = React.useState(false);
      const [query, setQuery] = React.useState('');
      const [currentIndex, setCurrentIndex] = React.useState(0);
      const [matchCount, setMatchCount] = React.useState(0);
      const [matchCase, setMatchCase] = React.useState(false);
      const [highlightAllMatches, setHighlightAllMatches] = React.useState(true);

      const viewerRef = React.useRef(null);
      const codeContainerRef = React.useRef(null);
      const findInputRef = React.useRef(null);

      function openFind() {
        setFindOpen(true);
      }

      function closeFind() {
        setFindOpen(false);
        setQuery('');
        setCurrentIndex(0);
        setMatchCount(0);
      }

      function stepMatch(delta) {
        setCurrentIndex(function (prev) {
          if (matchCount === 0) return 0;
          return (prev + delta + matchCount) % matchCount;
        });
      }

      function toggleMatchCase() {
        setMatchCase(function (v) { return !v; });
        setCurrentIndex(0);
      }

      function toggleHighlightAll() {
        setHighlightAllMatches(function (v) { return !v; });
      }

      function clearQuery() {
        setQuery('');
        setCurrentIndex(0);
        setMatchCount(0);
        if (findInputRef.current != null) findInputRef.current.focus();
      }

      const loadDir = React.useCallback(function (path) {
        setDirs(function (prev) {
          const next = new Map(prev);
          if (!next.has(path)) next.set(path, { entries: [], files: [], loading: true, error: null });
          return next;
        });
        listDirectory(path).then(
          function (listing) {
            setDirs(function (prev) {
              const next = new Map(prev);
              next.set(path, {
                entries: Array.isArray(listing.entries) ? listing.entries : [],
                files: Array.isArray(listing.files) ? listing.files : [],
                loading: false,
                error: null,
              });
              return next;
            });
          },
          function (err) {
            setDirs(function (prev) {
              const next = new Map(prev);
              next.set(path, { entries: [], files: [], loading: false, error: (err != null && err.message) ? err.message : String(err) });
              return next;
            });
          },
        );
      }, [listDirectory]);

      React.useEffect(function () {
        if (cwd == null) return;
        setExpanded(new Set([cwd]));
        setDirs(new Map());
        setSelected(null);
        setContent({ status: 'idle' });
        loadDir(cwd);
      }, [cwd, loadDir]);

      // Read the selected file on demand.
      React.useEffect(function () {
        if (selected == null) { setContent({ status: 'idle' }); return; }
        let cancelled = false;
        setContent({ status: 'loading' });
        readFile(selected).then(
          function (res) {
            if (cancelled) return;
            setContent({ status: 'ready', text: res.text, binary: res.binary === true, truncated: res.truncated === true });
          },
          function (err) {
            if (cancelled) return;
            setContent({ status: 'error', error: (err != null && err.message) ? err.message : String(err) });
          },
        );
        return function () { cancelled = true; };
      }, [selected, readFile]);

      // Reveal requests (from chat file links and any future reveal wiring).
      React.useEffect(function () {
        if (revealService == null) return;
        const applyPending = function () {
          const path = revealService.getPending();
          if (path == null) return;
          const abs = resolveWorkspacePath(cwd, path);
          setSelected(abs);
          const parent = parentOf(abs);
          setExpanded(function (prev) {
            const next = new Set(prev);
            next.add(parent);
            return next;
          });
          loadDir(parent);
        };
        // A reveal requested before this view mounted (e.g. while Chat was
        // active) is still pending; apply it now, then follow live requests.
        applyPending();
        return revealService.subscribe(applyPending);
      }, [revealService, cwd, loadDir]);

      // A new file selection starts a clean find.
      React.useEffect(function () {
        setFindOpen(false);
        setQuery('');
        setCurrentIndex(0);
        setMatchCount(0);
      }, [selected]);

      // Apply and maintain the find highlights as the content, query, options,
      // or current match change. A MutationObserver catches CodeBlock's
      // plain -> shiki swap when a lazy grammar loads and re-applies over the
      // new token tree. The appliedPre/appliedSig guard makes re-application a
      // no-op once the ranges are registered, so observer notifications settle.
      React.useEffect(function () {
        const container = codeContainerRef.current;
        if (container == null) return;
        let appliedPre = null;
        let appliedSig = '';

        function apply() {
          const pre = container.querySelector('pre');
          const sig = query + '\u0000' + String(currentIndex) + '\u0000' + (matchCase ? '1' : '0') + '\u0000' + (highlightAllMatches ? '1' : '0');
          if (pre === appliedPre && sig === appliedSig) return;
          appliedPre = pre;
          appliedSig = sig;
          const result = applyFindHighlights(container, query, currentIndex, matchCase, highlightAllMatches);
          setMatchCount(result.count);
          scrollCurrentIntoView(container, viewerRef.current, result.currentRange);
        }

        apply();
        const observer = new MutationObserver(function () { apply(); });
        observer.observe(container, { childList: true, subtree: true });
        return function () {
          observer.disconnect();
          clearFindHighlights(null);
        };
      }, [content, query, currentIndex, matchCase, highlightAllMatches]);

      // Global find shortcut (Ctrl/Cmd+F) and Escape, active only while this tab
      // is mounted (i.e. the Files view is the active conversation view).
      React.useEffect(function () {
        function onKeyDown(e) {
          if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
            e.preventDefault();
            if (findOpen) {
              if (findInputRef.current != null) { findInputRef.current.focus(); findInputRef.current.select(); }
            } else {
              setFindOpen(true);
            }
            return;
          }
          if (e.key === 'Escape' && findOpen) {
            e.preventDefault();
            closeFind();
          }
        }
        document.addEventListener('keydown', onKeyDown);
        return function () { document.removeEventListener('keydown', onKeyDown); };
      }, [findOpen]);

      // Focus (and select) the query input when the find bar opens.
      React.useEffect(function () {
        if (findOpen && findInputRef.current != null) {
          findInputRef.current.focus();
          findInputRef.current.select();
        }
      }, [findOpen]);

      function toggleDir(path) {
        const isExpanded = expanded.has(path);
        if (!isExpanded && !dirs.has(path)) loadDir(path);
        setExpanded(function (prev) {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      }

      function renderRows(dirPath, depth, rows) {
        const isExpanded = expanded.has(dirPath);
        const info = dirs.get(dirPath);
        const subDirs = info != null && Array.isArray(info.entries) ? info.entries : [];
        const subFiles = info != null && Array.isArray(info.files) ? info.files : [];

        rows.push(h('div', { key: dirPath, className: 'dfi-row dfi-dir', style: { paddingLeft: (8 + depth * 14) + 'px' }, onClick: function () { toggleDir(dirPath); } },
          h('span', { className: 'dfi-chevron' }, isExpanded ? h(IconChevronDownOutline14) : h(IconChevronRightOutline14)),
          h(IconFolderOpen16, { size: 14, className: 'dfi-foldericon' }),
          h('span', { className: 'dfi-name' }, basename(dirPath)),
        ));

        if (isExpanded) {
          if (info != null && info.loading) {
            rows.push(h('div', { key: dirPath + ':loading', className: 'dfi-note', style: { paddingLeft: (8 + (depth + 1) * 14) + 'px' } }, 'Loading...'));
          } else if (info != null && info.error) {
            rows.push(h('div', { key: dirPath + ':error', className: 'dfi-note dfi-error', style: { paddingLeft: (8 + (depth + 1) * 14) + 'px' } }, info.error));
          }
          for (const sd of subDirs) {
            renderRows(sd.path, depth + 1, rows);
          }
          for (const sf of subFiles) {
            const isHidden = sf.hidden === true;
            rows.push(h('div', { key: sf.path, className: 'dfi-row dfi-file' + (selected === sf.path ? ' dfi-selected' : '') + (isHidden ? ' dfi-hidden' : ''), style: { paddingLeft: (8 + (depth + 1) * 14) + 'px' }, title: sf.path, onClick: function () { setSelected(sf.path); } },
              h('span', { className: 'dfi-chevron' }, ' '),
              h(IconCodeOutline16, { size: 14, className: 'dfi-fileicon' }),
              h('span', { className: 'dfi-name' }, sf.name),
            ));
          }
        }
      }

      function renderFindBar() {
        let countLabel = '';
        if (query !== '') {
          countLabel = matchCount === 0 ? 'No results' : (currentIndex + 1) + ' / ' + matchCount;
        }
        return h('div', { className: 'dff-findbar', role: 'search' },
          h('div', { className: 'dff-findinput-wrap' },
            h('input', {
              ref: findInputRef,
              className: 'dff-findinput',
              type: 'text',
              value: query,
              placeholder: 'Find in file',
              'aria-label': 'Find in file',
              spellCheck: 'false',
              autoComplete: 'off',
              onChange: function (e) { setQuery(e.target.value); setCurrentIndex(0); },
              onKeyDown: function (e) {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) stepMatch(-1); else stepMatch(1);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  closeFind();
                }
              },
            }),
            query !== ''
              ? h('button', { type: 'button', className: 'dff-findclear', title: 'Clear find', 'aria-label': 'Clear find', onClick: clearQuery }, '\u00d7')
              : null,
          ),
          h('span', { className: 'dff-findcount' + (query !== '' && matchCount === 0 ? ' dff-findcount-empty' : ''), 'aria-live': 'polite' }, countLabel),
          h('button', { type: 'button', className: 'dff-findopt' + (matchCase ? ' dff-findopt-active' : ''), title: 'Match case', 'aria-pressed': matchCase, onClick: toggleMatchCase }, 'Aa'),
          h('button', { type: 'button', className: 'dff-findopt' + (highlightAllMatches ? ' dff-findopt-active' : ''), title: 'Highlight all matches', 'aria-pressed': highlightAllMatches, onClick: toggleHighlightAll }, 'All'),
          h('button', { type: 'button', className: 'dff-findnav', title: 'Previous match (Shift+Enter)', onClick: function () { stepMatch(-1); } }, 'Prev'),
          h('button', { type: 'button', className: 'dff-findnav', title: 'Next match (Enter)', onClick: function () { stepMatch(1); } }, 'Next'),
          h('button', { type: 'button', className: 'dff-findclose', title: 'Close find (Esc)', 'aria-label': 'Close find', onClick: function () { closeFind(); } }, '\u00d7'),
        );
      }

      const rows = [];
      if (cwd != null) renderRows(cwd, 0, rows);

      let viewer;
      if (selected == null) {
        viewer = h('div', { className: 'dff-empty' }, 'Select a file to view it.');
      } else if (content.status === 'loading') {
        viewer = h('div', { className: 'dff-viewer' },
          h('div', { className: 'dff-filehead' }, selected),
          h('div', { className: 'dff-empty' }, 'Loading...'),
        );
      } else if (content.status === 'error') {
        viewer = h('div', { className: 'dff-viewer' },
          h('div', { className: 'dff-filehead' }, selected),
          h('div', { className: 'dff-empty' }, 'Cannot read file: ' + content.error),
        );
      } else if (content.status === 'ready' && content.binary) {
        viewer = h('div', { className: 'dff-viewer' },
          h('div', { className: 'dff-filehead' }, selected),
          h('div', { className: 'dff-empty' }, 'Binary file - cannot preview.'),
        );
      } else if (content.status === 'ready') {
        viewer = h('div', { className: 'dff-viewer', ref: viewerRef },
          h('div', { className: 'dff-filehead' },
            h('span', { className: 'dff-filepath', title: selected }, selected),
            h('button', { type: 'button', className: 'dff-findbtn', title: 'Find in file (Ctrl+F)', onClick: openFind }, 'Find'),
          ),
          findOpen ? renderFindBar() : null,
          content.truncated ? h('div', { className: 'dff-note' }, 'Preview truncated (file too large).') : null,
          h('div', { className: 'dff-codewrap', ref: codeContainerRef },
            h(CodeBlock, { code: content.text, lang: langFromPath(selected), className: 'dff-code' }),
          ),
        );
      } else {
        viewer = h('div', { className: 'dff-empty' }, 'Select a file to view it.');
      }

      return h('section', { className: 'dff-root', 'aria-label': 'Files', 'data-testid': 'files-view', 'data-conversation-composer-overlay': '' },
        h('aside', { className: 'dff-nav' },
          h('div', { className: 'dff-navhead' }, 'Workspace'),
          h('div', { className: 'dff-tree' }, rows),
        ),
        viewer,
      );
    }

    function activateFilesTab() {
      if (typeof document === 'undefined') return false;
      const tabs = document.querySelectorAll('[role="tab"]');
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (tab.textContent != null && tab.textContent.trim() === 'Files') {
          tab.click();
          return true;
        }
      }
      return false;
    }

    function apply(ctx) {
      const revealListeners = new Set();
      let pendingPath = null;
      const revealService = {
        reveal: function (path) { pendingPath = path; for (const fn of revealListeners) fn(); },
        subscribe: function (fn) { revealListeners.add(fn); return function () { revealListeners.delete(fn); }; },
        getPending: function () { return pendingPath; },
      };
      ctx.provide('filesView', revealService);

      // Chat file links resolve through the Host's `workspaces.openPath`, which
      // is a no-op in the browser (no OS "open"). Route it into this Files tab
      // instead: reveal the path and switch the active view. This is the only
      // production caller of openPath in the web client.
      const workspaces = ctx.workspaces;
      if (workspaces != null && typeof workspaces.openPath === 'function') {
        const originalOpenPath = workspaces.openPath;
        workspaces.openPath = function openFileInFilesView(path) {
          try {
            revealService.reveal(path);
            activateFilesTab();
          } catch (error) {
            // Unexpected failure: fall back to the Host OS-open.
            return originalOpenPath.call(workspaces, path);
          }
          return Promise.resolve();
        };
      }

      ctx.slots.inject('conversation.view', function () {
        return ctx.slots.register({
          name: 'conversation.view',
          id: 'files',
          order: 30,
          label: function () { return 'Files'; },
          inject: function () {
            return {
              listDirectory: function (path, signal) { return ctx.workspaces.listDirectory(path, signal); },
              readFile: function (path, signal) { return ctx.workspaces.readFile(path, signal); },
              revealService: revealService,
            };
          },
        }, FilesView);
      });
    }

    exports.apply = apply;
    exports.inject = ['slots', 'workspaces'];

    return module.exports;
  },
});
