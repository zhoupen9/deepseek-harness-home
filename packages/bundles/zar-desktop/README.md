# @zhp-dev/zar-desktop

A DSH profile bundle that groups this machine's six locally developed desktop UI
plugins behind a single selectable bundle, so a profile does not have to carry six
hand-written `insert` rows in its own `cordis.patch.yml`.

| Row id | Package | What it adds |
| --- | --- | --- |
| `ui-edits` | `@zar-desktop/ui-edits` | Per-turn "Edits" view in the conversation view map |
| `ui-changes` | `@zar-desktop/ui-changes` | Cumulative per-file "Changes" view |
| `ui-git` | `@zar-desktop/ui-git` | Git history tree graph tab |
| `ui-session-metrics` | `@zar-desktop/ui-session-metrics` | Chat-header metrics pill (tokens · context) |
| `ui-chat-tab-icons` | `@zar-desktop/ui-chat-tab-icons` | Icons on the Chat/Trajectory/Edits/Changes/Git tabs |
| `ui-todo-pill` | `@zar-desktop/ui-todo-pill` | Chat-header To-dos pill |

## What this package is not

It does not vendor, rebuild, or reinstall those six packages. They remain
`link:` dependencies of each profile that uses them:

```json
"@zar-desktop/ui-edits": "link:/home/<user>/.dsh/packages/client/ui-edits"
```

The bundle's patch names them as bare specifiers, which resolve from the
profile's own `node_modules`. That is why `package.json` here declares no
`dependencies`, no `peerDependencies`, and no `engines.dsh`: the six plugins are
`0.1.x-alpha` while the dsh runtime is `0.2.x`, and a `@deepseek-ai/dsh-*` peer
entry would make the installer reject the bundle as `incompatible-version`.

## Install

From the profile that should use it, pass the absolute package directory to the
plugin manager (`install_bundle`). It adds the `link:` dependency, selects the
bundle in `dsh.profile.bundles`, and reloads live. Do not hand-edit the profile
`package.json` or run pnpm in the profile directory.

Before installing into a profile whose `cordis.patch.yml` still inserts any of
the six row ids, delete those rows: two layers inserting the same id make the
loader throw `entry <id> already exists in the target tree`, and the profile
stops composing.

## Upgrade notes

After a dsh upgrade, rebuild the six plugins in `packages/client/*` and refresh
their `link:` entries; this bundle needs no change unless a row id or package
name changes.
