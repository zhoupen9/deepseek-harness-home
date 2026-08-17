/* Font + compact-scale override client plugin (Option B): injected <style> that
 * re-points --dsw-font-family / --ds-font-family-code, widens the chat column,
 * and scales the typography to ~3/4 of the shipped defaults. Registered via the
 * profile's cordis.patch.yml dsh.client row. The handoff mirrors the tsdown
 * client-bundle banner/footer protocol. */
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-font-inter-monaspace',
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;

    var CSS = [
      "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
      ':root {',
      "  --dsw-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;",
      "  --ds-font-family-code: 'Monaspace Neon', 'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier, 'PingFang SC', 'Microsoft YaHei';",
      '}',
      '/* Chat content fills the column; the composer/input card is capped at 900px. */',
      '[data-phase] {',
      '  --dsh-chat-content-width: 10000px !important;',
      '  --dsh-composer-card-max-width: 900px !important;',
      '}',
      '/* ~3/4 typography scale (shipped defaults from gradient-shadow-text.css). */',
      'body {',
      '  font-size: 12px;',
      '  --dsw-font-markdown-base: 13px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-base-strong: 600 13px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-base-italic: italic 13px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-base-strong-italic: italic 600 13px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-small: 11px/18px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-small-strong: 600 11px/18px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-small-italic: italic 11px/18px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-small-strong-italic: italic 600 11px/18px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-table: 11px/19px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-table-head: 500 11px/19px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-h1: 700 18px/26px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-h2: 700 17px/24px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-h3: 700 15px/23px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-h4: 600 12px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-markdown-code: 12px/17px var(--ds-font-family-code) !important;',
      '  --dsw-font-markdown-code-block: 10px/17px var(--ds-font-family-code) !important;',
      '  --dsw-font-markdown-code-block-small: 10px/14px var(--ds-font-family-code) !important;',
      '  --dsw-font-xl-24: 600 18px/24px var(--dsw-font-family) !important;',
      '  --dsw-font-l-20: 500 15px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-m-18: 500 12px/21px var(--dsw-font-family) !important;',
      '  --dsw-font-base-16: 12px/18px var(--dsw-font-family) !important;',
      '  --dsw-font-base-strong-16: 500 12px/18px var(--dsw-font-family) !important;',
      '  --dsw-font-s-14: 11px/17px var(--dsw-font-family) !important;',
      '  --dsw-font-s-strong-14: 500 11px/17px var(--dsw-font-family) !important;',
      '  --dsw-font-xs-13: 10px/15px var(--dsw-font-family) !important;',
      '  --dsw-font-xs-strong-13: 500 10px/15px var(--dsw-font-family) !important;',
      '  --dsw-font-xxs-12: 10px/14px var(--dsw-font-family) !important;',
      '  --dsw-font-xxs-strong-12: 500 10px/14px var(--dsw-font-family) !important;',
      '  --dsw-font-xxxs-11: 10px/14px var(--dsw-font-family) !important;',
      '  --dsw-font-xxxs-strong-11: 500 10px/14px var(--dsw-font-family) !important;',
      '}',
      '/* Darken the main text a little in dark mode (label-primary was near-white 249,250,251). */',
      'body[data-ds-dark-theme] {',
      '  --dsw-alias-label-primary: rgb(207, 211, 214) !important;',
      '}',
    ].join('\n');

    var tagId = '@deepseek-ai/dsh-font-inter-monaspace/fonts.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      var tag = document.createElement('style');
      tag.dataset.plugin = '@deepseek-ai/dsh-font-inter-monaspace';
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function apply() {}

    exports.apply = apply;
    return module.exports;
  },
});
