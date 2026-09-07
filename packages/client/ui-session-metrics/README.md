# @deepseek-ai/dsh-client-ui-session-metrics — chat-header session metrics

A pure-frontend client plugin for DeepSeek Harness's web GUI. It **replaces
the bottom-of-chat statistics strip** (ui-chat's StatsLine, the "turns/steps |
LLM … | cache … | tokens" line under the composer) with a compact metrics
capsule in the **Session Header**: the capsule sits immediately left of the
"Session log" download button and shows three numbers — cache-hit rate, input
tokens and output tokens — and a hover (or keyboard focus) opens a details
panel with the full session metrics.

Everything is presentation: the plugin reads only the session-standard
projection seats (`useProjection('tokenUsage')` / `useProjection('sessionStats')`)
and registers two slot entries. It owns no service, publishes no session
events, and keeps no cross-session state.

## What it looks like / how it behaves

- **Capsule** (right side of the Session Header tab row): e.g.
  `缓存命中 62% · 输入 12.2K · 输出 517` (zh) / `Cache hit 62% · Input 12.2K ·
  Output 517` (en). It renders nothing until the session has billable usage,
  and the figures ride the durable whole-log projections, so paging and
  compaction never skew them.
- **Hover / focus panel**: turn & step counts, model and tool wall times,
  average first-token latency, decode throughput (`tok/s`), the exact token
  buckets (input total with cache-read / cache-write / uncached sub-rows,
  output), and the cache-hit share. Timing rows come from the
  `sessionStats` projection and are omitted when that projection is absent.
- The bottom-of-chat strip is **shadowed, not patched**: this plugin reuses
  the shipped `stats` cell of `conversation.composer.dock` with order -1
  (the shipped StatsLine registers that cell at order 0) and renders an empty
  occupant. Removing or disabling this plugin lets the shipped strip come
  back unchanged.

## How it is wired

| Slot | Entry id | Order | Purpose |
| --- | --- | --- | --- |
| `conversation.session.header.tabs.utilities` | `session-metrics` | -1 | the capsule (left of `session-log-download`, order 0) |
| `conversation.composer.dock` | `stats` | -1 | shadows ui-chat StatsLine (order 0) → strip removed |

Both registrations use `ctx.slots.inject`, so they wait for the declaring
conversation entries and are removed with the plugin fiber.

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
      src/client/index.ts         # plugin body: two slot registrations
      src/client/locales.ts       # zh/en namespace 'session-metrics'
      src/client/session-metrics.ts       # pure folds & display formatting
      src/client/SessionMetrics.tsx       # capsule + hover panel + suppressor
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
- Numeric display rules (compact K/M token counts, grouped exact counts,
  cache-hit rounding that never shows a partial hit as 100%, compact
  durations) mirror ui-chat's own StatsLine formatting one-for-one, so the
  header and the old strip never disagreed about a number.
