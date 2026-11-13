/**
 * Composer-pill preference row registered into the General section item slot:
 * title and description with the master switch. The displayed value follows
 * the persisted setting, never the click echo.
 */
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createComposerPillsRowStore } from './store.ts'
import css from './ComposerPillsRow.module.css'

/** Injected business face: the one write owned by the settings row. */
export interface ComposerPillsRowInjected {
  /** Hide or restore the builtin composer pills. */
  setHidden: (hidden: boolean) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type ComposerPillsRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createComposerPillsRowStore>>
  & PropsLocale<'settings.composer-pills'> & ComposerPillsRowInjected

/**
 * Render the composer-pill row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function ComposerPillsRow({ t, setHidden, useStore }: ComposerPillsRowComponentProps) {
  const hidden = useStore(s => s.hideBuiltinPills)
  return (
    <div className={css.row}>
      <div className={css.head}>
        <div className={css.rowText}>
          <div className={css.title}>{t('title')}</div>
          <div className={css.desc}>{t('description')}</div>
        </div>
        <Switch className={css.switch} checked={hidden} onChange={setHidden} label={t('hide')} />
      </div>
    </div>
  )
}
