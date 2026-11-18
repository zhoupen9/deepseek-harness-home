# @zar-desktop/ui-background — background image and opacity for the Web GUI

A profile-local DSH plugin that adds one **Settings → General** row for a
full-window background image. The image source, the master switch, and the
per-palette image opacity are validated and persisted by the DSH settings
service in the plugin row's own `ui-background` namespace.

## What it does

- **Image source** — an `https`/`http` URL, a `data:image/…` URI, or an
  absolute local path (`/home/me/bg.jpg`, `C:\pics\bg.jpg`). Local paths are
  rendered through the authenticated `/api/file` route, so the browser never
  needs `file://` access.
- **Opacity per palette** — one 0–100 % slider for the light palette and one
  for the dark palette, so a dark photo can stay strong in the dark theme and
  faint over the light palette's near-black text. An absent per-palette value
  follows the shared `opacity` field, which keeps the previous single-slider
  configuration working.
- **Palette base under the image** — the image layer blends against the
  palette's base color, not against the window or canvas behind the page.
  Clearing `--dsw-alias-bg-base` without it would expose the native backdrop
  (a Linux Electron window keeps the color it was created with), and the light
  palette would paint near-black text over it. The macOS desktop keeps its
  transparent page and sidebar vibrancy.
- **Master switch** — turning it off retracts both layers and restores the
  shipped surfaces, with no leftover styles or token overrides.
- The schema is the persistence boundary: every edit, from the General row or
  the settings API, is validated against the same fields.

## How it is wired

| Surface | Value | Purpose |
| --- | --- | --- |
| Loader row | `ui-background` | Host half (`Config`, empty `apply`) owns the settings namespace |
| Settings namespace | `ui-background` | `enabled`, `image`, `opacity`, `opacityLight`, `opacityDark` (all volatile) |
| Slot | `settings.general.item` id `background`, order 12 | the settings row |
| Theme override | `--dsw-alias-bg-base`, `--dsw-specific-sidebar-fill` → `transparent` | lets the layers show through the frame and sidebar |
| Base layer | `body[data-dsh-background]::before` with `--dsh-palette-bg-base-light` / `-dark`, else the shipped static alias | keeps the light palette's backdrop light on every host, following a custom palette |
| Image layer | `body[data-dsh-background]::after` with `--dsh-background-image` and the per-palette opacity variable | the fixed image layer |

The client half adopts accepted values through `ctx.configForms.get('ui-background')`.
The base and image layers sit behind app content; menus, dialogs, and settings
surfaces keep their own opaque fills.

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
      src/client/presenter.ts     # body variables (image + both opacities) + theme override
      src/client/settings.ts      # namespace, defaults, source classification, per-palette opacity
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

- The image is painted behind the app over the palette base; content surfaces
  keep their own fills, and the shipped macOS vibrancy path is unchanged.
  Readability still depends on the chosen image and each palette's opacity.
- A stored `opacity` remains the fallback for a palette without its own
  `opacityLight` / `opacityDark`, so the row keeps showing the previous single
  value until one slider is moved.
- The base layer follows `--dsh-palette-bg-base-light` / `-dark` written by
  `@zar-desktop/ui-palette`, and falls back to the shipped statics
  (`--dsw-static-neutral-bluish-00` and `-950`) when that plugin is absent or
  the page background is unset.
- A local path is served only while it is the configured source; the
  `/api/file` route is the shipped authenticated reader used by path images in
  Markdown.
- There is no thumbnail preview or file picker: the field takes a URL or an
  absolute path, and the effect appears after the value is committed.
