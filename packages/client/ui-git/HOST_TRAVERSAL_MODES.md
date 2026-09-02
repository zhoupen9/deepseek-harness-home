# ui-git traversal modes — host-side requirements (not yet implemented)

The ui-git Git tab now lets the user switch the history traversal between three git
log modes. Two of them need the Host's `git` Remote namespace to pass an extra
`--max-parents` flag, which the current controller does not support. This file
specifies the required Host change; until it lands, the two `--max-parents` modes
fall back to the unfiltered history (identical to each other) because the Host
ignores the unknown option.

## 1. What the client sends

`GitLogOptions` (client mirror: `src/client/git-contract.ts`) is extended with:

    interface GitLogOptions {
      maxCount?: number        // as today
      all?: boolean            // as today
      firstParent?: boolean    // as today
      maxParents?: 1 | 2       // NEW: --max-parents=<n> listing bound
    }

The Git view requests exactly one mode at a time and always sends both fields
explicitly (so the Host's configured default `firstParent: true` never leaks into
another mode):

| UI mode          | firstParent | maxParents | git flags the Host should run |
| ---------------- | ----------- | ---------- | ----------------------------- |
| `--first-parent` | `true`      | absent     | `--first-parent`              |
| `--max-parents=1`| `false`     | `1`        | `--max-parents=1`             |
| `--max-parents=2`| `false`     | `2`        | `--max-parents=2`             |

The mode is a *listing* choice, not an extra filter stacked on `--first-parent`, so
the client never combines the two flags. Semantics per flag:

- `--first-parent` — follow only each merge's first parent during traversal
  (mainline history; merge commits still appear).
- `--max-parents=1` — omit merge commits (anything with >= 2 parents) from the
  listing; side-branch history is still reachable through all parents.
- `--max-parents=2` — omit octopus merges (> 2 parents); ordinary merges stay.

## 2. Required Host changes (repository `packages/api/git-controller`)

1. **Wire type** — add `maxParents?: 1 | 2` to the Host `GitLogOptions` (the
   `typert`/`remote` generated types that declare the `log` verb options).

2. **Command builder** — `runLog(fenceRoot, maxCount, all, firstParent, signal)`
   becomes `runLog(fenceRoot, maxCount, all, firstParent, maxParents, signal)` and
   appends the flag next to the existing `--first-parent` splice:

       "log",
       "--topo-order", "-z", "--decorate=full",
       ...(firstParent ? ["--first-parent"] : []),
       ...(maxParents !== undefined ? ["--max-parents=" + String(maxParents)] : []),
       "--max-count=" + String(maxCount + 1),
       ...(all ? ["--all"] : []),
       "--format=%H%x00%P%x00%an%x00%ae%x00%at%x00%s%x00%D%x00"

   Use git's canonical plural spelling `--max-parents=` (there is no
   `--max-parent=` flag).

3. **Do not reshape parents for max-parents modes** — the post-parse rewrite
   `parents: commit.parents.slice(0, 1)` must stay conditional on `firstParent`
   only. Under `--max-parents=1` a surviving commit has <= 1 parent anyway; under
   `--max-parents=2` a surviving merge keeps both parents so the client graph can
   still draw its merge lane. `--first-parent` keeps today's slice so the client
   does not draw side lanes it never received.

4. **Verb plumbing** — `logHistory(agent, options, signal)` reads
   `options.maxParents` (optional; no Host config default needed) and passes it
   through. If the options object is schema-validated anywhere, allow the field as
   an optional literal union `1 | 2`; do not strip it.

5. **Config comment** — the `firstParent: z.boolean().default(true)` Host default
   is what made today's default view a mainline. Keep it; the client now always
   sends `firstParent` explicitly so the default only affects callers that omit it.

6. **Rebuild** — regenerate the `./remote` client typings and rebuild/reload the
   web bundle (the profile loader picks the new artifact up on next page load).

## 3. Acceptance criteria

1. `log` with `{ firstParent: false, maxParents: 1 }` on a repo with merges omits
   every merge commit; a plain single-parent chain is intact and `truncated`
   still reports the bound correctly.
2. `log` with `{ firstParent: false, maxParents: 2 }` keeps 2-parent merges and
   drops 3+-parent octopus merges; merge commits that survive carry BOTH parents
   in `parents`.
3. `log` with `{ firstParent: true }` behaves exactly as today (mainline only,
   each row's `parents` sliced to one).
4. Unknown/absent `maxParents` changes nothing for existing callers.
5. Abort behavior and the fence rules from HOST_PRIMITIVES.md are unchanged (one
   subprocess per call, `-c core.hooksPath=/dev/null` etc.).
6. With the Host change applied, switching the Git-tab select between the three
   modes re-fetches and the graph/history match `git log --first-parent` /
   `git log --max-parents=1` / `git log --max-parents=2` at the same bound.

## 4. Client-side status (this package)

The client half is complete and independent of the Host change:

- `src/client/git-contract.ts` — `maxParents?: 1 | 2` on `GitLogOptions`.
- `src/client/GitView.tsx` — traversal state (`'first-parent'` default, matching
  today's rendering), a header select listing the three flags, per-mode option
  mapping, refetch on switch, and selection reset so a detail pane can never
  dangle on a commit the new window dropped.
- `src/client/locales.ts` — `log.traversalLabel` aria label (zh/en).

Until item 2/4 above land in the Host, do not file client bugs against the two
`--max-parents` modes rendering the full (unfiltered) history — that is the
expected degraded behavior.
