/**
 * Background preference row registered into the General section item slot:
 * title and description with the master switch, then the image field and the
 * opacity slider. The displayed values follow the persisted setting, never the
 * click echo; the image field commits on blur or Enter and rejects an
 * unsupported source with an inline message.
 */
import { useEffect, useId, useState } from 'react'
import { Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createBackgroundRowStore } from './store.ts'
import { isBackgroundImage, opacityPercent } from './settings.ts'
import css from './BackgroundRow.module.css'

/** Injected business face: the three writes owned by the settings row. */
export interface BackgroundRowInjected {
  /** Turn the painted layer on or off. */
  setEnabled: (enabled: boolean) => void
  /** Persist a trimmed image source. */
  setImage: (image: string) => void
  /** Persist an opacity from 0 through 1. */
  setOpacity: (opacity: number) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type BackgroundRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createBackgroundRowStore>>
  & PropsLocale<'settings.background'> & BackgroundRowInjected

/**
 * Render the background row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function BackgroundRow({ t, setEnabled, setImage, setOpacity, useStore }: BackgroundRowComponentProps) {
  const enabled = useStore(s => s.enabled)
  const image = useStore(s => s.image)
  const opacity = useStore(s => s.opacity)
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const [invalid, setInvalid] = useState(false)
  const [opacityDraft, setOpacityDraft] = useState<number | undefined>(undefined)
  const errorId = useId()
  const opacityId = useId()
  useEffect(() => {
    setDraft(undefined)
    setInvalid(false)
  }, [image])
  useEffect(() => {
    setOpacityDraft(undefined)
  }, [opacity])
  const shownImage = draft ?? image
  const shownInvalid = invalid || (draft === undefined && !isBackgroundImage(image))
  const percent = opacityPercent(opacityDraft ?? opacity)
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
  const commitOpacity = (): void => {
    if (opacityDraft === undefined) return
    if (opacityDraft !== opacity) setOpacity(opacityDraft)
    setOpacityDraft(undefined)
  }
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
        <div className={css.opacityRow}>
          <label className={css.opacityLabel} htmlFor={opacityId}>{t('opacity')}</label>
          <input
            id={opacityId}
            className={css.slider}
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent}
            aria-valuetext={`${percent}%`}
            onChange={(event) => { setOpacityDraft(Math.round(Number(event.currentTarget.value)) / 100) }}
            onPointerUp={commitOpacity}
            onKeyUp={commitOpacity}
            onBlur={commitOpacity}
          />
          <span className={css.percent} aria-hidden="true">{percent}%</span>
        </div>
      </div>
    </div>
  )
}
