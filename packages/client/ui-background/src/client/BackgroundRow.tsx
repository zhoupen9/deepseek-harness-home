/**
 * Background preference row registered into the General section item slot:
 * title and description with the master switch, then the image field and one
 * opacity slider per palette mode. The displayed values follow the persisted
 * setting, never the click echo; the image field commits on blur or Enter and
 * rejects an unsupported source with an inline message.
 */
import { useEffect, useId, useState } from 'react'
import { Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createBackgroundRowStore } from './store.ts'
import type { BackgroundKey } from './locales.ts'
import { isBackgroundImage, opacityPercent, type PaletteMode } from './settings.ts'
import css from './BackgroundRow.module.css'

/** Injected business face: the writes owned by the settings row. */
export interface BackgroundRowInjected {
  /** Turn the painted layer on or off. */
  setEnabled: (enabled: boolean) => void
  /** Persist a trimmed image source. */
  setImage: (image: string) => void
  /** Persist one palette's layer opacity from 0 through 1. */
  setOpacity: (mode: PaletteMode, opacity: number) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type BackgroundRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createBackgroundRowStore>>
  & PropsLocale<'settings.background'> & BackgroundRowInjected

/** One palette's slider descriptor. */
interface OpacitySlider {
  /** Palette the value applies to. */
  mode: PaletteMode
  /** Dictionary key naming the palette. */
  labelKey: BackgroundKey
  /** Element id shared by the label and the slider. */
  id: string
  /** Persisted opacity for this palette. */
  stored: number
}

/**
 * Render the background row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function BackgroundRow({ t, setEnabled, setImage, setOpacity, useStore }: BackgroundRowComponentProps) {
  const enabled = useStore(s => s.enabled)
  const image = useStore(s => s.image)
  const opacityLight = useStore(s => s.opacityLight)
  const opacityDark = useStore(s => s.opacityDark)
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const [invalid, setInvalid] = useState(false)
  const [opacityDrafts, setOpacityDrafts] = useState<Partial<Record<PaletteMode, number>>>({})
  const errorId = useId()
  const lightId = useId()
  const darkId = useId()
  useEffect(() => {
    setDraft(undefined)
    setInvalid(false)
  }, [image])
  useEffect(() => {
    setOpacityDrafts({})
  }, [opacityLight, opacityDark])
  const shownImage = draft ?? image
  const shownInvalid = invalid || (draft === undefined && !isBackgroundImage(image))
  const commitImage = (value: string): void => {
    const next = value.trim()
    setDraft(next)
    if (!isBackgroundImage(next)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (next === image) {
      setDraft(undefined)
      return
    }
    setImage(next)
  }
  const commitOpacity = (slider: OpacitySlider): void => {
    const next = opacityDrafts[slider.mode]
    if (next === undefined) return
    if (next !== slider.stored) setOpacity(slider.mode, next)
    setOpacityDrafts(current => ({ ...current, [slider.mode]: undefined }))
  }
  const sliders: readonly OpacitySlider[] = [
    { mode: 'light', labelKey: 'opacity.light', id: lightId, stored: opacityLight },
    { mode: 'dark', labelKey: 'opacity.dark', id: darkId, stored: opacityDark },
  ]
  return (
    <div className={css.row}>
      <div className={css.head}>
        <div className={css.rowText}>
          <div className={css.title}>{t('title')}</div>
          <div className={css.desc}>{t('description')}</div>
        </div>
        <Switch className={css.master} checked={enabled} onChange={setEnabled} label={t('enabled')} />
      </div>
      <div className={css.fields}>
        <Input
          className={css.imageField}
          value={shownImage}
          placeholder={t('imagePlaceholder')}
          aria-label={t('image')}
          aria-invalid={shownInvalid}
          aria-describedby={shownInvalid ? errorId : undefined}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.currentTarget.value)
            setInvalid(false)
          }}
          onBlur={(event) => { commitImage(event.currentTarget.value) }}
          onKeyDown={(event) => {
            // oxlint-disable-next-line typescript/no-deprecated -- Some IMEs report composition only through keyCode 229.
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        {shownInvalid && <div id={errorId} className={css.error} role="alert">{t('invalid')}</div>}
        <div className={css.opacityFields}>
          {sliders.map((slider) => {
            const percent = opacityPercent(opacityDrafts[slider.mode] ?? slider.stored)
            return (
              <div key={slider.mode} className={css.opacityRow}>
                <label className={css.opacityLabel} htmlFor={slider.id}>{t(slider.labelKey)}</label>
                <input
                  id={slider.id}
                  className={css.slider}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={percent}
                  aria-valuetext={`${percent}%`}
                  onChange={(event) => {
                    setOpacityDrafts(current => ({
                      ...current,
                      [slider.mode]: Math.round(Number(event.currentTarget.value)) / 100,
                    }))
                  }}
                  onPointerUp={() => { commitOpacity(slider) }}
                  onKeyUp={() => { commitOpacity(slider) }}
                  onBlur={() => { commitOpacity(slider) }}
                />
                <span className={css.percent} aria-hidden="true">{percent}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
