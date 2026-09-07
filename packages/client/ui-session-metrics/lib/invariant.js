//#region lib/types/invariant.js
/** Invariant companion for @deepseek-ai/dsh-client-ui-session-metrics. */
const name = "client-ui-session-metrics-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@deepseek-ai/dsh-client-ui-session-metrics", install));
//#endregion
export { apply, inject, name };
