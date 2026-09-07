/** Invariant companion for @deepseek-ai/dsh-client-ui-session-metrics. */
export const name = 'client-ui-session-metrics-invariant'
export const inject = ['invariants']
const install = () => {}
export const apply = (ctx) => Promise.resolve(ctx.invariants.register('@deepseek-ai/dsh-client-ui-session-metrics', install))
