/** Row store mirroring the accepted background setting. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import { DEFAULT_BACKGROUND_SETTINGS, type BackgroundSettings } from './settings.ts'

/** Store state mirrored from the settings form. */
export interface BackgroundRowState {
  /** Whether the image is painted. */
  enabled: boolean
  /** Stored image source. */
  image: string
  /** Stored layer opacity from 0 through 1. */
  opacity: number
  /** Accepted namespace revision; -1 until the first sync so revision 0 lands as a change. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type BackgroundRowActions = {
  sync: (draft: BackgroundRowState, settings: BackgroundSettings, revision: number) => void
}

/**
 * Declares the background row state and sync surface.
 * @returns the store handle.
 */
export function createBackgroundRowStore(): EngineStoreHandle<BackgroundRowState, BackgroundRowActions> {
  return defineStore({
    init: (): BackgroundRowState => ({ ...DEFAULT_BACKGROUND_SETTINGS, revision: -1 }),
    actions: {
      sync: (d, settings: BackgroundSettings, revision: number) => {
        if (revision <= d.revision) return
        d.enabled = settings.enabled
        d.image = settings.image
        d.opacity = settings.opacity
        d.revision = revision
      },
    },
  })
}
