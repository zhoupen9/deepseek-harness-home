//#region lib/types/invariant.js
/** Invariant companion for @zar-desktop/ui-session-metrics. */
const name = "client-ui-session-metrics-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@zar-desktop/ui-session-metrics", install));
//#endregion
export { apply, inject, name };
