# @deepseek-ai/dsh-client-ui-session-metrics — chat-header session metrics

A pure-frontend client plugin for DeepSeek Harness's web GUI. It **replaces
the bottom-of-chat statistics pills** (ui-chat's StatsPills: the gauge and
database pills under the composer, whose click-open dialogs are the shipped
session-statistics and token-usage dialogs) and the **composer context-usage
meter** (ui-conversation's ContextMeter, the ring below the card) with a
compact metrics capsule in the **Session Header** and one merged popup behind
it. The capsule anchors the left edge of the right-aligned utility cluster
(order -11 — it takes the slot the shipped "Open In…" split button used to
occupy, so the row reads metrics · Open In… · Session log) and shows three
icon-prefixed numbers — input tokens, output tokens and context occupancy —
while a hover (or keyboard focus) opens a single
panel carrying what those three shipped popups showed separately, in the
shipped stat-dialog skin.

Everything is presentation: the plugin reads only the session-standard
projection seats (`useProjection('tokenUsage')`,
`useProjection('sessionStats')`, `useProjection('contextPressure')` and
`useProjection('contextBreakdown')`) and renders two slot entries, one
stylesheet, and the panel. It owns no service, publishes no session events, and
keeps no cross-session state.

## What it looks like / how it behaves

- **Capsule** (Session Header title row, left edge of the right-aligned utility cluster): the shipped
  metric icons carrying three readings — the token-usage database cylinder with
  the input and output counts, then the context ring:
  `[database] 12.2K · 517 · [ring]`. The ring is live: its arc is the occupancy
  percentage, drawn with the shipped meter's own radius and dash geometry, so
  the capsule carries that reading without printing a number beside it (the
  trigger's spoken label and the panel still state it). The reading order
  inside the token group is fixed (input, then output) and the panel always
  spells the metric names out. Token speed and cache-hit rate are not on the
  capsule — they live in the panel, which is where they are worth reading. The
  capsule renders as soon as the session has a step, billable usage, or a
  context sample with a known capacity — the union of the shipped gates, which
  is exactly what this plugin now hides — and the figures ride the durable
  whole-log projections, so paging and compaction never skew them.
- **Merged panel** (hover or keyboard focus; the shipped stat-dialog surface —
  menu background, 12px radius, prominent elevation, 16px padding, a section
  heading with its icon and headline value, a rule, then the shipped
  two-column row grid):
  - *Session statistics* (gauge icon): turn and step counts as the headline,
    then LLM time, tool time, average time to first token, and output speed —
    the shipped gauge dialog's rows under its own positive-figure conditions.
  - *Token usage* (database icon): the billed total as the headline, then
    cache hit, uncached input, cached input, cache write when any, and output —
    the shipped database dialog's rows.
  - *Context usage* (ring icon): the occupancy percentage as the headline, the
    shipped composition bar, then `~used / window` and the heuristic system
    prompt / tool definitions / messages legend.
- The bottom-of-chat pills are **shadowed, not patched**: this plugin reuses
  the shipped `stats` cell of `conversation.composer.dock` at priority -1
  (ui-chat's StatsPills register that cell at priority 0; same-id cells only
  clash at equal priority, and the lowest priority renders) and renders an
  empty occupant. Removing or disabling this plugin lets the shipped pills and
  their dialogs come back unchanged.
- The composer context meter is **hidden by an injected stylesheet**: the
  composer renders that meter directly rather than through a slot, so it owns
  no cell to shadow. The plugin appends a `<style>` naming the meter by the
  static facts its markup exposes (a `span` whose direct child is the meter
  button, whose own direct child is the 14px progress ring) and removes it on
  unload. This is the only coupling to shipped markup in the plugin: if
  ui-conversation ever renders that meter differently the stylesheet simply
  stops matching and the meter reappears; a slot for the meter would remove
  the need for it altogether.

## How it is wired

| Surface | Entry id | Order | Priority | Purpose |
| --- | --- | --- | --- | --- |
| `conversation.session.header.utilities` | `session-metrics` | -11 | 0 | the capsule, leftmost of the row (left of `open-in-app`, order -10, and `session-log-download`, order 0) |
| `conversation.composer.dock` | `stats` | — | -1 | shadows ui-chat StatsPills (priority 0) → pills and their dialogs removed |
| `document.head` (injected stylesheet) | — | — | — | hides ui-conversation's composer context meter |

Both registrations use `ctx.slots.inject`, so they wait for the declaring
conversation entries and are removed with the plugin fiber. The
composer-meter stylesheet is a `ctx.effect` over `document.head` and leaves
with the same fiber. The panel is not a registration: it is the capsule's own
portaled dialog, placed through `ui-primitives`' `useAnchoredPosition` (the
seat the shipped dialogs use) and wearing a copy of ui-chat's
`stat-dialog.module.css` skin, because a feature plugin may not import
another feature plugin's stylesheet.

## Source layout

    packages/client/ui-session-metrics/
      package.json                # @deepseek-ai/dsh-client-ui-session-metrics
      tsconfig.json               # standalone build config (see note)
      tsdown.config.ts            # clientBundle preset
      lib/                        # BUILT artifacts (tsdown output)
        client.js                 #   browser bundle (loader handoff format)
        index.js, invariant.js    #   node half
        types/                    #   node-half entries (hand-written here; the
                                  #   harness checkout emits these from src)
      src/index.ts                # host loader entry (no host behavior)
      src/invariant.ts            # invariant companion (no runtime invariant)
      src/client/index.ts         # plugin body: slot registrations + meter stylesheet
      src/client/locales.ts       # zh/en namespace 'session-metrics'
      src/client/session-metrics.ts       # pure folds & display formatting
      src/client/SessionMetrics.tsx       # capsule + merged panel + suppressor
      src/client/SessionMetrics.module.css
      tests/session-metrics.client.spec.ts
      INTEGRATION.md              # wiring/removal notes

## Build and test

    cd /home/zhoupeng/.dsh/packages/client/ui-session-metrics
    /home/zhoupeng/.dsh/node_modules/.bin/tsdown
    /home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/session-metrics.client.spec.ts

The served bundle is re-read from disk per page load, so rebuild + a browser
refresh is enough.

## Notes

- **tsconfig.json** here is the standalone build config. When (if ever) this
  package is dropped into the harness checkout, restore the harness tsconfig
  (`extends ../../../tsconfig.base.client.json` + project references) and
  replace the hand-written `lib/types/*.js` node-half entries with tsc
  output.
- The bundle requests only baseline module-table rows: react, react-dom,
  react/jsx-runtime, and ``deepseek-ai/dsh-client-ui-primitives` (the shipped
  dialogs' icons and the placement hook). No package-specific external is
  declared, so the manifest stays free of duplicate baseline entries.
- Row labels, row order, visibility conditions, and formats mirror ui-chat's
  two stat dialogs and ui-conversation's meter panel one-for-one, so the merged
  panel and the popups it replaced never disagreed about a number or a name.
- The panel mirrors that shipped surface instead of importing it. If ui-chat
  restyles `stat-dialog.module.css` or reorders those rows, this package has
  to follow.
