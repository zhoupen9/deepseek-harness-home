# @zar-desktop/ui-session-metrics — chat-header session metrics

A pure-frontend client plugin for DeepSeek Harness's web GUI. It adds a
compact metrics capsule to the **Session Header**, with one merged popup
carrying the sections the shipped session-statistics, token-usage, and
context-usage surfaces present. The capsule is **additive** and always shows
the detailed reading set: the shipped bottom-of-chat statistics pills
(ui-chat's StatsPills) and the composer context-usage meter (ui-conversation's
ContextMeter) stay exactly as their own composition renders them, and this
plugin reads no `Performance & usage` preference. The capsule anchors the left edge of the
right-aligned utility cluster
(order -11 — it takes the slot the shipped "Open In…" split button used to
occupy, so the row reads metrics · Open In… · Session log) and shows three
icon-prefixed numbers — input tokens, output tokens and context occupancy —
while a hover (or keyboard focus) opens a single
panel carrying what those three shipped popups showed separately, in the
shipped stat-dialog skin.

Everything is presentation: the plugin reads only the session-standard
projection seats (`useProjection('tokenUsage')`,
`useProjection('sessionStats')`, `useProjection('contextPressure')` and
`useProjection('contextBreakdown')`) and renders one slot entry and the panel.
It owns no service, publishes no session events, keeps no cross-session state,
shadows no shipped cell, and injects no stylesheet.

## What it looks like / how it behaves

- **Capsule** (Session Header title row, left edge of the right-aligned utility cluster): the
  token-usage database cylinder with the input and output counts, then the context ring —
  `[database] 12.2K · 517 · [ring]`. The reading order inside the token group is fixed (input,
  then output), the panel always spells the metric names out, and the capsule is always the same
  detailed presentation: it does not follow the `Performance & usage` setting and has no compact
  or hidden variant.
  The ring's arc is the occupancy percentage, drawn with the shipped meter's own radius and dash
  geometry, so the capsule carries that reading without printing a number beside it (the capsule's
  spoken label and the panel still state it). The capsule renders as soon as the session has a
  step, billable usage, or a context sample with a known capacity — the union of the shipped
  gates. The figures ride the durable whole-log projections, so paging and compaction never skew
  them.
- **Merged panel** (opens on hover or keyboard focus; the shipped stat-dialog surface —
  menu background, 12px radius, prominent elevation, 16px padding, a section
  heading with its icon and headline value, a rule, then the shipped
  two-column row grid):
  - *Session statistics* (gauge icon): the turn and step counts as the headline,
    then LLM time, tool time, average time to first token, and output speed —
    the shipped gauge dialog's rows under its own positive-figure conditions.
  - *Token usage* (database icon): the billed total as the headline, then
    cache hit, uncached input, cached input, cache write when any, and output —
    the shipped database dialog's rows. Every token count here renders in the
    shared compact form (`12.2K`, `7.1M`) rather than the shipped dialog's
    grouped exact digits, so the panel, the capsule, and the rest of the app
    read on one scale.
  - *Context usage* (ring icon): the occupancy percentage as the headline, the
    shipped composition bar, then `~used / window` and the heuristic system
    prompt / tool definitions / messages legend.
- The shipped surfaces are **left alone**: the bottom-of-chat pills (ui-chat's
  StatsPills cell `stats` of `conversation.composer.dock`) and the composer
  context meter (ui-conversation's ContextMeter) already follow the accepted
  `Performance & usage` level — ui-conversation's `ComposerPreferences` shows
  them for every level except *Hidden*. This plugin reads no such preference,
  so the capsule never changes with it. This plugin therefore owns no shadow
  cell and injects no stylesheet; shadowing that cell or hiding that meter is
  what used to suppress them at every level. Disabling this plugin removes the
  capsule and changes nothing else.

## How it is wired

| Surface | Entry id | Order | Priority | Purpose |
| --- | --- | --- | --- | --- |
| `conversation.session.header.utilities` | `session-metrics` | -11 | 0 | the capsule, leftmost of the row (left of `open-in-app`, order -10, and `session-log-download`, order 0) |

The registration uses `ctx.slots.inject`, so it waits for the declaring
conversation entry and is removed with the plugin fiber. Nothing else is
registered or injected: the shipped composer strip and context meter are the
setting's business, not this plugin's. The panel is not a registration: it is
the capsule's own portaled dialog, placed by CSS anchor positioning (the
capsule declares a per-instance `anchor-name`; the panel resolves it with
`position-anchor`, sits one 6px gap below the capsule, and aligns its right
edge to the capsule's so a wide panel opens leftward inside the window) and
wearing a copy of ui-chat's `stat-dialog.module.css` skin, because a feature
plugin may not import another feature plugin's stylesheet.

## Source layout

    packages/client/ui-session-metrics/
      package.json                # @zar-desktop/ui-session-metrics
      tsconfig.json               # standalone build config (see note)
      tsdown.config.ts            # clientBundle preset
      lib/                        # BUILT artifacts (tsdown output)
        client.js                 #   browser bundle (loader handoff format)
        index.js, invariant.js    #   node half
        types/                    #   node-half entries (hand-written here; the
                                  #   harness checkout emits these from src)
      src/index.ts                # host loader entry (no host behavior)
      src/invariant.ts            # invariant companion (no runtime invariant)
      src/client/index.ts         # plugin body: the capsule registration
      src/client/locales.ts       # zh/en namespace 'session-metrics'
      src/client/session-metrics.ts       # pure folds & display formatting
      src/client/SessionMetrics.tsx       # capsule + merged panel
      src/client/SessionMetrics.module.css
      tests/session-metrics.client.spec.ts
      INTEGRATION.md              # wiring/removal notes

## Build and test

    cd /home/zhoupeng/.dsh/packages/client/ui-session-metrics
    /home/zhoupeng/.dsh/node_modules/.bin/tsdown
    /home/zhoupeng/.dsh/node_modules/.bin/vitest run

The served bundle is re-read from disk per page load, so rebuild + a browser
refresh is enough.

The suite includes an upstream drift guard (`tests/upstream-drift.client.spec.ts`):
because a profile-local plugin may not import another feature plugin's values or
stylesheet, the shipped skin, formatting rules, copy, baseline exports, and
slot/setting contracts are mirrored here by hand, and the guard compares every
mirror against the harness the local `dsh` runs from. Point `DSH_HARNESS_DIR` at
a different checkout to check against that one.

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
