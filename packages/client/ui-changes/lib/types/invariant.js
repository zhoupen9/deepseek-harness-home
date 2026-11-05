/**
 * Package-owned invariant companion for `@zar-desktop/ui-changes`.
 * @module @zar-desktop/ui-changes/invariant
 */

/** Cordis companion plugin name. */
export const name = 'client-ui-changes-invariant'
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
  Promise.resolve(ctx.invariants.register('@zar-desktop/ui-changes', install))
