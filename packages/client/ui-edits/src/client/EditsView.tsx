/**
 * Edits view: per-turn file-change records with inline diffs.
 */
import { useCallback, useState } from 'react'
import type { DiffBlockLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { EditsDiff } from './EditsDiff.tsx'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { EditsTurn } from './edits-contract.ts'
import type { EditsTranslate } from './locales.ts'
import { NS } from './locales.ts'
import css from './EditsView.module.css'

/** Body lines the view shows before the middle collapses. */
export const EDITS_DIFF_MAX_LINES = 8

/** Session-bound controls not already supplied by the conversation view slot. */
export interface EditsViewInjected {
  /** Pull one older history page; resolves whether the Edits window changed. */
  loadOlder: () => Promise<boolean>
}

/** Localized diff-card chrome, mirroring the chat row's label split. */
function diffLabels(t: EditsTranslate): DiffBlockLabels {
  return {
    copy: t('diff.copy'),
    copied: t('diff.copied'),
    collapseAria: t('diff.collapseAria'),
    expandAria: hidden => t('diff.expandAria', { hidden }),
    collapse: t('diff.collapse'),
    expand: hidden => t('diff.expand', { hidden }),
    files: count => t('diff.files', { count }),
  }
}

function toolLabel(t: EditsTranslate, tool: 'edit' | 'write' | null): string {
  if (tool === 'edit') return t('kind.edit')
  if (tool === 'write') return t('kind.write')
  return t('kind.unknown')
}

export function EditsView({
  useSession, useEdits, loadOlder, t,
}: ConvViewProps & InjectFace<EditsViewInjected> & PropsLocale<typeof NS>) {
  const snapshot = useEdits(value => value)
  const hasMore = useSession(value => value.hasMore)
  const loadingOlder = useSession(value => value.loadingOlder)
  const labels = diffLabels(t)
  const turns = snapshot.turns
  const [collapsedTurns, setCollapsedTurns] = useState<ReadonlySet<number>>(() => new Set())

  const toggleTurn = useCallback((turn: number) => {
    setCollapsedTurns(prev => {
      const next = new Set(prev)
      if (next.has(turn)) next.delete(turn)
      else next.add(turn)
      return next
    })
  }, [])

  if (turns.length === 0) {
    return <div className={css.empty}>{t('empty.noEdits')}</div>
  }

  return (
    <div className={css.view}>
      {hasMore && (
        <button
          type="button"
          className={css.older}
          disabled={loadingOlder}
          onClick={() => { void loadOlder() }}
        >
          {loadingOlder ? t('older.loading') : t('older.load')}
        </button>
      )}
      {turns.map((turn: EditsTurn) => {
        const collapsed = collapsedTurns.has(turn.turn)
        return (
          <section key={turn.turn} className={css.turn}>
            <header className={css.turnHeader}>
              <button
                type="button"
                className={css.turnToggle}
                aria-expanded={!collapsed}
                aria-label={collapsed
                  ? t('turn.expandAria', { turn: turn.turn })
                  : t('turn.collapseAria', { turn: turn.turn })}
                onClick={() => { toggleTurn(turn.turn) }}
              >
                <span className={css.chevron} data-collapsed={collapsed} aria-hidden="true" />
                <span className={css.turnTitle}>{t('turn.label', { turn: turn.turn })}</span>
                <span className={css.turnCount}>{turn.edits.length}</span>
              </button>
            </header>
            {!collapsed && turn.edits.map(entry => (
              <article key={entry.key} className={css.entry}>
                <header className={css.entryHeader}>
                  <span className={css.badge}>{toolLabel(t, entry.tool)}</span>
                  <span className={css.path} title={entry.diffs[0]?.path}>{entry.diffs[0]?.path}</span>
                  {entry.error !== undefined && <span className={css.error}>{t('entry.error')}</span>}
                </header>
                <EditsDiff
                  diffs={[...entry.diffs]}
                  labels={labels}
                  maxLines={EDITS_DIFF_MAX_LINES}
                  className={css.diff}
                />
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}
