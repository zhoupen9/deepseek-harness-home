# @zar-desktop/ui-palette — palette colors for light and dark themes

A profile-local DSH plugin that adds one **Settings → General** row for six
surface and accent colors per palette mode. The values are validated and
persisted by the DSH settings service in the plugin row's own `ui-palette`
namespace, then applied through the theme service's override layer.

## What it does

- **Twelve entries per mode** — page background, raised surface (`bg-layer-1`
  fills), menu/popover surface, sidebar fill, chat input (`input-major`, also
  the attachment and approval panels), card surface (changed-file and
  deliverable cards, plan previews, schedule cards), dialog surface
  (`bg-layer-2`: the Settings panel and every modal), nav selection (the
  Settings nav's active row), control surface (`bg-module-platform`: setting
  selectors, tags, segmented tabs, module cards), user message bubble, accent,
  border. Each mode has its own swatch, so a light palette can differ from the
  dark one.
- **Swatch or typed code** — every entry carries the native color swatch and a
  color-code field beside it. Pick with the swatch, or type/paste a code such
  as `#d97757` and commit with Enter or by leaving the field; the swatch
  follows the field. The field placeholder shows the shipped code.
- **Unset means shipped** — an empty code follows the shipped alias palette;
  clearing the field or pressing the reset action that appears on an overridden
  entry clears the value again. The swatch preview uses the opaque equivalent
  of the shipped translucent menu and border tokens.
- **Solid colors only** — `#rgb`/`#rrggbb`, `rgb()` and `hsl()`. Alpha forms
  are rejected by the schema: the swatch cannot produce them, and a translucent
  surface composites against whatever sits behind it.
- **Coexists with the background image** — while the image plugin paints, the
  page background and sidebar entries yield to its transparent surfaces, and
  the image layer takes the palette page background as the color it blends
  with. The row re-applies when the image starts or stops painting.
- The schema is the persistence boundary: every edit, from the row or the
  settings API, is validated against the same twelve fields.

## How it is wired

| Surface | Value | Purpose |
| --- | --- | --- |
| Loader row | `ui-palette` | Host half (`Config`, empty `apply`) owns the settings namespace |
| Settings namespace | `ui-palette` | `background*`, `surface*`, `menu*`, `sidebar*`, `accent*`, `border*`, each `Light`/`Dark` |
| Slot | `settings.general.item` id `palette`, order 11.7 | the settings row, after Appearance and Font color |
| Theme override | `ctx.theme.overrideTokens('@zar-desktop/ui-palette', …)` | per-token `{ light, dark }` pairs |
| Image base | `--dsh-palette-bg-base-light` / `--dsh-palette-bg-base-dark` on `body` | the background image layer's base color |

Override tokens: `--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1`,
`--dsw-specific-menu`, `--dsw-specific-sidebar-fill`,
`--dsw-specific-input-major`, `--dsw-alias-card-fill` (plus the derived
`--dsw-alias-card-fill-hover`), `--dsw-alias-bg-layer-2`,
`--dsw-specific-sidebar-nav-item-active`, `--dsw-alias-bg-module-platform`,
`--dsw-specific-bubble`, `--dsw-alias-brand-primary`,
`--dsw-alias-border-l2`.

The theme service composes override layers per token; the background image's
transparency is the only conflict. `background.css` in `ui-background` consumes
the two base variables, so the image blends against the palette instead of the
shipped white/`#151517`.

## Source layout

    packages/client/ui-palette/
      package.json                # @zar-desktop/ui-palette
      tsconfig.json               # standalone build config
      tsdown.config.ts            # clientBundle preset (src/index.ts + src/client/index.ts)
      lib/                        # BUILT artifacts
        index.js                  #   host half (schema only)
        client.js                 #   browser bundle
      src/index.ts                # host half: Config + apply()
      src/palette-settings.ts     # fields, defaults, color pattern (shared by both halves)
      src/client/index.ts         # plugin body: adoption, row registration
      src/client/settings.ts      # entries, override assembly, image base, swatch helper
      src/client/presenter.ts     # override layer, base variables, image-attribute observer
      src/client/store.ts         # row store
      src/client/PaletteRow.tsx   # the settings row
      src/client/PaletteRow.module.css
      src/client/locales.ts       # zh/en dictionaries
      tests/                      # pure logic, presenter, schema, dictionaries
      INTEGRATION.md              # wiring/removal record

## Build and test

    cd ~/.dsh/packages/client/ui-palette
    ~/.dsh/node_modules/.bin/tsdown
    DSH_HARNESS_DIR=~/Sources/deepseek-harness ~/.dsh/node_modules/.bin/vitest run

The host half imports `@deepseek-ai/schemastery`, installed once at the home
root (`~/.dsh/node_modules`) so Node resolves it from the plugin's real path.

## Notes

- The theme service requires a full `{ light, dark }` pair per token, so a mode
  without its own value is pinned to that entry's shipped color. Reset the
  entry to stop pinning it.
- The existing Font color row still owns primary text and composes after
  override layers; a palette entry for text would lose to it, which is why this
  row leaves text to that setting.
- Menu and border targets replace the shipped translucent values with the
  picked solid color; the shipped translucency returns on reset.
- The card surface derives its hover alias from the picked color by mixing 8 %
  of the palette text color, which keeps hover darker on a light card and
  lighter on a dark one.
- A registered third-party theme that repaints the same aliases is overridden
  by this layer, not the other way round.
