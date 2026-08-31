# @deepseek-ai/dsh-client-ui-files — workspace directories-and-files explorer

A pure-consumer client plugin for DeepSeek Harness's web GUI. It registers a
**Files** tab that renders a directory/file tree and the selected file's
content (syntax-highlighted by extension). Clicking a chat file link reveals
and selects that file in this explorer.

## Two modes, one plugin

The tab has two data sources, selected at runtime with no code switch:

1. **Live workspace explorer** (primary) — when the host exposes the
   `workspaceFiles` remote (see [`HOST_PRIMITIVES.md`](./HOST_PRIMITIVES.md)),
   the tab roots a lazily loaded tree at the session's workspace cwd and
   lists **directories and files**, reading a selected file's bounded text
   through the same remote. Directories load on first expand; a manual
   Refresh re-lists the root; a hidden-file toggle flips the dotfile filter.
   Binary files and over-limit files render notices instead of code.
2. **Session-known reconstruction** (fallback) — until that host primitive
   exists, the tab keeps the previous behavior: it derives the files a
   session touched from the persisted session log (`write`/`edit`/
   `str_replace_editor` mutations and `read` windows) and reconstructs each
   file's best-known content.

A chat file-link click reveals the file in whichever mode is active: the live
explorer lazily loads the path and reads the file, while the session-known
fallback selects the reconstructed file.

## Layout

```
packages/client/ui-files/
  HOST_PRIMITIVES.md         # host-side requirements to implement (list + read)
  src/index.ts               # host loader entry (no host behavior)
  src/invariant.ts           # invariant companion
  src/client/index.ts        # plugin body: views/events/hooks/mentions
  src/client/files-remote.ts # workspaceFiles contract + runtime resolver
  src/client/files-explorer.ts   # pure helpers (sort, ancestors, size)
  src/client/FilesExplorer.tsx   # live lazy tree + content pane
  src/client/FilesView.tsx       # tab: live vs session-known switcher
  src/client/FileContentPane.tsx # shared highlighted content pane
  src/client/files-contract.ts   # session-known snapshot types
  src/client/files-definition.ts # session-known event state machine
  src/client/files-snapshot-builder.ts # session-known tree/content builder
  src/client/files-reconstruct.ts     # mutation folding
  src/client/files-tree.ts            # path list -> tree projection
  src/client/files-lang.ts            # extension -> language hint table
  src/client/files-mentions.ts        # chatFileMentions composition
  src/client/files-text.ts            # line split/join helpers
```

## Status

The client half is complete and builds. The live explorer activates
automatically once the host implements `HOST_PRIMITIVES.md`; until then the
tab behaves exactly as the previous session-known explorer.

## Build and test

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-files
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
cd /home/zhoupeng/.dsh
node_modules/.bin/vitest run packages/client/ui-files/tests
```

A bundle-bytes change produces a new revision; a browser refresh activates
the new code (the profile's `patchReload: live` watcher handles the loader
entry).
