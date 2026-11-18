/**
 * Palette preference row registered into the General section item slot: title
 * and description, then one group per palette mode with a swatch and a color
 * code per entry. The swatch opens the native picker; the code field accepts a
 * typed or pasted color and commits on Enter or blur. An empty code follows the
 * shipped palette, and a reset clears an overridden entry.
 */
import { useState } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createPaletteRowStore } from './store.ts'
import type { PaletteKey } from './locales.ts'
import {
  colorInput, PALETTE_ENTRIES, paletteField, shippedColor, swatchHex, type PaletteField, type PaletteMode,
} from './settings.ts'
import css from './PaletteRow.module.css'

/** Injected business face: the one write owned by the settings row. */
export interface PaletteRowInjected {
  /** Persist one field; `''` restores the shipped palette value. */
  setColor: (field: PaletteField, value: string) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type PaletteRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createPaletteRowStore>>
  & PropsLocale<'settings.palette'> & PaletteRowInjected

/** Mode groups in render order. */
const MODES: readonly { mode: PaletteMode; labelKey: PaletteKey }[] = [
  { mode: 'light', labelKey: 'mode.light' },
  { mode: 'dark', labelKey: 'mode.dark' },
]

/**
 * Render the palette row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function PaletteRow({ t, setColor, useStore }: PaletteRowComponentProps) {
  const state = useStore(s => s)
  const [drafts, setDrafts] = useState<Partial<Record<PaletteField, string>>>({})
  const [invalid, setInvalid] = useState<Partial<Record<PaletteField, true>>>({})
  const forget = (field: PaletteField): void => {
    setDrafts((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    setInvalid((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }
  const write = (field: PaletteField, value: string): void => {
    forget(field)
    if (value !== state[field]) setColor(field, value)
  }
  const commit = (field: PaletteField, text: string): void => {
    const result = colorInput(text)
    if (result.kind === 'invalid') {
      setInvalid(current => ({ ...current, [field]: true }))
      return
    }
    write(field, result.kind === 'clear' ? '' : result.value)
  }
  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('title')}</div>
        <div className={css.desc}>{t('description')}</div>
      </div>
      <div className={css.modes}>
        {MODES.map(({ mode, labelKey }) => (
          <div key={mode} className={css.modeGroup}>
            <div className={css.modeLabel}>{t(labelKey)}</div>
            <div className={css.grid}>
              {PALETTE_ENTRIES.map((entry) => {
                const field = paletteField(entry.id, mode)
                const stored = state[field]
                const draft = drafts[field]
                const shown = draft ?? stored
                const shipped = shippedColor(entry, mode)
                const label = `${t(entry.labelKey)} ${t(labelKey)}`
                const rejected = invalid[field] === true
                return (
                  <div key={entry.id} className={css.item}>
                    <div className={css.controls}>
                      <span className={css.itemLabel}>{t(entry.labelKey)}</span>
                      <input
                        type="color"
                        className={css.swatch}
                        value={swatchHex(shown === '' ? shipped : shown, shipped)}
                        aria-label={label}
                        onChange={(event) => { write(field, event.target.value) }}
                      />
                      <input
                        className={css.code}
                        value={shown}
                        placeholder={shipped}
                        aria-label={`${label} ${t('code')}`}
                        aria-invalid={rejected}
                        spellCheck={false}
                        autoComplete="off"
                        inputMode="text"
                        maxLength={24}
                        onChange={(event) => {
                          const text = event.currentTarget.value
                          setDrafts(current => ({ ...current, [field]: text }))
                          setInvalid((current) => {
                            if (current[field] !== true) return current
                            const next = { ...current }
                            delete next[field]
                            return next
                          })
                        }}
                        onBlur={(event) => { commit(field, event.currentTarget.value) }}
                        onKeyDown={(event) => {
                          // oxlint-disable-next-line typescript/no-deprecated -- Some IMEs report composition only through keyCode 229.
                          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            commit(field, event.currentTarget.value)
                          }
                          if (event.key === 'Escape') {
                            // Show the persisted value again; the blur commit then finds it unchanged.
                            setDrafts(current => ({ ...current, [field]: stored }))
                            setInvalid((current) => {
                              if (current[field] !== true) return current
                              const next = { ...current }
                              delete next[field]
                              return next
                            })
                          }
                        }}
                      />
                      {stored === ''
                        ? null
                        : (
                          <button
                            type="button"
                            className={css.reset}
                            aria-label={`${t('reset')} ${label}`}
                            onClick={() => { write(field, '') }}
                          >
                            {t('reset')}
                          </button>
                        )}
                    </div>
                    {rejected && <div className={css.error} role="alert">{t('invalid')}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
