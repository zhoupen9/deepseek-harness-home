# ui-palette — profile integration record

Palette colors for light and dark themes, done entirely in user space: nothing
under `/usr/lib/deepseek-harness` is touched, and everything lives in
`/home/zhoupeng/.dsh`.

## What it adds

- **Host half** (`lib/index.js`): `Config` with twenty-four volatile color fields
  (`<entry><Light|Dark>`), each validated against the solid-color pattern and
  defaulting to `''`; `apply()` is empty. The Loader row id `ui-palette` is
  therefore the settings namespace the client reads.
- **Client half** (`lib/client.js`): a `settings.general.item` row (id
  `palette`, order 11.7) and the theme override layer it drives. Values are
  adopted through `ctx.configForms.get('ui-palette')` and applied with
  `ctx.theme.overrideTokens`; the page background is also written to the body
  variables the background image layer consumes.
- **Image coordination.** While `body[data-dsh-background]` is set, the page
  background and sidebar entries are omitted from the override layer (the image
  plugin clears those surfaces) and the image's own base layer uses
  `--dsh-palette-bg-base-light` / `-dark`. A `MutationObserver` re-applies the
  layer when the attribute appears or disappears.

## Wiring

| Surface | Value |
| --- | --- |
| Bundle row | `- id: ui-palette` / `name: '@zar-desktop/ui-palette'` |
| Profiles | `link:` dependency in `profiles/web` and `profiles/desktop` |
| Slot | `settings.general.item`, id `palette`, order 11.7 |
| Namespace | `ui-palette` (twelve color fields) |
| Tokens | `--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1`, `--dsw-specific-menu`, `--dsw-specific-sidebar-fill`, `--dsw-specific-input-major`, `--dsw-alias-card-fill` + derived `--dsw-alias-card-fill-hover`, `--dsw-alias-bg-layer-2`, `--dsw-specific-sidebar-nav-item-active`, `--dsw-alias-bg-module-platform`, `--dsw-specific-bubble`, `--dsw-alias-brand-primary`, `--dsw-alias-border-l2` |

## Steps taken

1. Added the package under `packages/client/ui-palette` with source in `src/`.
2. Registered it in `scripts/client-plugins.mjs`'s plugin list.
3. Added the row to `packages/bundles/zar-desktop/cordis.patch.yml` and the
   `link:` dependency to both profiles, then `pnpm install` in each profile.
4. Built `lib/` with the shared toolchain:

        cd ~/.dsh/packages/client/ui-palette
        ~/.dsh/node_modules/.bin/tsdown

## Rebuild after source edits

    cd ~/.dsh/packages/client/ui-palette
    ~/.dsh/node_modules/.bin/tsdown
    DSH_HARNESS_DIR=~/Sources/deepseek-harness ~/.dsh/node_modules/.bin/vitest run

The served bundle is re-read per page load; the host row and namespace need a
profile recompose (a page refresh after the loader sees the row).

## Verification

- The bundle route serves `lib/client.js` with the
  `window.__ModuleLoader__.load({ id: "@zar-desktop/ui-palette" })` handoff; its
  only requires are the baseline `react/jsx-runtime` and
  `@deepseek-ai/dsh-client-store`.
- Settings → General shows a **Palette** row after Font color; each mode lists
  twelve swatches with a color-code field; picking a color or typing a code such
  as `#d97757` repaints that surface; an empty code or the reset action on an
  overridden entry restores the shipped color; an unsupported code keeps the
  text, marks the field invalid and shows the accepted forms.
- `Config` rejects alpha forms and malformed colors at the settings boundary.

## Rollback

Remove the `ui-palette` row from the bundle patch, remove the `link:`
dependency from both profiles, delete the package directory, and restore the
statics in `ui-background/src/client/background.css` if the palette base
variables should disappear too. The namespace, the settings row, the override
layer, and the body variables disappear with the row; nothing else references
them.

## Notes

- The theme service composes override layers per token with last-write-wins.
  The only overlapping owner is the background image's transparency, handled by
  omitting the two cleared tokens while its attribute is present.
- Text colors stay with the Appearance → Font color row, which composes after
  override layers and would win anyway.
- The row writes only the fields it changes; an untouched swatch keeps the
  shipped palette and costs no override layer.
