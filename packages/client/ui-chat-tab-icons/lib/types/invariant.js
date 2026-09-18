/** Invariant companion for @deepseek-ai/dsh-client-ui-chat-tab-icons. */
export const name = 'client-ui-chat-tab-icons-invariant'
export const inject = ['invariants']
const install = () => {}
export const apply = (ctx) => Promise.resolve(ctx.invariants.register('@deepseek-ai/dsh-client-ui-chat-tab-icons', install))
