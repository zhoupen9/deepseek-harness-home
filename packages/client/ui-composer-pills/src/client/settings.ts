/** Durable composer-pill preference and the row's identity constants. */

/** Loader-entry id that owns the settings namespace; must match the bundle row id. */
export const COMPOSER_PILLS_SETTINGS_NAMESPACE = 'ui-composer-pills'

/** Settings field carrying the hide switch. */
export const COMPOSER_PILLS_HIDDEN_FIELD = 'hideBuiltinPills'

/** Plugin identity used for the injected style tag. */
export const COMPOSER_PILLS_PLUGIN_ID = '@zar-desktop/ui-composer-pills'

/**
 * Composer dock cells owned by ui-chat. Reusing an id puts this plugin in that
 * cell; the lowest priority renders, so a null occupant at priority -1 hides
 * the shipped pill without touching any other cell in the slot.
 */
export const BUILTIN_DOCK_CELLS = ['activity', 'usage'] as const

/** Slot the builtin pills register into, and the slot anchor carrying them. */
export const COMPOSER_DOCK_SLOT = 'conversation.composer.dock'

/** Settings → General cell key of this plugin's row. */
export const COMPOSER_PILLS_ROW_ID = 'composer-pills'

/** Browser-side view of the durable setting. */
export interface ComposerPillsSettings {
  /** Whether the builtin pills and the context meter are hidden. */
  readonly hideBuiltinPills: boolean
}

/** Values the namespace resolves to when the user has not overridden anything. */
export const DEFAULT_COMPOSER_PILLS_SETTINGS: ComposerPillsSettings = Object.freeze({
  hideBuiltinPills: false,
})
