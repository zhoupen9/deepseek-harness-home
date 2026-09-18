//#region lib/types/invariant.js
/** Invariant companion for @deepseek-ai/dsh-client-ui-chat-tab-icons. */
const name = "client-ui-chat-tab-icons-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register("@deepseek-ai/dsh-client-ui-chat-tab-icons", install));
//#endregion
export { apply, inject, name };
