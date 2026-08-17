/**
 * /simple mode, browser half. Renders a "Simple" chip with an X into the
 * composer's left tool-row slot ('conversation.input.left') while the host
 * 'simple' projection reports active. The X runs /simple off over the command
 * RPC, which restores the previous model.
 *
 * Hand-rolled to match the tsdown client-bundle banner/footer protocol, loaded
 * through the profile's cordis.patch.yml dsh.client row.
 */
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-simple-mode',
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const h = React.createElement;

    const STYLE_ID = '@deepseek-ai/dsh-simple-mode/simple.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = '@deepseek-ai/dsh-simple-mode';
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = [
        '.dsm-wrap { display: inline-flex; align-items: center; }',
        '.dsm-chip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 11px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }',
        '.dsm-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }',
        '.dsm-close { display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px; color: var(--dsw-alias-label-tertiary); }',
        '.dsm-error { margin-left: 6px; font-size: 12px; color: var(--dsw-alias-state-error-primary); }',
      ].join('\n');
      document.head.appendChild(tag);
    }

    function SimpleChip(props) {
      const [error, setError] = React.useState(null);
      const simple = props.useProjection('simple');
      if (simple === undefined || !simple.active) return null;
      return h('span', { className: 'dsm-wrap' },
        h('button', {
          type: 'button',
          className: 'dsm-chip',
          title: 'Simple mode on — click to exit',
          'aria-label': 'Simple mode on — click to exit',
          onClick: function () {
            setError(null);
            props.exitSimple().then(function (failure) {
              if (failure != null) setError(failure);
            });
          },
        }, 'Simple', h('span', { className: 'dsm-close', 'aria-hidden': 'true' }, '×')),
        error !== null ? h('span', { className: 'dsm-error', role: 'status', title: error }, 'failed to exit simple mode') : null,
      );
    }

    function apply(ctx) {
      ctx.slots.inject('conversation.input.left', function () {
        return ctx.slots.register({
          name: 'conversation.input.left',
          id: 'simple',
          order: 0,
          inject: function (sessionId) {
            return {
              exitSimple: async function () {
                const r = await ctx.remote.commands.execute(sessionId, '/simple off');
                if (!r.ok) return r.error.message;
                if (r.value === undefined) return 'unknown command: /simple off';
                return null;
              },
            };
          },
        }, SimpleChip);
      });
    }

    exports.apply = apply;
    exports.inject = ['slots', 'remote', 'remote.commands'];

    return module.exports;
  },
});
