# deepseek-harness-home

Personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) home directory (`~/.dsh`), under version control so the setup can be restored on another machine.

It holds the per-profile configuration and a set of **client plugins** for the web GUI. The plugins are mirrored from the harness monorepo into `packages/client/` (same layout as upstream `packages/client/*`) so the real `clientBundle` tsdown preset runs here, together with the small build toolchain that preset needs. Everything tracked is config, plugin source, compiled bundle output, and toolchain files — secrets, identity, session history, and local caches are deliberately **not** in the repo (see [What is (and isn't) tracked](#what-is-and-isnt-tracked)).

## Layout

    .
    ├── profiles/
    │   └── web/                 # web GUI profile (the only profile)
    ├── packages/
    │   └── client/              # client plugins + build preset (monorepo-mirrored)
    │       ├── ui-files/        # @deepseek-ai/dsh-client-ui-files
    │       ├── ui-edits/        # @deepseek-ai/dsh-client-ui-edits
    │       ├── ui-changes/      # @deepseek-ai/dsh-client-ui-changes
    │       ├── tsdown.client.ts # shared clientBundle tsdown preset
    │       ├── modules/         # preset support modules (manifest/system)
    │       └── web/             # shared browser platform module list
    ├── scripts/
    │   └── client-build-environment.ts   # client bundle build-env defines
    ├── tsconfig.base.json / tsconfig.base.client.json
    ├── package.json / pnpm-lock.yaml     # root build toolchain
    └── LICENSE

## Profile

| Profile | Bundles | Notes |
| --- | --- | --- |
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app` | web GUI; `cordis.patch.yml` disables the shipped `ui-deliverables` row and inserts the three client plugins below |

`cordis.yml` is the profile root (an empty entry list). `cordis.patch.yml` is the patch layer applied on top of every bundle layer — edit `cordis.patch.yml`, never `cordis.yml`. `package.json` sets `dsh.profile.patchReload: "live"`, so patch changes are picked up without restarting the server.

## Client plugins

The three plugins are pure-frontend (pure-consumer) client plugins: each is a self-contained npm package with source in `src/`, compiled output in `lib/`, and tests in `tests/`. Each is wired into the web profile by two things:

1. a symlink `profiles/node_modules/@deepseek-ai/<pkg-name>` → `packages/client/<dir>` (the mode-installation / fallback resolution — the profile points at the local source tree), and
2. an `insert:` entry in `profiles/web/cordis.patch.yml` that loads the package by `id` + `name`.

| Directory | Package | Description |
| --- | --- | --- |
| `packages/client/ui-files` | `@deepseek-ai/dsh-client-ui-files` | **Files** tab: workspace directory/file tree + syntax-highlighted content pane, and reveals chat file-link clicks (the only plugin allowed to provide a single-shot slot service) |
| `packages/client/ui-edits` | `@deepseek-ai/dsh-client-ui-edits` | **Edits** tab: per-turn record of every `edit`/`write` tool result carrying `FsDiffMeta`, with plugin-owned inline diffs |
| `packages/client/ui-changes` | `@deepseek-ai/dsh-client-ui-changes` | **Changes** tab: cumulative per-file view folding the loaded window into one net original → current diff |

Each package has a `README.md` (behaviour and live status) and an `INTEGRATION.md` (wiring/removal notes); `ui-files` additionally documents its host primitives in `HOST_PRIMITIVES.md`.

### Building

The root `package.json` installs the build toolchain the harness `clientBundle` preset needs: `tsdown`, `lightningcss`, `typescript`, and `vitest`. Plugin bundles are produced by that shared preset (`packages/client/tsdown.client.ts`) and emit a closure-factory `lib/client.js` that calls `window.__ModuleLoader__.load({id, factory})` and resolves externals through the injected module table.

Rebuild a plugin after editing its source:

```sh
cd "$HOME/.dsh/packages/client/ui-files"   # or ui-edits / ui-changes
"$HOME/.dsh/node_modules/.bin/tsdown"
```

Run its tests:

```sh
cd "$HOME/.dsh/packages/client/ui-files"
"$HOME/.dsh/node_modules/.bin/vitest" run
```

After a rebuild, refresh the web GUI tab — the boot graph is re-read on page load.

## What is (and isn't) tracked

**Tracked:** `profiles/**` config, the `packages/` plugin sources + compiled `lib/` + tests, the build toolchain files (`scripts/`, `tsconfig.base*.json`, `package.json`, `pnpm-lock.yaml`), and `LICENSE`.

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
| self-referencing plugin symlinks | filesystem artifacts, not source |

> API keys never live in this repo. After cloning, recreate `~/.dsh/.credentials.yaml` with your own keys.

## Restoring

```sh
git clone https://github.com/zhoupen9/deepseek-harness-home.git "$HOME/.dsh"
```

1. **Install the build toolchain** (restores the gitignored root `node_modules/`):

   ```sh
   cd "$HOME/.dsh" && pnpm install
   ```

2. **Re-link the client plugins** (the symlinks live under `profiles/node_modules/`, which resolves against the installed `deepseek-harness` tree, so they are not tracked):

   ```sh
   mkdir -p "$HOME/.dsh/profiles/node_modules/@deepseek-ai" && cd "$_"
   ln -s "$HOME/.dsh/packages/client/ui-files"   dsh-client-ui-files
   ln -s "$HOME/.dsh/packages/client/ui-edits"   dsh-client-ui-edits
   ln -s "$HOME/.dsh/packages/client/ui-changes" dsh-client-ui-changes
   ```

3. **Recreate credentials** (`~/.dsh/.credentials.yaml`) with your `DEEPSEEK_API_KEY`.
