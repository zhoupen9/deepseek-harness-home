# deepseek-harness-home

Personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) home directory (`~/.dsh`), under version control so the setup can be restored on another machine.

It holds the per-profile configuration and a set of **client plugins** for the web GUI. The plugins are mirrored from the harness monorepo into `packages/client/` (same layout as upstream `packages/client/*`) so the real `clientBundle` tsdown preset runs here, together with the small build toolchain that preset needs. Everything tracked is config, plugin source, compiled bundle output, and toolchain files — secrets, identity, session history, and local caches are deliberately **not** in the repo (see [What is (and isn't) tracked](#what-is-and-isnt-tracked)).

## Layout

    .
    ├── profiles/
    │   └── web/                 # web GUI profile (the only profile)
    ├── packages/
    │   └── client/              # client plugins + build preset (monorepo-mirrored)
    │       ├── ui-edits/        # @deepseek-ai/dsh-client-ui-edits
    │       ├── ui-changes/      # @deepseek-ai/dsh-client-ui-changes
    │       ├── ui-git/          # @deepseek-ai/dsh-client-ui-git
    │       ├── ui-session-metrics/ # @deepseek-ai/dsh-client-ui-session-metrics
    │       ├── ui-chat-tab-icons/ # @deepseek-ai/dsh-client-ui-chat-tab-icons
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
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@anysearch/anysearch-dsh` | web GUI; `cordis.patch.yml` keeps the shipped `ui-deliverables` row enabled and inserts the five client plugins below plus a `podman` MCP server (`@deepseek-ai/dsh-mcp-client`) |

`cordis.yml` is the profile root (an empty entry list). `cordis.patch.yml` is the patch layer applied on top of every bundle layer — edit `cordis.patch.yml`, never `cordis.yml`. `package.json` sets `dsh.profile.patchReload: "live"`, so patch changes are picked up without restarting the server.

## Client plugins

The plugins are pure-frontend (pure-consumer) client plugins: each is a self-contained npm package with source in `src/`, compiled output in `lib/`, and tests in `tests/`. Each is wired into the web profile by two things:

1. a `link:` dependency in `profiles/web/package.json` pointing at `packages/client/<dir>`, which pnpm materialises as a symlink at `profiles/web/node_modules/@deepseek-ai/<pkg-name>` → `packages/client/<dir>`, and
2. an `insert:` entry in `profiles/web/cordis.patch.yml` that loads the package by `id` + `name`.

Resolution reads only `profiles/web/node_modules`; the legacy `profiles/node_modules` fallback was removed on 2026-09-18, and a link placed there silently fails to resolve.

| Directory | Package | Description |
| --- | --- | --- |
| `packages/client/ui-edits` | `@deepseek-ai/dsh-client-ui-edits` | **Edits** tab: per-turn record of every `edit`/`write` tool result carrying `FsDiffMeta`, with plugin-owned inline diffs |
| `packages/client/ui-changes` | `@deepseek-ai/dsh-client-ui-changes` | **Changes** tab: cumulative per-file view folding the loaded window into one net original → current diff |
| `packages/client/ui-git` | `@deepseek-ai/dsh-client-ui-git` | **Git** tab: workspace repository commit-history tree graph (host git remote) |
| `packages/client/ui-session-metrics` | `@deepseek-ai/dsh-client-ui-session-metrics` | **Session metrics**: chat-header capsule (cache rate · input/output tokens) anchoring the left edge of the header utilities row — left of the "Open In…" button and the Session log button — hover details; replaces the bottom-of-chat StatsLine strip |
| `packages/client/ui-chat-tab-icons` | `@deepseek-ai/dsh-client-ui-chat-tab-icons` | **View-tab icons**: prepends a shipped icon to each conversation view tab (Chat / Trajectory / Edits / Changes / Git); presentation only — no slot entry, service, or session state |

Each package has a `README.md` (behaviour and live status) and an `INTEGRATION.md` (wiring/removal notes).

### Building

The root `package.json` installs the build toolchain the harness `clientBundle` preset needs: `tsdown`, `lightningcss`, `typescript`, and `vitest`. Plugin bundles are produced by that shared preset (`packages/client/tsdown.client.ts`) and emit a closure-factory `lib/client.js` that calls `window.__ModuleLoader__.load({id, factory})` and resolves externals through the injected module table.

Rebuild a plugin after editing its source:

```sh
cd "$HOME/.dsh/packages/client/ui-edits"   # or ui-changes / ui-git / ui-chat-tab-icons / ui-session-metrics
"$HOME/.dsh/node_modules/.bin/tsdown"
```

Run its tests:

```sh
cd "$HOME/.dsh/packages/client/ui-edits"
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
| self-referencing plugin symlinks | filesystem artifacts, not source (the profile-local `link:` symlinks under `profiles/web/node_modules/` are covered by `node_modules/`) |

> API keys never live in this repo. After cloning, recreate `~/.dsh/.credentials.yaml` with your own keys.

## Restoring

```sh
git clone https://github.com/zhoupen9/deepseek-harness-home.git "$HOME/.dsh"
```

1. **Install the build toolchain** (restores the gitignored root `node_modules/`):

   ```sh
   cd "$HOME/.dsh" && pnpm install
   ```

2. **Re-link the client plugins.** The links live under `profiles/web/node_modules/` (gitignored). The tracked `profiles/web/package.json` already carries them, so reinstalling the profile deps recreates the symlinks — or register each package explicitly against the local source tree:

   ```sh
   cd "$HOME/.dsh/profiles/web" && pnpm install
   ```

   ```sh
   dsh plugin --profile web add link:"$HOME/.dsh/packages/client/ui-edits"
   dsh plugin --profile web add link:"$HOME/.dsh/packages/client/ui-changes"
   dsh plugin --profile web add link:"$HOME/.dsh/packages/client/ui-git"
   dsh plugin --profile web add link:"$HOME/.dsh/packages/client/ui-session-metrics"
   dsh plugin --profile web add link:"$HOME/.dsh/packages/client/ui-chat-tab-icons"
   ```

3. **Recreate credentials** (`~/.dsh/.credentials.yaml`) with your `DEEPSEEK_API_KEY`.
