# @deepseek-ai/dsh-client-ui-git — "Git" history tree graph

A pure-frontend client plugin for DeepSeek Harness's web GUI. It registers a
new **Git** tab in the conversation view that renders the workspace
repository's commit-history **tree graph**: a lane/column graph (SVG) beside
per-commit metadata (refs, subject, short hash, author, time), newest commit
first.

The browser cannot run `git log`, so every commit and ref fact must come from
the Host. This plugin is the **client half only**: it codes against a host
`ctx.remote.git` namespace (see [HOST_PRIMITIVES.md](HOST_PRIMITIVES.md)) and
degrades to a clear "requires host" notice until that namespace ships. The
graph layout itself is pure client logic (`git-graph.ts`) and works against
any `GitCommit[]`.

## How it works

- **Contract** (`git-contract.ts`): client-safe wire types — `GitContext`
  (none / error / git + root/worktree), `GitRef`, `GitCommit`,
  `GitLogOptions`, `GitLogResult`.
- **Remote accessor** (`git-remote.ts`): `resolveGitRemote(ctx)` reads
  `ctx.remote.git` lazily (at tab mount) and returns `undefined` when the
  host has not implemented it yet, so the plugin never parks on a missing
  controller.
- **Graph layout** (`git-graph.ts`, pure): newest-first column assignment —
  the first parent continues its child's lane (straight line), later parents
  branch right into fresh lanes, a commit already reserved as an earlier
  commit's parent reuses that lane (merge-back), and a parent outside the
  window keeps its lane so its edge dangles off the bottom. `routeEdge`
  draws each edge as a straight or L-shaped polyline.
- **View** (`GitView.tsx`): fetches the latest 32 commits (`LOG_PAGE_SIZE`)
  with an `AbortController`, renders the SVG graph and commit list, and shows
  targeted notices for each empty/error state (host missing, no workspace, no
  repo, no commits, host error). When more history exists the list ends in a
  "Load more" button that grows the window by 32 per click. A header select
  switches history traversal between `--first-parent`, `--max-parents=1`, and
  `--max-parents=2` (the latter two need the host change in
  [HOST_TRAVERSAL_MODES.md](HOST_TRAVERSAL_MODES.md)).
- Registers exactly like `ui-trajectory`/ui-edits/ui-files: one
  `conversation.view` slot (id `git`, order 23) — no service, no
  model-visible changes, no session events.

## Layout

    packages/client/ui-git/
      package.json            # @deepseek-ai/dsh-client-ui-git
      tsconfig.json           # standalone build config (jsx react-jsx; see note)
      tsdown.config.ts        # clientBundle preset (harness-relative import)
      lib/                    # BUILT artifacts (tsdown output)
        client.js             #   browser bundle (loader handoff format)
        index.js, invariant.js#   node half
        types/                #   node-half hand-written entries (see note)
      src/index.ts            # host loader entry (no host behavior)
      src/invariant.ts        # invariant companion
      src/client/index.ts     # plugin body: slot registration
      src/client/git-contract.ts        # wire types
      src/client/git-remote.ts          # host remote accessor
      src/client/git-graph.ts           # pure lane/edge layout
      src/client/GitView.tsx            # tab component
      src/client/GitView.module.css
      src/client/locales.ts             # zh/en namespace 'git'
      tests/git-graph.client.spec.ts    # pure layout spec
      HOST_PRIMITIVES.md                # host-side requirements (separate deliverable)
      HOST_TRAVERSAL_MODES.md           # --max-parents host change requirements
      INTEGRATION.md                    # wiring/removal notes

## Build and test

Build toolchain (tsdown, lightningcss, typescript, vitest) is installed at the
workspace root (`/home/zhoupeng/.dsh`). Rebuild and test after source edits:

    cd /home/zhoupeng/.dsh/packages/client/ui-git
    /home/zhoupeng/.dsh/node_modules/.bin/tsdown
    /home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/git-graph.client.spec.ts

## Notes

- **tsconfig.json** here is the standalone build config. When (if ever) this
  package is dropped into the harness checkout, restore the harness tsconfig
  (`extends ../../../tsconfig.base.client.json` + project references).
- **lib/types/index.js + invariant.js** are hand-written node-half entries (the
  clientBundle preset consumes them as the node-half entry points; they are
  trivial — a no-op `apply` and the invariant companion).
- **Status**: client half complete; the tab renders a "requires host" notice
  until the `git` Remote namespace in [HOST_PRIMITIVES.md](HOST_PRIMITIVES.md)
  is implemented and shipped in the web bundle.
- **Removal**: delete the `insert` row from `profiles/web/cordis.patch.yml`
  and the symlink; the live watcher recomposes without the plugin.
