# deepseek-harness-home

Personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) home directory (`~/.dsh`), under version control so the setup can be restored on another machine.

It holds the per-profile configuration and a set of **out-of-tree client plugins** for the web GUI. Everything tracked is plain config and compiled plugin code — secrets, identity, session history, and local caches are deliberately **not** in the repo (see [What is (and isn't) tracked](#what-is-and-isnt-tracked)).

## Layout

    .
    ├── profiles/
    │   ├── web/                 # web GUI profile
    │   └── tui/                 # terminal UI profile
    ├── font-inter-monaspace/    # out-of-tree plugin (built)
    ├── simple-mode/             # out-of-tree plugin (built)
    ├── ui-changed-files/        # out-of-tree plugin (built)
    ├── ui-file-mentions/        # out-of-tree plugin (built)
    ├── ui-files/                # out-of-tree plugin (built)
    ├── desktop-notify/          # out-of-tree plugin (built, host-side)
    └── web-notify/              # out-of-tree plugin (built, client-side)

## Profiles

| Profile | Bundles | Notes |
| --- | --- | --- |
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app` | web GUI; `cordis.patch.yml` inserts the plugins below |
| `tui` | `@deepseek-ai/dsh-base`, `@huiliyi37/dsh-tianshu-tui` | terminal UI (third-party `dsh-tianshu-tui`) |

`cordis.yml` is the profile root (an empty entry list). `cordis.patch.yml` is the patch layer applied on top of every bundle layer — edit `cordis.patch.yml`, never `cordis.yml`.

## Out-of-tree plugins

Each plugin is a self-contained directory with a `package.json` and a compiled `lib/`. A plugin is wired into a profile by two things:

1. a symlink `profiles/node_modules/@deepseek-ai/<pkg-name>` → the plugin directory, and
2. an `insert:` entry in `profiles/web/cordis.patch.yml` that loads the package by `id` + `name`.

| Directory | Package | Description |
| --- | --- | --- |
| `ui-file-mentions` | `@deepseek-ai/dsh-client-ui-file-mentions` | `@`-mention file/directory context source for the web composer |
| `ui-files` | `@deepseek-ai/dsh-client-ui-files` | Files view tab: directory/file navigation pane + syntax-highlighted file viewer |
| `ui-changed-files` | `@deepseek-ai/dsh-client-ui-changed-files` | Changes tab with expandable per-file git-style diffs |
| `simple-mode` | `@deepseek-ai/dsh-simple-mode` | `/simple` mode: session-local switch to a flash model with thinking off + badge |
| `font-inter-monaspace` | `@deepseek-ai/dsh-font-inter-monaspace` | Inter/Monaspace webfont for the web GUI |
| `desktop-notify` | `@deepseek-ai/dsh-desktop-notify` | host-side `notify-send` toasts for turn/subagent/goal completion (notification-v2 Part A) |
| `web-notify` | `@deepseek-ai/dsh-client-web-notify` | browser Web-Notification cues for approvals/plan-reviews/questions when the tab is hidden (notification-v2 Part B.2.1) |

## What is (and isn't) tracked

**Tracked:** `profiles/**` config and each plugin's `package.json` + `lib/`.

**Ignored** (see `.gitignore`):

| Path | Why |
| --- | --- |
| `.credentials.yaml` | API credentials (e.g. `DEEPSEEK_API_KEY`) |
| `.anonymous-user-id` | local machine identity |
| `sessions/` | full conversation history |
| `storages/` | runtime workspace/project caches |
| `node_modules/` | regenerable dependencies |
| `settings.yaml` | may contain private API endpoints |

> API keys never live in this repo. After cloning, recreate `~/.dsh/.credentials.yaml` with your own keys.

## Restoring

```sh
git clone https://github.com/zhoupen9/deepseek-harness-home.git "$HOME/.dsh"
```

1. **Install dependencies** (restores the gitignored `node_modules/`):

   ```sh
   cd "$HOME/.dsh/profiles/web" && pnpm install
   cd "$HOME/.dsh/profiles/tui" && pnpm install
   ```

2. **Re-link the out-of-tree plugins** (the symlinks live under the ignored `node_modules/`, so they are not tracked):

   ```sh
   cd "$HOME/.dsh/profiles/node_modules/@deepseek-ai"
   ln -s "$HOME/.dsh/ui-files"            dsh-client-ui-files
   ln -s "$HOME/.dsh/ui-changed-files"    dsh-client-ui-changed-files
   ln -s "$HOME/.dsh/ui-file-mentions"    dsh-client-ui-file-mentions
   ln -s "$HOME/.dsh/simple-mode"         dsh-simple-mode
   ln -s "$HOME/.dsh/font-inter-monaspace" dsh-font-inter-monaspace
   ln -s "$HOME/.dsh/desktop-notify"       dsh-desktop-notify
   ln -s "$HOME/.dsh/web-notify"           dsh-client-web-notify
   ```

3. **Recreate credentials** (`~/.dsh/.credentials.yaml`) with your `DEEPSEEK_API_KEY`.
