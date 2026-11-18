import z from "@deepseek-ai/schemastery";
Object.freeze([
	"backgroundLight",
	"backgroundDark",
	"surfaceLight",
	"surfaceDark",
	"menuLight",
	"menuDark",
	"sidebarLight",
	"sidebarDark",
	"inputLight",
	"inputDark",
	"cardLight",
	"cardDark",
	"dialogLight",
	"dialogDark",
	"navLight",
	"navDark",
	"moduleLight",
	"moduleDark",
	"bubbleLight",
	"bubbleDark",
	"accentLight",
	"accentDark",
	"borderLight",
	"borderDark"
]);
Object.freeze({
	backgroundLight: "",
	backgroundDark: "",
	surfaceLight: "",
	surfaceDark: "",
	menuLight: "",
	menuDark: "",
	sidebarLight: "",
	sidebarDark: "",
	inputLight: "",
	inputDark: "",
	cardLight: "",
	cardDark: "",
	dialogLight: "",
	dialogDark: "",
	navLight: "",
	navDark: "",
	moduleLight: "",
	moduleDark: "",
	bubbleLight: "",
	bubbleDark: "",
	accentLight: "",
	accentDark: "",
	borderLight: "",
	borderDark: ""
});
/**
* Anchored matcher for one persistable palette color: the empty string (no
* override) or a solid CSS color — #rgb/#rrggbb hex, or rgb()/hsl() in the
* comma or space-separated form. Alpha forms are rejected: the swatch cannot
* produce them, and a translucent surface composites against whatever is
* behind it, which the palette layer cannot reason about.
*/
const PALETTE_COLOR_PATTERN = new RegExp([
	"^(?:|#(?:[0-9a-f]{3}){1,2}",
	"|rgb\\(\\s*-?\\d+(?:\\.\\d+)?%?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%?\\s*\\)",
	"|hsl\\(\\s*-?\\d+(?:\\.\\d+)?(?:deg|grad|rad|turn)?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%\\s*\\)",
	")$"
].join(""), "i");
//#endregion
//#region src/index.ts
/** One validated palette color field: '' keeps the shipped palette value. */
function colorField() {
	return z.string().pattern(PALETTE_COLOR_PATTERN).default("");
}
/**
* Live palette preferences. The browser half reads this namespace through the
* configuration-form service; the host itself only owns the schema that
* validates and persists the values.
*/
const Config = z.object({
	backgroundLight: colorField().volatile(),
	backgroundDark: colorField().volatile(),
	surfaceLight: colorField().volatile(),
	surfaceDark: colorField().volatile(),
	menuLight: colorField().volatile(),
	menuDark: colorField().volatile(),
	sidebarLight: colorField().volatile(),
	sidebarDark: colorField().volatile(),
	inputLight: colorField().volatile(),
	inputDark: colorField().volatile(),
	cardLight: colorField().volatile(),
	cardDark: colorField().volatile(),
	dialogLight: colorField().volatile(),
	dialogDark: colorField().volatile(),
	navLight: colorField().volatile(),
	navDark: colorField().volatile(),
	moduleLight: colorField().volatile(),
	moduleDark: colorField().volatile(),
	bubbleLight: colorField().volatile(),
	bubbleDark: colorField().volatile(),
	accentLight: colorField().volatile(),
	accentDark: colorField().volatile(),
	borderLight: colorField().volatile(),
	borderDark: colorField().volatile()
});
/** No host-side behavior; the client half applies the override layer and registers the settings row. */
function apply() {}
//#endregion
export { Config, apply };
