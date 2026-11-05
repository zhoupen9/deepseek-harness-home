# deepseek-harness-home

Personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) home directory (`~/.dsh`), under version control so the setup can be restored on another machine.

It holds the per-profile configuration and a set of **client plugins** for the web GUI. The plugins are mirrored from the harness monorepo into `packages/client/` (same layout as upstream `packages/client/*`) so the real `clientBundle` tsdown preset runs here, together with the small build toolchain that preset needs. A local **bundle** in `packages/bundles/zar-desktop/` groups those plugins so a profile can enable or disable the whole set as one unit. Everything tracked is config, plugin source, compiled bundle output, bundle patches, and toolchain files — secrets, identity, session history, and local caches are deliberately **not** in the repo (see [What is (and isn't) tracked](#what-is-and-isnt-tracked)).

## Layout

    .
    ├── profiles/
    │   ├── desktop/             # desktop app profile (running host)
    │   └── web/                 # web GUI profile
    ├── packages/
    │   ├── client/              # client plugins + build preset (monorepo-mirrored)
    │   │   ├── ui-edits/        # @zar-desktop/ui-edits
    │   │   ├── ui-changes/      # @zar-desktop/ui-changes
    │   │   ├── ui-git/          # @zar-desktop/ui-git
    │   │   ├── ui-session-metrics/ # @zar-desktop/ui-session-metrics
    │   │   ├── ui-chat-tab-icons/ # @zar-desktop/ui-chat-tab-icons
    │   │   ├── ui-todo-pill/    # @zar-desktop/ui-todo-pill
    │   │   ├── tsdown.client.ts # shared clientBundle tsdown preset
    │   │   ├── modules/         # preset support modules (manifest/system)
    │   │   └── web/             # shared browser platform module list
    │   └── bundles/
    │       └── zar-desktop/     # profile bundle owning the six plugin rows
    ├── scripts/
    │   └── client-build-environment.ts   # client bundle build-env defines
    ├── tsconfig.base.json / tsconfig.base.client.json
    ├── package.json / pnpm-lock.yaml     # root build toolchain
    └── LICENSE

## Profiles

| Profile | Bundles | Notes |
| --- | --- | --- |
| `desktop` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@anysearch/anysearch-dsh`, `@deepseek-ai/dsh-experimental-tool-worktree`, `@deepseek-ai/dsh-experimental-forge-bundle`, `zar-desktop` | desktop app profile; the six client plugins arrive through the `zar-desktop` bundle, so its `cordis.patch.yml` inserts only a `podman` MCP server (`@deepseek-ai/dsh-mcp-client`) |
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@anysearch/anysearch-dsh` | web GUI profile; `cordis.patch.yml` inserts the six client plugins itself plus the same `podman` MCP server |

`cordis.yml` is the profile root (an empty entry list). `cordis.patch.yml` is the patch layer applied on top of every bundle layer — edit `cordis.patch.yml`, never `cordis.yml`. `package.json` sets `dsh.profile.patchReload: "live"`, so patch changes are picked up without restarting the server.

Both profiles carry a `link:` dependency on each `packages/client/<dir>`, which is what makes the bare specifiers in a patch resolvable at all — see below.

## Client plugins

The plugins are pure-frontend (pure-consumer) client plugins: each is a self-contained npm package with source in `src/`, compiled output in `lib/`, and tests in `tests/`. Two things make one load in a profile:

1. a `link:` dependency in `profiles/<profile>/package.json` pointing at `packages/client/<dir>`, which pnpm materialises as a symlink at `profiles/<profile>/node_modules/@zar-desktop/<pkg-name>` → `packages/client/<dir>`, and
2. a row that loads the package by `id` + `name` — inserted either by the `zar-desktop` bundle (desktop profile) or by the profile's own `cordis.patch.yml` (web profile).

Resolution reads only the running profile's `node_modules`; the legacy `profiles/node_modules` fallback was removed on 2026-09-18, and a link placed there silently fails to resolve.

| Directory | Package | Description |
| --- | --- | --- |
| `packages/client/ui-edits` | `@zar-desktop/ui-edits` | **Edits** tab: per-turn record of every `edit`/`write` tool result carrying `FsDiffMeta`, with plugin-owned inline diffs |
| `packages/client/ui-changes` | `@zar-desktop/ui-changes` | **Changes** tab: cumulative per-file view folding the loaded window into one net original → current diff |
| `packages/client/ui-git` | `@zar-desktop/ui-git` | **Git** tab: workspace repository commit-history tree graph (host git remote) |
| `packages/client/ui-session-metrics` | `@zar-desktop/ui-session-metrics` | **Session metrics**: chat-header capsule (cache rate · input/output tokens) anchoring the left edge of the header utilities row — left of the "Open In…" button and the Session log button — hover details; replaces the bottom-of-chat StatsLine strip |
| `packages/client/ui-chat-tab-icons` | `@zar-desktop/ui-chat-tab-icons` | **View-tab icons**: prepends a shipped icon to each conversation view tab (Chat / Trajectory / Edits / Changes / Git); presentation only — no slot entry, service, or session state |
| `packages/client/ui-todo-pill` | `@zar-desktop/ui-todo-pill` | **To-dos pill**: moves the To-dos list into a chat-header pill left of the metrics capsule, replacing the composer's To-dos card |

Each package has a `README.md` (behaviour and live status) and an `INTEGRATION.md` (wiring/removal notes).

## The `zar-desktop` bundle

[`packages/bundles/zar-desktop`](packages/bundles/zar-desktop) is a profile bundle: a package whose `package.json` declares `dsh.bundle.patch`, pointing at a `cordis.patch.yml` that inserts the six plugin rows. The desktop profile selects it in `dsh.profile.bundles`, so one row in that list enables or disables all six plugins.

- **Ownership.** The bundle owns the six row ids (`ui-edits`, `ui-changes`, …). A profile that selects it must **not** also insert those ids in its own patch: two layers inserting the same id make the loader throw `entry <id> already exists in the target tree` and the profile stops composing. That is why the desktop patch inserts only `mcp-podman`.
- **No dependencies.** The bundle declares no `dependencies`, no `peerDependencies`, and no `engines.dsh`. It does not install the plugins; it names them as bare specifiers that resolve from the profile's own `link:` dependencies. Declaring `@deepseek-ai/dsh-*` peers would make the installer reject the bundle as `incompatible-version`, because the plugins are `0.1.x-alpha` while the dsh runtime is `0.2.x`.
- **Installing it** is a plugin-manager operation, not a pnpm one: pass the absolute package directory to `install_bundle` (Settings → Plugins, or the agent's plugin manager). That adds the `link:` dependency, appends `zar-desktop` to `dsh.profile.bundles`, and reloads live. Hand-editing the profile `package.json` or running pnpm by hand does **not** select the bundle.

## Building

The root `package.json` installs the build toolchain the harness `clientBundle` preset needs: `tsdown`, `lightningcss`, `typescript`, and `vitest`. Plugin bundles are produced by that shared preset (`packages/client/tsdown.client.ts`) and emit a closure-factory `lib/client.js` that calls `window.__ModuleLoader__.load({id, factory})` and resolves externals through the injected module table.

Rebuild a plugin after editing its source:

```sh
cd "$HOME/.dsh/packages/client/ui-edits"   # or ui-changes / ui-git / ui-chat-tab-icons / ui-session-metrics / ui-todo-pill
"$HOME/.dsh/node_modules/.bin/tsdown"
```

Run its tests:

```sh
cd "$HOME/.dsh/packages/client/ui-edits"
"$HOME/.dsh/node_modules/.bin/vitest" run
```

The built `lib/*.js` carries the package's own identity strings (`id:`, CSS tag ids, invariant registration key), so renaming a package means editing those alongside `package.json` — or rebuilding, which regenerates them from `src/`.

After a rebuild, refresh the GUI tab — the boot graph is re-read on page load.

## What is (and isn't) tracked

**Tracked:** `profiles/**` config, the `packages/client/` plugin sources + compiled `lib/` + tests, the `packages/bundles/` bundle manifest and its patch/locales/icon, the build toolchain files (`scripts/`, `tsconfig.base*.json`, `package.json`, `pnpm-lock.yaml`), and `LICENSE`.

**Ignored** (see `.gitignore`):

| Path | Why |
| --- | --- |
| `.credentials.yaml` | API credentials (e.g. `DEEPSEEK_API_KEY`) |
| `.anonymous-user-id` | local machine identity |
| `sessions/` | full conversation history |
| `storages/` | runtime workspace/project caches |
| `attachments/` | attachment object store |
| `node_modules/` | regenerable dependencies |
| `settings.yaml` | may contain private API endpoints |
| self-referencing plugin symlinks | filesystem artifacts, not source (the profile-local `link:` symlinks under `profiles/*/node_modules/` are covered by `node_modules/`) |

> API keys never live in this repo. After cloning, recreate `~/.dsh/.credentials.yaml` with your own keys.

## Restoring

```sh
git clone https://github.com/zhoupen9/deepseek-harness-home.git "$HOME/.dsh"
```

1. **Install the build toolchain** (restores the gitignored root `node_modules/`):

   ```sh
   cd "$HOME/.dsh" && pnpm install
   ```

2. **Re-link the client plugins.** The links live under `profiles/*/node_modules/` (gitignored). The tracked `profiles/*/package.json` already carries them, so reinstalling a profile's deps recreates the symlinks:

   ```sh
   cd "$HOME/.dsh/profiles/desktop" && pnpm install
   cd "$HOME/.dsh/profiles/web"     && pnpm install
   ```

   Registering a package explicitly against the local source tree works too:

   ```sh
   dsh plugin --profile desktop add link:"$HOME/.dsh/packages/client/ui-edits"
   dsh plugin --profile desktop add link:"$HOME/.dsh/packages/client/ui-changes"
   dsh plugin --profile desktop add link:"$HOME/.dsh/packages/client/ui-git"
   dsh plugin --profile desktop add link:"$HOME/.dsh/packages/client/ui-session-metrics"
   dsh plugin --profile desktop add link:"$HOME/.dsh/packages/client/ui-chat-tab-icons"
   dsh plugin --profile desktop add link:"$HOME/.dsh/packages/client/ui-todo-pill"
   ```

3. **Select the `zar-desktop` bundle** in the desktop profile. `pnpm install` only creates the symlink; the bundle has to be installed through the plugin manager with `$HOME/.dsh/packages/bundles/zar-desktop` as the target, which also writes it into `dsh.profile.bundles`. The web profile needs this step only if you also switch it to the bundle.

4. **Recreate credentials** (`~/.dsh/.credentials.yaml`) with your `DEEPSEEK_API_KEY`.
