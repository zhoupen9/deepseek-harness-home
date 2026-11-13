/** Row store mirroring the accepted composer-pill setting. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import { DEFAULT_COMPOSER_PILLS_SETTINGS, type ComposerPillsSettings } from './settings.ts'

/** Store state mirrored from the settings form. */
export interface ComposerPillsRowState {
  /** Whether the builtin pills are hidden. */
  hideBuiltinPills: boolean
  /** Accepted namespace revision; -1 until the first sync so revision 0 lands as a change. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type ComposerPillsRowActions = {
  sync: (draft: ComposerPillsRowState, settings: ComposerPillsSettings, revision: number) => void
}

/**
 * Declares the composer-pill row state and sync surface.
 * @returns the store handle.
 */
export function createComposerPillsRowStore(): EngineStoreHandle<ComposerPillsRowState, ComposerPillsRowActions> {
  return defineStore({
    init: (): ComposerPillsRowState => ({ ...DEFAULT_COMPOSER_PILLS_SETTINGS, revision: -1 }),
    actions: {
      sync: (d, settings, revision) => {
        if (revision <= d.revision) return
        d.hideBuiltinPills = settings.hideBuiltinPills
        d.revision = revision
      },
    },
  })
}
