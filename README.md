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
    │   ├── client-build-environment.ts   # client bundle build-env defines
    │   ├── client-plugins.mjs            # pnpm setup / build / verify
    │   ├── restore.sh                    # bootstrap ~/.dsh on a new machine
    │   └── update.sh                     # pull + repair an existing checkout
    ├── tsconfig.base.json / tsconfig.base.client.json
    ├── package.json / pnpm-lock.yaml     # root build toolchain
    └── LICENSE

## Profiles

| Profile | Bundles | Notes |
| --- | --- | --- |
| `desktop` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@anysearch/anysearch-dsh`, `@deepseek-ai/dsh-experimental-tool-worktree`, `@deepseek-ai/dsh-experimental-forge-bundle`, `@zhp-dev/zar-desktop` | desktop app profile; the six client plugins arrive through the `@zhp-dev/zar-desktop` bundle, so its `cordis.patch.yml` inserts only a `podman` MCP server (`@deepseek-ai/dsh-mcp-client`) |
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@anysearch/anysearch-dsh` | web GUI profile; `cordis.patch.yml` inserts the six client plugins itself plus the same `podman` MCP server |

`cordis.yml` is the profile root (an empty entry list). `cordis.patch.yml` is the patch layer applied on top of every bundle layer — edit `cordis.patch.yml`, never `cordis.yml`. `package.json` sets `dsh.profile.patchReload: "live"`, so patch changes are picked up without restarting the server.

Both profiles carry a `link:` dependency on each `packages/client/<dir>`, which is what makes the bare specifiers in a patch resolvable at all — see below.

## Client plugins

The plugins are pure-frontend (pure-consumer) client plugins: each is a self-contained npm package with source in `src/`, compiled output in `lib/`, and tests in `tests/`. Two things make one load in a profile:

1. a `link:` dependency in `profiles/<profile>/package.json` pointing at `packages/client/<dir>`, which pnpm materialises as a symlink at `profiles/<profile>/node_modules/@zar-desktop/<pkg-name>` → `packages/client/<dir>`, and
2. a row that loads the package by `id` + `name` — inserted either by the `@zhp-dev/zar-desktop` bundle (desktop profile) or by the profile's own `cordis.patch.yml` (web profile).

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

## The `@zhp-dev/zar-desktop` bundle

[`packages/bundles/zar-desktop`](packages/bundles/zar-desktop) is a profile bundle: a package whose `package.json` declares `dsh.bundle.patch`, pointing at a `cordis.patch.yml` that inserts the six plugin rows. The desktop profile selects it in `dsh.profile.bundles`, so one row in that list enables or disables all six plugins.

