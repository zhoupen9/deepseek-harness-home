/**
 * Package-owned invariant companion for `@zar-desktop/ui-edits`.
 * @module @zar-desktop/ui-edits/invariant
 */

/** Cordis companion plugin name. */
export const name = 'client-ui-edits-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: a pure-consumer plugin. */
const install = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) =>
  Promise.resolve(ctx.invariants.register('@zar-desktop/ui-edits', install))
