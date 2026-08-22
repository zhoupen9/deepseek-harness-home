/**
 * /simple mode, browser half. Renders a "Simple" chip into the composer's left
 * tool-row slot ('conversation.input.left'). The chip is only shown while simple
 * mode is active: a plan-style status pill with a close (×) icon inside —
 * clicking it (or the ×) runs /simple off to restore the previous model. When
 * inactive nothing is rendered. The host 'simple' projection drives the on/off
 * state, so the chip appears and disappears by itself after each command.
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
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    const IconCloseFill14 = primitives.IconCloseFill14;

    const STYLE_ID = '@deepseek-ai/dsh-simple-mode/simple.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = '@deepseek-ai/dsh-simple-mode';
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = [
        '.dsm-wrap { display: inline-flex; align-items: center; gap: 6px; }',
        '.dsm-chip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 11px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }',
        '.dsm-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }',
        '.dsm-chipOn { display: inline-flex; align-items: center; gap: 4px; min-width: 34px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; line-height: 20px; cursor: pointer; }',
        '.dsm-chipOn:hover:not(:disabled) { color: var(--dsw-alias-interactive-bg-hover-accent); }',
        '.dsm-chipOn:disabled, .dsm-chip:disabled { opacity: 0.6; cursor: default; }',
        '.dsm-close { display: inline-flex; align-items: center; color: currentColor; }',
        '.dsm-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; }',
      ].join('\n');
      document.head.appendChild(tag);
    }

    function SimpleChip(props) {
      const [error, setError] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const simple = props.useProjection('simple');
      // Diagnostic: log the resolved projection so the console shows whether
      // the plugin loaded and what the 'simple' projection reports. Remove after
      // confirming the chip renders.
      console.log('[simple-mode] SimpleChip mounted; useProjection type=', typeof props.useProjection, '; simple=', simple, '; enterSimple=', typeof props.enterSimple);
      // Absent projection = capability not composed = treat as inactive.
      const active = simple !== undefined && simple.active;
      // Only render while simple mode is active; off state shows no chip.
      if (!active) return null;
      const exit = function () {
        if (busy) return;
        setError(null);
        setBusy(true);
        props.exitSimple().then(function (failure) {
          setBusy(false);
          if (failure != null) setError(failure);
        });
      };
      // Active state: a plan-style status pill with a close (×) icon inside;
      // clicking the chip (or the ×) exits simple mode.
      return h('span', { className: 'dsm-wrap' },
        h('button', {
          type: 'button',
          className: 'dsm-chipOn',
          title: 'Simple mode on (deepseek-v4-flash, thinking off) — click to exit',
          'aria-label': 'Simple mode on (deepseek-v4-flash, thinking off) — click to exit',
          disabled: busy,
          onClick: exit,
        },
          'Simple',
          h('span', { className: 'dsm-close', 'aria-hidden': 'true' },
            h(IconCloseFill14, { size: 12 })),
        ),
        error !== null ? h('span', { className: 'dsm-error', role: 'status', title: error }, error) : null,
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
              enterSimple: async function () {
                const r = await ctx.remote.commands.execute(sessionId, '/simple', []);
                if (!r.ok) return r.error.message;
                if (r.value === undefined) return 'unknown command: /simple';
                return null;
              },
              exitSimple: async function () {
                const r = await ctx.remote.commands.execute(sessionId, '/simple off', []);
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
