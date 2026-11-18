import z from "@deepseek-ai/schemastery";
//#region src/index.ts
/**
* Live background preferences. The browser half reads this namespace through
* the configuration-form service; the host itself only owns the schema that
* validates and persists the values.
*/
const Config = z.object({
	enabled: z.boolean().default(false).volatile(),
	image: z.string().default("").volatile(),
	opacity: z.number().min(0).max(1).default(.5).volatile(),
	opacityLight: z.number().min(0).max(1).volatile(),
	opacityDark: z.number().min(0).max(1).volatile()
});
/** No host-side behavior; the client half paints the layers and registers the settings row. */
function apply() {}
//#endregion
export { Config, apply };
