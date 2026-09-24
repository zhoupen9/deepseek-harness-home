# ui-session-metrics — profile integration record

Pure-consumer chat-header session metrics, done entirely in user space per
the usual direction (nothing under /usr/lib/deepseek-harness is touched;
everything lives in /home/zhoupeng/.dsh).

## What replaces what

- **Added**: a compact metrics capsule at the left edge of the Session
  Header utility cluster (slot `conversation.session.header.utilities`,
  entry id `session-metrics`, order -11): it swaps with the shipped
  "Open In…" split button (order -10) so the row reads metrics · Open In… ·
  Session log (order 0). The capsule mirrors the reading set the shipped
  composer strip presents for the accepted `Performance & usage` level (the
  Chat target's `performanceUsage` setting, read through the configuration-form
  service and delivered to the component as a registrant-private hook): the
  detailed level shows the input/output token counts and opens the merged panel
  on hover or focus, and the compact level shows the strip's two plain readings
  (decode throughput, cache-hit share) and opens nothing, because the shipped
  compact strip opens no dialog either.
- **Replaced**: the bottom-of-chat stats pills — ui-chat's StatsPills row
  (slot `conversation.composer.dock`, entry id `stats`, priority 0), whose
  two pills click-open the shipped session-statistics and token-usage dialogs.
  This plugin registers the same cell id at priority -1 (same-id cells clash
  only at equal priority; lowest priority renders) with an empty occupant, so
  the row disappears while the plugin is mounted in both detail levels; the
  compact level's own readings move to the capsule, so nothing it showed is
  lost. Both dialogs' content is
  served by the header capsule's single merged panel, in their own skin
  (ui-chat's `stat-dialog.module.css` surface and row grid, copied because a
  feature plugin may not import another feature plugin's stylesheet) and with
  their own rows, conditions, and copy.
- **Replaced**: the composer context meter — ui-conversation's ContextMeter
  (ring + percentage below the card), and with it the meter's own panel. The
  composer renders that meter directly rather than through a slot, so it owns
  no cell to shadow by id and priority. The plugin's apply passes
  `ctx.effect` a stylesheet that hides it (`document.head` gains a
  `data-session-metrics="composer-context-meter"` style element; unloading the
  plugin removes it). Its reading — the occupancy percentage, the
  `~used / window` figures, the composition bar, and the heuristic
  system/tools/messages legend — is served by the merged panel's context
  section. The hide is defensive on purpose: if ui-conversation ever renders
  that meter differently the selector stops matching and the shipped meter
  simply returns.

Token counts in the panel's Token usage section render in the shared compact
form (`12.2K`, `7.1M`) instead of the shipped dialog's grouped exact digits, so
the panel agrees with the capsule and every other token figure in the app. The
shipped exact form is deliberately not mirrored, which is why this plugin has
no `formatExactTokens` counterpart or `number.groupSeparator` copy.

The merged panel therefore holds three sections, in the shipped order:
Session statistics (gauge glyph, counts headline), Token usage (database
glyph, billed-total headline), and Context usage (ring glyph, percentage
headline). The per-turn dialog inside the transcript (TurnUsagePanel) stays
where it is: it describes one turn, and no session-level panel can show a
turn's own buckets. The 0.1.7 merge removed that dialog's sibling TurnTimePanel
(per-turn duration / TTFT / TPS) and gated TurnUsagePanel on the detailed
`Performance & usage` level, so per-turn duration now appears only as the
process header's run-duration label (TurnProcessNodeView).

## Steps taken

1. Built `lib/` with the workspace toolchain (tsdown + lightningcss at
   /home/zhoupeng/.dsh; shared preset under `packages/client/`).
2. Installed the package as a **profile-local dependency**:
   `dsh plugin --profile web add link:/home/zhoupeng/.dsh/packages/client/ui-session-metrics`,
   which pnpm links under `profiles/web/node_modules/`. Runtime profile
   resolution skips the legacy `profiles/node_modules` shared fallback, so a
   link there alone does not resolve. ui-edits, ui-changes, and ui-git are
   installed the same way.
3. Inserted the loader entry into `profiles/web/cordis.patch.yml`:
   ```yaml
   - insert:
       - id: ui-session-metrics
         name: '@deepseek-ai/dsh-client-ui-session-metrics'
   ```
   The web profile's `patchReload: live` recomposes the running loader — no
   server restart. A page refresh loads the new client bundle.

### Fallback projections removed (2026-09-18)

`profiles/node_modules` — the legacy shared fallback that mirrored the
installed /usr/lib/deepseek-harness dependency surface — and the empty
`profiles/web/.dsh-module-fallback` tree were deleted. Runtime resolution
(the launcher default since 0.1.6-alpha.2) reads neither position: a miss
skips both, and the four local plugins resolve from this profile's own
`node_modules`. The fallback had also gone stale, mirroring the installed
0.1.6-alpha.1 tree while this profile runs the 0.1.6-alpha.2 source. A
link/dual-mode launch would materialize both again; nothing else needs them.

## Rebuild after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-session-metrics
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
/home/zhoupeng/.dsh/node_modules/.bin/vitest run
```

The suite carries an upstream drift guard (`tests/upstream-drift.client.spec.ts`).
Everything this plugin mirrors instead of importing — because a profile-local
plugin may not import another feature plugin's values or stylesheet — is
compared against the harness the local `dsh` actually runs (resolved from
`$DSH_HARNESS_DIR`, else from the `dsh` entry on PATH): the baseline exports the
built bundle requires, the token and duration formatting rules, the occupancy
fold and ring geometry, the mirrored copy, the shipped stat-dialog /
context-meter skin, and the slot and setting contracts. A harness upgrade that
renames an export, adds a panel property, rewords a row, adds or renames a
`stats.*` / `message.turnUsage.*` / `context.*` key, or changes the
performance-usage levels fails the guard with the specific difference, so
re-synchronizing stays a deliberate step. Re-run it after every harness merge.

## Verification

- Boot graph (`GET /plugins/events`) carries the row
  `@deepseek-ai/dsh-client-ui-session-metrics` with inject
  `["slots","locale"]`.
- Bundle route `/plugins/…client.js&rev=…` → HTTP 200 with the
  `window.__ModuleLoader__.load({ id: "@deepseek-ai/dsh-client-ui-session-metrics", …})`
  handoff; the factory requires only baseline module-table rows (react,
  react/jsx-runtime, react-dom, `@deepseek-ai/dsh-client-ui-primitives`).
- Behavior: the bottom pills, their dialogs, and the composer context ring are
  gone; the header capsule shows the shipped token-usage icon with the
  input/output figures and a live context ring whose arc is the occupancy
  percentage (no number beside it; token speed and cache-hit rate stay in the
  panel);
  hovering it opens one panel
  whose three sections carry the shipped dialog skin and the shipped rows.
  Disabling the patch row restores every shipped surface.
- Pure logic: `vitest run tests/session-metrics.client.spec.ts` covers the
  occupancy fold (projected-over-sampled, capped at 100, null without a
  sample or a usable capacity), the session token total, the quarter-filling
  glyph, and both dictionaries.

## Rollback

Remove the `ui-session-metrics` insert row from `profiles/web/cordis.patch.yml`
and drop the dependency with
`dsh plugin --profile web remove @deepseek-ai/dsh-client-ui-session-metrics`.
The shipped StatsPills row and its dialogs, the composer context meter, and
the header are restored exactly: the shadowed `stats` cell re-emerges, the
injected stylesheet leaves with the plugin, and the header capsule disappears.
