/** Row store mirroring the accepted palette setting. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import {
  DEFAULT_PALETTE_SETTINGS, PALETTE_FIELDS, type PaletteField, type PaletteSettings,
} from './settings.ts'

/** Store state mirrored from the settings form, plus the accepted revision. */
export type PaletteRowState = { [K in PaletteField]: string } & {
  /** Accepted namespace revision; -1 until the first sync so revision 0 lands as a change. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type PaletteRowActions = {
  sync: (draft: PaletteRowState, settings: PaletteSettings, revision: number) => void
}

/**
 * Declares the palette row state and sync surface.
 * @returns the store handle.
 */
export function createPaletteRowStore(): EngineStoreHandle<PaletteRowState, PaletteRowActions> {
  return defineStore({
    init: (): PaletteRowState => ({ ...DEFAULT_PALETTE_SETTINGS, revision: -1 }),
    actions: {
      sync: (d, settings, revision) => {
        if (revision <= d.revision) return
        for (const field of PALETTE_FIELDS) d[field] = settings[field]
        d.revision = revision
      },
    },
  })
}
