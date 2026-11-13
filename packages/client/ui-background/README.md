# @zar-desktop/ui-background — background image and opacity for the Web GUI

A profile-local DSH plugin that adds one **Settings → General** row for a
full-window background image. The image source, the master switch, and the
image opacity are validated and persisted by the DSH settings service in the
plugin row's own `ui-background` namespace.

## What it does

- **Image source** — an `https`/`http` URL, a `data:image/…` URI, or an
  absolute local path (`/home/me/bg.jpg`, `C:\pics\bg.jpg`). Local paths are
  rendered through the authenticated `/api/file` route, so the browser never
  needs `file://` access.
- **Opacity** — a 0–100 % slider that sets the image layer's `opacity`; lower
  values let the page palette show through for readability.
- **Master switch** — turning it off retracts the layer and restores the
  shipped surfaces, with no leftover styles or token overrides.
- The schema is the persistence boundary: every edit, from the General row or
  the settings API, is validated against the same three fields.

## How it is wired

| Surface | Value | Purpose |
| --- | --- | --- |
| Loader row | `ui-background` | Host half (`Config`, empty `apply`) owns the settings namespace |
| Settings namespace | `ui-background` | `enabled`, `image`, `opacity` (all volatile) |
| Slot | `settings.general.item` id `background`, order 12 | the settings row |
| Theme override | `--dsw-alias-bg-base`, `--dsw-specific-sidebar-fill` → `transparent` | lets the layer show through the frame and sidebar |
| Body layer | `body[data-dsh-background]::before` with `--dsh-background-image` / `--dsh-background-opacity` | the fixed image layer |

The client half adopts accepted values through `ctx.configForms.get('ui-background')`.
The image layer sits behind app content; menus, dialogs, and settings surfaces
keep their own opaque fills.

## Source layout

    packages/client/ui-background/
      package.json                # @zar-desktop/ui-background
      tsconfig.json               # standalone build config
      tsdown.config.ts            # clientBundle preset (src/index.ts + src/client/index.ts)
      lib/                        # BUILT artifacts
        index.js                  #   host half (schema only)
        client.js                 #   browser bundle
      src/index.ts                # host half: Config + apply()
      src/client/index.ts         # plugin body: adoption, style, row registration
      src/client/BackgroundRow.tsx
      src/client/BackgroundRow.module.css
      src/client/background.css   # the body::before layer
      src/client/presenter.ts     # body variables + theme override
      src/client/settings.ts      # namespace, defaults, source classification
      src/client/store.ts         # row store
      src/client/locales.ts       # zh/en dictionaries
      tests/                      # pure logic, presenter, schema, dictionaries, drift guard
      INTEGRATION.md              # wiring/removal record

## Build and test

    cd ~/.dsh/packages/client/ui-background
    ~/.dsh/node_modules/.bin/tsdown
    DSH_HARNESS_DIR=~/Sources/deepseek-harness ~/.dsh/node_modules/.bin/vitest run

The host half imports `@deepseek-ai/schemastery`, installed once at the home
root (`~/.dsh/node_modules`) so Node resolves it from the plugin's real path.

## Notes

- The image is painted behind the app; content surfaces keep their own fills,
  and the shipped macOS vibrancy path is unchanged. Readability depends on the
  chosen image and opacity.
- A local path is served only while it is the configured source; the
  `/api/file` route is the shipped authenticated reader used by path images in
  Markdown.
- There is no thumbnail preview or file picker: the field takes a URL or an
  absolute path, and the effect appears after the value is committed.
