# ui-todo-pill — profile integration record

Pure-consumer chat-header To-dos pill, done entirely in user space: nothing
under `/usr/lib/deepseek-harness` or the harness checkout is touched, and
everything lives in `/home/zhoupeng/.dsh`.

## What replaces what

- **Added**: a wide To-dos pill at the left edge of the Session Header's
  right-aligned utility cluster (slot `conversation.session.header.utilities`,
  entry id `todo-pill`, order -12). It sits left of the session-metrics capsule
  (order -11) and the shipped `open-in-app` split button (order -10). The pill
  carries the shipped card's progress summary, sheds it to `done/total` under a
  760px title row and to the icon under 600px, and opens one portaled panel
  with the full list on click.
- **Replaced**: ui-conversation's To-dos card above the composer — TodoDock in
  the `conversation.input.dock` slot, id `todo`, order 0. This plugin
  registers the same cell id at priority -1 with a null occupant: same-id list
  cells coexist only at distinct priorities and the lowest renders, so the card
  disappears while the plugin is mounted and returns unchanged when it unloads.
  The list is not re-implemented as data: both surfaces read the same
  session-standard `todos` projection.
- **Untouched**: the `todo_write` tool, its `todo/write` events, the `todos`
  projection, and the tool card's diff view.

## Wiring

| Surface | Entry id | Order | Priority | Purpose |
| --- | --- | --- | --- | --- |
| `conversation.session.header.utilities` | `todo-pill` | -12 | 0 | the wide pill, left of the session-metrics capsule |
| `conversation.input.dock` | `todo` | — | -1 | shadows the shipped To-dos card (priority 0) |

Both registrations use `ctx.slots.inject`; the dictionaries are one
`ctx.effect`. Removing the plugin fiber removes both registrations and the
copy.

## Steps taken

1. Built `lib/` with the workspace toolchain:

        cd /home/zhoupeng/.dsh/packages/client/ui-todo-pill
        /home/zhoupeng/.dsh/node_modules/.bin/tsdown

   Emits `lib/client.js` (browser bundle) and `lib/index.js` (host loader
   entry).
2. Installed the package as a profile-local dependency of **both** profiles:

        cd /home/zhoupeng/.dsh/profiles/web && pnpm add "link:/home/zhoupeng/.dsh/packages/client/ui-todo-pill"
        cd /home/zhoupeng/.dsh/profiles/desktop && pnpm add "link:/home/zhoupeng/.dsh/packages/client/ui-todo-pill"

   pnpm warns that a linked package's `workspace:` peers are not resolved from
   the target `node_modules` — the same warning the other local plugins
   produce. The plugin needs no host package at runtime.
3. Inserted the loader row into the `- insert` list of both
   `cordis.patch.yml` files, after `ui-chat-tab-icons`, and listed the plugin
   in their header comment. `patchReload: live` recomposes the running loader;
   a page refresh loads the new client bundle.

## Rebuild after source edits

    cd /home/zhoupeng/.dsh/packages/client/ui-todo-pill
    /home/zhoupeng/.dsh/node_modules/.bin/tsdown
    DSH_HARNESS_DIR=/home/zhoupeng/Sources/deepseek-harness /home/zhoupeng/.dsh/node_modules/.bin/vitest run

The suite carries an upstream drift guard
(`tests/upstream-drift.client.spec.ts`). Everything this plugin mirrors instead
of importing — because a profile-local plugin may not import another feature
plugin's values or stylesheet — is compared against the harness the local
`dsh` runs from (resolved from `$DSH_HARNESS_DIR`, else from the `dsh` entry on
PATH): the shipped To-dos copy, the composer cell and its id/order, the slot
declarations, the todos projection contract, the header row's order anchors, and
the baseline exports the built bundle requires. A harness upgrade that rewords
`todo.*`, renames the dock cell, moves either slot, or changes the projection
fails the guard with the specific difference, so re-synchronizing stays a
deliberate step. Re-run it after every harness merge.

## Verification

- Resolution: from `profiles/web`, `node -e "import('@zar-desktop/ui-todo-pill')"`
  exports `apply`, and `import.meta.resolve('@zar-desktop/ui-todo-pill/client')`
  resolves to the plugin's `lib/client.js`; the patch row names the same
  package.
- Behavior (page refresh): the composer's To-dos card is gone and the wide pill
  sits left of the metrics capsule; clicking opens the list; Escape, an outside
  click, a Session switch, or an emptied list closes it; narrowing the window
  swaps the summary for `done/total` and then the icon; the tooltip and the
  accessible name keep the full summary.
- Pure logic: the vitest suites cover counts, segment ordering and omission,
  the separator join, the fraction, the aria name, the visibility gate, the
  status mapping, the registration descriptors, and zh/en parity.

## Rollback

Remove the `ui-todo-pill` insert row from both `cordis.patch.yml` files and
drop the dependency:

    cd /home/zhoupeng/.dsh/profiles/web && pnpm remove @zar-desktop/ui-todo-pill
    cd /home/zhoupeng/.dsh/profiles/desktop && pnpm remove @zar-desktop/ui-todo-pill

The shipped To-dos card and its expandable list return exactly: the shadow
occupant disappears with the plugin and the cell falls back to the shipped
entry at priority 0.
