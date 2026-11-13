# ui-background — profile integration record

A schema-backed background-image setting, done entirely in user space:
nothing under `/usr/lib/deepseek-harness` is touched, and everything lives in
`/home/zhoupeng/.dsh`.

## What it adds

- **Host half** (`lib/index.js`): `Config` with `enabled`, `image`, and
  `opacity`, all volatile; `apply()` is empty. The Loader row id
  `ui-background` is therefore the settings namespace the client reads.
- **Client half** (`lib/client.js`): a `settings.general.item` row (id
  `background`, order 12) and the `body::before` layer. Values are adopted
  through `ctx.configForms.get('ui-background')`; the layer paints with
  `ctx.theme.overrideTokens` clearing `--dsw-alias-bg-base` and
  `--dsw-specific-sidebar-fill`.
- **Local paths** use the shipped authenticated `/api/file` route, so the
  plugin needs no host route and no file-picking bridge.

## Wiring

| Surface | Value |
| --- | --- |
| Bundle row | `- id: ui-background` / `name: '@zar-desktop/ui-background'` |
| Profiles | `link:` dependency in `profiles/web` and `profiles/desktop` |
| Slot | `settings.general.item`, id `background`, order 12 |
| Namespace | `ui-background` (`enabled`, `image`, `opacity`) |

## Steps taken

1. Added the package under `packages/client/ui-background` and registered it
   in `scripts/client-plugins.mjs`'s plugin list.
2. Added `@deepseek-ai/schemastery` to the home root toolchain so the host
   half's schema import resolves from the plugin's real path.
3. Added the row to the `@zhp-dev/zar-desktop` bundle patch and the `link:`
   dependency to both profiles (then `pnpm install` in each profile).
4. Built `lib/` with the shared toolchain:

        cd ~/.dsh/packages/client/ui-background
        ~/.dsh/node_modules/.bin/tsdown

## Rebuild after source edits

    cd ~/.dsh/packages/client/ui-background
    ~/.dsh/node_modules/.bin/tsdown
    DSH_HARNESS_DIR=~/Sources/deepseek-harness ~/.dsh/node_modules/.bin/vitest run

The served bundle is re-read per page load; the host row and namespace need a
profile recompose (a page refresh after the loader sees the row).

## Verification

- `GET /plugins/events` boot graph carries `@zar-desktop/ui-background`.
- The bundle route serves `lib/client.js` with the
  `window.__ModuleLoader__.load({ id: "@zar-desktop/ui-background" })` handoff;
  its only requires are the baseline `react`, `react/jsx-runtime`,
  `@deepseek-ai/dsh-client-store`, and `@deepseek-ai/dsh-client-ui-primitives`.
- Settings → General shows the **Background image** row below Appearance; a
  URL or absolute path plus the switch paints the image behind the app; the
  slider changes the layer opacity; switching off restores the shipped look.
- `Config` rejects opacity values outside 0–1 at the settings boundary.

## Rollback

Remove the `ui-background` row from the bundle patch, remove the `link:`
dependency from both profiles, and delete the package directory. The
namespace, the settings row, the layer, and the theme override disappear with
the row; nothing else references them.

## Notes

- `dsh-app://app/`-based Desktop pages resolve local paths through the same
  `/api/file` route the shipped Markdown path images use.
- The image opacity blends against the page canvas (white/light, black/dark),
  so a mid-range value balances the photo against the text.
- The General row and the settings API edit the same namespace and share
  revisions through the settings service.