- **Ownership.** The bundle owns the six row ids (`ui-edits`, `ui-changes`, …). A profile that selects it must **not** also insert those ids in its own patch: two layers inserting the same id make the loader throw `entry <id> already exists in the target tree` and the profile stops composing. That is why the desktop patch inserts only `mcp-podman`.
- **No dependencies.** The bundle declares no `dependencies`, no `peerDependencies`, and no `engines.dsh`. It does not install the plugins; it names them as bare specifiers that resolve from the profile's own `link:` dependencies. Declaring `@deepseek-ai/dsh-*` peers would make the installer reject the bundle as `incompatible-version`, because the plugins are `0.1.x-alpha` while the dsh runtime is `0.2.x`.
- **Installing it** is a plugin-manager operation, not a pnpm one: pass the absolute package directory to `install_bundle` (Settings → Plugins, or the agent's plugin manager). That adds the `link:` dependency, appends `@zhp-dev/zar-desktop` to `dsh.profile.bundles`, and reloads live. Hand-editing the profile `package.json` or running pnpm by hand does **not** select the bundle.

## Building

The root `package.json` installs the build toolchain the harness `clientBundle` preset needs: `tsdown`, `lightningcss`, `typescript`, and `vitest`. Plugin bundles are produced by that shared preset (`packages/client/tsdown.client.ts`) and emit a closure-factory `lib/client.js` that calls `window.__ModuleLoader__.load({id, factory})` and resolves externals through the injected module table.

**After every `git pull`, run:**

```sh
bash "$HOME/.dsh/scripts/update.sh"   # --ref, --remote, --target, --no-build, --build, --force, --dry-run
```

[scripts/update.sh](scripts/update.sh) fast-forwards from the remote, then repairs what a pull can break and says whether the change needs a tab reload or an app restart. It backs up (never deletes) anything the checkout would overwrite, tolerates machine-generated churn in lockfiles and built `lib/`, refuses to run over real local modifications unless `--force`, and exits non-zero when the post-pull `pnpm verify` fails. The manual equivalent is:

```sh
cd "$HOME/.dsh" && pnpm setup
```

The script does not have to live in the checkout: it addresses the target through `git -C "$TARGET"` and `$DSH_HOME`/`~/.dsh`, so a downloaded copy updates the same repo. That is only needed when the in-repo copy predates a fix — an update refreshes it — and pinning a commit is safer than trusting a branch:

```sh
curl -fsSL https://raw.githubusercontent.com/zhoupen9/deepseek-harness-home/<sha>/scripts/update.sh -o /tmp/update.sh
bash /tmp/update.sh            # --ref, --remote, --target, --no-build, --build, --force, --dry-run
```

Download it to a file instead of piping into `bash`: the update itself works either way, but `--help` reads the script's own path and prints nothing when fed through a pipe. This script only *updates* an existing checkout — a target without `.git` is refused, and [scripts/restore.sh](scripts/restore.sh) is what bootstraps one.

`pnpm setup` repairs what a pull can invalidate, then proves the result:

1. installs the root toolchain (`node_modules/` is gitignored),
2. re-runs `pnpm install` in `profiles/desktop` and `profiles/web`, which recreates the `@zar-desktop/*` symlinks under the gitignored `profiles/*/node_modules/`,
3. rebuilds all six plugins from `src/`,
4. verifies each `lib/client.js` declares the package's current name, both profiles' links resolve, and the desktop profile selects the `@zhp-dev/zar-desktop` bundle.

A pull that renames a package (as the move to the `@zar-desktop` scope did) leaves the old symlink names in place until step 2 runs, so the bundle's six rows resolve to nothing and the tabs silently disappear — **that**, not a missing build, is what makes them look broken after a pull. The compiled `lib/` is tracked, so when `src/` has not changed no build is needed; when it has, `pnpm setup` regenerates it.

The pieces are also available separately:

```sh
pnpm verify   # read-only: artifacts, profile links, bundle selection
pnpm build    # rebuild the six plugins only
```

Built `lib/client.js` also embeds CSS-module class hashes derived from the **absolute source path**, so a rebuild at a different home path produces different bytes even for unchanged sources. That is expected, not a conflict — `pnpm verify` checks ids and links, not bytes.

`pnpm verify` is the cheap check: it compares the `id` inside each `lib/client.js` with the package name, so a rename that missed the built output (the identity strings — `id:`, CSS tag ids, invariant registration key — are compiled into `lib/*.js`) is reported instead of shipping a bundle the loader cannot match. Commit the regenerated `lib/` afterwards.

While iterating on one plugin, build just that one:

```sh
cd "$HOME/.dsh/packages/client/ui-edits"   # or ui-changes / ui-git / ui-chat-tab-icons / ui-session-metrics / ui-todo-pill
"$HOME/.dsh/node_modules/.bin/tsdown"
```

Run its tests:

```sh
cd "$HOME/.dsh/packages/client/ui-edits"
"$HOME/.dsh/node_modules/.bin/vitest" run
```

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
cd "$HOME/.dsh" && pnpm setup
```

Then recreate `~/.dsh/.credentials.yaml` with your `DEEPSEEK_API_KEY`. That is the whole restore.

`pnpm setup` restores what git ignores — the root toolchain, both profiles' `node_modules/` with their `link:` symlinks — rebuilds the six plugins, and verifies the result (see [Building](#building)).

### The bundle is not installed during a restore

`@zhp-dev/zar-desktop` needs no install step, because its selection is tracked data rather than an action:

- `profiles/desktop/package.json` already lists it in `dsh.profile.bundles` **and** as a `link:` dependency, both committed. The profile's `pnpm install` is what materialises `profiles/desktop/node_modules/@zhp-dev/zar-desktop`; once that link exists, the loader resolves the bundle and the six rows it inserts.
- Running the plugin manager's `install_bundle` against a restored profile does not help: it rejects a package that is already a dependency (`already-installed`), and it exists to *add* the bundle to a profile that does not list it, or to re-point it after its directory moves.
- There is nothing to compile for the bundle — it is a patch, two locale files, an icon, and an `export {}` module, all tracked. The rebuild in `pnpm setup` is for the six client plugins, and even that is a refresh: their `lib/` is committed, so a clone runs without compiling.

The manual `dsh plugin --profile … add link:<dir>` command is not part of a restore either, since it would only re-add dependency entries the tracked manifest already carries. It is the tool for *changing* a profile — adding a new plugin or bundle, or moving one to another directory; [The `@zhp-dev/zar-desktop` bundle](#the-zhp-devzar-desktop-bundle) covers what installing it into another profile involves.

### Restoring on a new machine

[scripts/restore.sh](scripts/restore.sh) automates this whole section — and it is non-destructive: it never cleans or deletes anything in the home directory, it copies any file the checkout would overwrite into `.restore-backup-<UTC>/`, and it compares the local-state paths before and after, failing if any changed. It needs only `git`, so it can be fetched and run before the repo exists:

```sh
curl -fsSL https://raw.githubusercontent.com/zhoupen9/deepseek-harness-home/main/scripts/restore.sh -o /tmp/restore.sh
bash /tmp/restore.sh            # --repo, --ref, --target, --no-build, --force, --dry-run
```

Prerequisites: the **same DSH release family** (the `bundles` lists name bundles the installation ships, not npm packages), **Node ≥ 22.19** (`@anysearch/anysearch-dsh` declares `engines.node`), **`pnpm` ≥ 9**, and registry access — `pnpm setup` fetches the root toolchain and the anysearch package.

1. **Get the repo to be `~/.dsh`.** If the app has already started once, `~/.dsh` exists (`profiles/`, `sessions/`, …) and `git clone … ~/.dsh` refuses a non-empty directory: move it aside, clone, then copy back only what you want to keep from `sessions/`, `storages/`, `attachments/`, and `.credentials.yaml`.
2. **`cd ~/.dsh && pnpm setup`** — installs everything, rebuilds the six plugins, and verifies ([Building](#building)).
3. **Credentials.** `.credentials.yaml` (or signing in in-app) for DeepSeek; `ANYSEARCH_API_KEY` for the anysearch web provider; `ZAI_CODING_CN_API_KEY` for the `zai-coding-cn` provider. The `podman` MCP row runs `npx -y podman-mcp-server@latest`, so Podman plus network is needed for the `mcp__podman__*` tools.

Every `link:` dependency in `profiles/*/package.json` is **relative** (`link:../../packages/…`), so the clone works at any path. An absolute `link:` is not portable and fails quietly: pnpm accepts it, exits 0, and leaves a dangling symlink, after which the six rows resolve to nothing — the tabs and header pills simply disappear with no error. `dsh plugin … add link:<dir>` records an absolute path, so prefer `pnpm install` from the tracked manifest.

Nothing from the old machine comes back: `sessions/`, `storages/`, `attachments/`, `settings.yaml`, and credentials are all gitignored.

Once the machine is restored, this section is done — subsequent updates are [scripts/update.sh](scripts/update.sh) ([Building](#building)), not a second restore.

**Version drift.** Patch entries that override a shipped row by `id` become inert when a release renames that row — the loader warns and skips, so the setting silently stops applying while everything else still works (the `llm-deepseek` entry was exactly this: the adapter had been renamed to `@deepseek-ai/dsh-llm-deepseek-api-key`). Watch startup warnings after a DSH upgrade; `pnpm verify` checks artifacts, links, and bundle selection, not patch targets.
