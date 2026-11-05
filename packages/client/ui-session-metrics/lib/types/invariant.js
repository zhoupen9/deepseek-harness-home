/** Invariant companion for @zar-desktop/ui-session-metrics. */
export const name = 'client-ui-session-metrics-invariant'
export const inject = ['invariants']
const install = () => {}
export const apply = (ctx) => Promise.resolve(ctx.invariants.register('@zar-desktop/ui-session-metrics', install))
