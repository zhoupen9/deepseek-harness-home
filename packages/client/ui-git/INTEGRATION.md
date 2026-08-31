# ui-git — profile integration record

Adds the **Git** history-graph tab as a pure-frontend client plugin, entirely in
user space (no `/usr/lib/deepseek-harness` changes), following the ui-files /
ui-edits / ui-changes precedent.

## Steps taken

1. Built `lib/` with the workspace toolchain (tsdown 0.22 + lightningcss +
   typescript at `/home/zhoupeng/.dsh`; preset files under `packages/client/`
   + `scripts/`).
2. Symlinked the package into the profile install fallback:
   `profiles/node_modules/@deepseek-ai/dsh-client-ui-git` →
   `packages/client/ui-git`.
3. Inserted the loader entry into `profiles/web/cordis.patch.yml`:
   ```yaml
   - insert:
       - id: ui-git
         name: '@deepseek-ai/dsh-client-ui-git'
   ```
   The web profile's `patchReload: live` recomposes the running loader — no
   server restart.

## What the tab shows

- Host git remote present + workspace in a repo → the commit tree graph.
- Host git remote absent (the current state) → a "requires host" notice
  pointing at [HOST_PRIMITIVES.md](HOST_PRIMITIVES.md). The plugin resolves the
  `ctx.remote.git` namespace lazily, so the tab still mounts without the host
  side.

## Rebuild after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-git
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
/home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/git-graph.client.spec.ts
```

The served bundle is re-read from disk by the loader per page load (rev-hashed
by the profile watcher), so a rebuild + browser refresh is enough.

## Host side

The git history data requires a Host Remote namespace. See
[HOST_PRIMITIVES.md](HOST_PRIMITIVES.md) for the full implementation spec
(new `gitController` + `ctx.remote.git` + `/remote` contribution +
remotes assembly + Host Loader entry).

## Rollback

Remove the `ui-git` insert row from `profiles/web/cordis.patch.yml` and
delete `profiles/node_modules/@deepseek-ai/dsh-client-ui-git`.
