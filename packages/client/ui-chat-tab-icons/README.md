# @deepseek-ai/dsh-client-ui-chat-tab-icons — icons for the conversation view tabs

A pure-frontend client plugin for DeepSeek Harness's web GUI: it prepends one
shipped icon to each conversation view tab — Chat, Trajectory, Edits, Changes,
and Git — so the strip reads at a glance without owning any of those views.

Everything is presentation. The plugin contributes no slot entry, owns no
service, publishes no session event, and keeps no cross-session state: it reads
the `conversation.view` registry for the tab order and decorates the rendered
tab row.

## Icon map

| View id | Tab | Icon |
| --- | --- | --- |
| `chat` | Chat | `IconNewChatOutline16` |
| `trajectory` | Trajectory | `IconThinkOutline16` |
| `edits` | Edits | `IconEditOutline16` |
| `changes` | Changes | `IconCodeOutline16` |
| `git` | Git | `IconBranchOutline16` |

The icons are the shipped `ui-primitives` components — the same set the rest of
the chrome draws — rendered once and cloned into the tab button. Each is
`aria-hidden`, so a tab's accessible name stays its label text.

Every icon draws in **one fixed tone** (`--dsw-alias-label-caption`), set on the
icon rather than inherited: the shell paints the selected tab's label and
underline in its business blue, and a monochrome icon must not follow that
state change. Swapping the tone is one token in
`src/client/TabIcons.module.css`.

Change the map in `src/client/index.ts` (`TAB_ICONS`) together with the
decorated id list in `src/client/tab-icons.ts` (`TAB_ICON_IDS`); an id the
plugin does not know keeps its plain tab, so a view registered later simply
shows without an icon.

## How the decoration is anchored

The conversation shell projects one tab per `conversation.view` entry, in
registration order, and every slot render site carries the renderer's
`[data-slot="<key>"]` anchor (a `display: contents` wrapper). The plugin uses
exactly those two seams:

1. `ctx.slots.entries('conversation.view')` yields the view ids in tab order, so
   tabs are matched by id — never by label text, which a locale switch would
   change under it.
2. The session strip is the `[role="tablist"]` inside the conversation header's
   `[data-slot="conversation.session.header"]` anchor whose tab count equals
   the view-entry count; the session anchor is a second candidate and the
   whole document is the last resort, so a shell change that moves the strip
   cannot silently disable the decoration. Any other tab row (a different
   count) is left alone.
3. A `MutationObserver` re-applies after the shell re-renders the strip (a view
   registering or unregistering, a session switch). Mutation records are
   screened first, so transcript and composer churn never schedules a pass.

Nothing is patched or shadowed: unloading the plugin removes every icon it
inserted, and the tab row is otherwise untouched.

## Source layout

    packages/client/ui-chat-tab-icons/
      package.json                # @deepseek-ai/dsh-client-ui-chat-tab-icons
      tsconfig.json               # standalone build config (see note)
      tsdown.config.ts            # clientBundle preset
      lib/                        # BUILT artifacts (tsdown output)
        client.js                 #   browser bundle (loader handoff format)
        index.js, invariant.js    #   node half
        types/                    #   node-half entries (hand-written here; the
                                  #   harness checkout emits these from src)
      src/index.ts                # host loader entry (no host behavior)
      src/invariant.ts            # invariant companion (no runtime invariant)
      src/client/index.ts         # plugin body: icon map + decoration
      src/client/tab-icons.ts     # pure predicates (decorated ids, strip match)
      src/client/TabIcons.module.css
      tests/tab-icons.client.spec.ts
      INTEGRATION.md              # profile wiring/removal notes

## Build and test

    cd /home/zhoupeng/.dsh/packages/client/ui-chat-tab-icons
    /home/zhoupeng/.dsh/node_modules/.bin/tsdown
    /home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/tab-icons.client.spec.ts

The served bundle is re-read from disk per page load, so rebuild + a browser
refresh is enough.

## Notes

- **tsconfig.json** here is the standalone build config. When (if ever) this
  package is dropped into the harness checkout, restore the harness tsconfig
  (`extends ../../../tsconfig.base.client.json` + project references) and
  replace the hand-written `lib/types/*.js` node-half entries with tsc
  output.
- The bundle requests only baseline module-table rows: react, react-dom,
  react-dom/client, and `@deepseek-ai/dsh-client-ui-primitives`. No
  package-specific external is declared.
- The plugin renders the icons through a detached React root and inserts
  clones, so React never has to reconcile a child this plugin moved; the root
  is unmounted immediately after each clone is taken.
