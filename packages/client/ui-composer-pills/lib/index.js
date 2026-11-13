import z from "@deepseek-ai/schemastery";
//#region src/index.ts
/**
* Live composer-dock preference. The browser half reads this namespace through
* the configuration-form service; the host itself only owns the schema that
* validates and persists the value.
*/
const Config = z.object({ hideBuiltinPills: z.boolean().default(false).volatile() });
/** No host-side behavior; the client half suppresses the pills and registers the settings row. */
function apply() {}
//#endregion
export { Config, apply };
