# @zar-desktop/ui-todo-pill — wide To-dos pill in the chat header

A pure-frontend client plugin for DeepSeek Harness's web GUI. It **moves the
agent's To-dos surface** out of the composer stack — ui-conversation's To-dos
card above the input — into the **Session header title row**, as a wide pill
immediately left of the session-metrics capsule. Clicking the pill opens the
list; the composer above the input no longer renders the card.

Everything is presentation: the plugin reads only the session-standard `todos`
projection and renders two slot entries, one stylesheet, and the panel. It owns
no service, publishes no session events, and keeps no cross-session state.

## What it looks like / how it behaves

- **Pill** (header utility cluster, leftmost entry at order -12 — left of
  `session-metrics` at -11, `open-in-app` at -10, and the Session-log capsule
  at 0): the shipped To-dos checklist icon followed by the shipped card's
  progress summary — `2 completed · 1 in progress · 3 pending`
  (`2 已完成 · 1 进行中 · 3 待处理`). Zero-count segments are omitted, exactly
  like the card. The pill is a button: `aria-haspopup="dialog"`,
  `aria-expanded`, and an accessible name carrying the full summary.
- **Narrow rows**: the header title row is an inline-size container. Below
  760px the pill sheds the summary for `2/5`; below 600px it sheds that too and
  keeps the icon. The full summary stays reachable through the tooltip, the
  accessible name, and the panel.
- **Panel** (click to open, anchored under the pill and clamped to the viewport,
  portaled to the body because the header clips): the moved card — title,
  progress value, rule, then one row per todo with the shared status dot
  (completed, in progress, pending) and the full item text, scrolling inside a
  capped height. Escape, an outside pointerdown, a Session switch, or an
  emptied list closes it.
- **Shadowed, not patched**: the composer cell is hidden by reusing its id at a
  lower priority — `conversation.input.dock` id `todo` at priority -1 (the
  shipped card registers the same id at priority 0; same-id cells only clash at
  equal priority and the lowest renders). Removing or disabling this plugin
  restores the shipped card unchanged.

## How it is wired

| Surface | Entry id | Order | Priority | Purpose |
| --- | --- | --- | --- | --- |
| `conversation.session.header.utilities` | `todo-pill` | -12 | 0 | the wide pill, left of the session-metrics capsule |
| `conversation.input.dock` | `todo` | — | -1 | shadows ui-conversation's TodoDock (priority 0) → composer card removed |

Both registrations use `ctx.slots.inject`, so they wait for the declaring
conversation entries and are removed with the plugin fiber. The panel is not a
registration: it is the pill's own portaled dialog placed through
`ui-primitives`' `useAnchoredPosition` and wearing a copy of the shipped card's
menu surface (a feature plugin may not import another feature plugin's
stylesheet).

## Source layout

    packages/client/ui-todo-pill/
      package.json                # @zar-desktop/ui-todo-pill
      tsconfig.json               # standalone build config (see note)
      tsdown.config.ts            # clientBundle preset
      lib/                        # BUILT artifacts (tsdown output)
        client.js                 #   browser bundle (loader handoff format)
        index.js                  #   node half
        types/index.js            #   hand-written node-half input
      src/index.ts                # host loader entry (no host behavior)
      src/client/index.ts         # plugin body: two slot registrations + dictionaries
      src/client/registrations.ts # pure registration descriptors
      src/client/todo-pill.ts     # pure folds, labels, aria text
      src/client/locales.ts       # zh/en namespace 'todo-pill'
      src/client/TodoPill.tsx     # pill + portaled panel + null shadow occupant
      src/client/TodoPill.module.css
      tests/todo-pill.client.spec.ts
      tests/upstream-drift.client.spec.ts
      INTEGRATION.md              # wiring/removal notes

## Build and test

    cd /home/zhoupeng/.dsh/packages/client/ui-todo-pill
    /home/zhoupeng/.dsh/node_modules/.bin/tsdown
    DSH_HARNESS_DIR=/home/zhoupeng/Sources/deepseek-harness /home/zhoupeng/.dsh/node_modules/.bin/vitest run

The served bundle is re-read from disk per page load, so rebuild + a browser
refresh is enough.

The suite includes an upstream drift guard
(`tests/upstream-drift.client.spec.ts`): because a profile-local plugin may not
import another feature plugin's values or stylesheet, the shipped To-dos copy,
the composer cell it shadows, the slot declarations, the todos projection, and
the baseline module exports are mirrored here by hand, and the guard compares
every mirror against the harness the local `dsh` runs from. Point
`DSH_HARNESS_DIR` at a different checkout to check against that one.

## Notes

- **tsconfig.json** here is the standalone build config. When (if ever) this
  package is dropped into the harness checkout, restore the harness tsconfig
  (`extends ../../../tsconfig.base.client.json` + project references) and
  replace the hand-written `lib/types/index.js` node-half entry with tsc output.
- The bundle requests only baseline module-table rows: react, react-dom,
  react/jsx-runtime, and `@deepseek-ai/dsh-client-ui-primitives`. No
  package-specific external is declared.
- Row labels, segment order, zero-count omission, status names, and the status
  dots mirror ui-conversation's shipped To-dos card one-for-one, so the pill and
  the panel never disagree with the card they replaced.
- The panel mirrors that shipped surface instead of importing it. If
  ui-conversation restyles the card, this package has to follow.
