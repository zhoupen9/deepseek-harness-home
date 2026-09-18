/**
 * Session-metrics header capsule and its merged details panel.
 *
 * The compact capsule (icon-prefixed input tokens · output tokens · context
 * occupancy, using the shipped metric icons) renders as the leftmost entry of
 * the Session Header's right-aligned utilities row (order -11, left of the
 * shipped "Open In…" split button and the "Session log" download capsule).
 * Hovering (or keyboard-focusing) it opens one portaled panel that merges the
 * shipped stat dialogs — ui-chat's session-statistics and token-usage dialogs
 * plus ui-conversation's context-usage panel — so a session's figures are read
 * in one place instead of three separate popups.
 *
 * The panel wears the shipped stat-dialog skin and row set exactly, and takes
 * its placement from the same `ui-primitives` seat the shipped dialogs use
 * (`useAnchoredPosition`). It mirrors rather than imports them: a feature
 * plugin may not import another feature plugin's values, so the labels,
 * formatting, and surface are reimplemented here (numeric rules live in
 * session-metrics.ts, copy in locales.ts).
 *
 * The sibling `SessionMetricsSuppressed` occupant replaces the shipped
 * bottom-of-chat stats pills (ui-chat's StatsPills entry, id `stats`) by
 * registering the same cell id at a lower priority (the slot ledger keeps
 * same-id entries at distinct priorities, lowest renders) and rendering
 * nothing: those pills and the dialogs they opened now live in this header
 * capsule. The shipped composer context meter owns no slot cell to shadow, so
 * the plugin's apply hides it with an injected stylesheet (see index.ts).
 */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCompactOutline16,
  IconDatabaseOutline16,
  IconGaugeOutline16,
  useAnchoredPosition,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ContextBreakdownProjection, ContextPressureProjection, TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'
import type { SessionMetricsTranslate } from './locales.ts'
import {
  type SessionTokenFacts,
  CONTEXT_RING_RADIUS,
  cacheHitPercentText,
  contextOccupancy,
  contextRingDash,
  formatCompactTokens,
  formatDuration,
  formatExactTokens,
  formatThroughput,
  hasUsage,
  sessionTotalTokens,
  tokenFacts,
} from './session-metrics.ts'
import css from './SessionMetrics.module.css'

/** Props: the projection read seat plus the namespace-bound locale seat. */
export interface SessionMetricsProps {
  /** Key-addressed session projection reader (session-standard seat). */
  useProjection: UseProjection
  /** The owning header row's locale seat. */
  t: SessionMetricsTranslate
}

/** Milliseconds of grace before the panel closes after leaving the trigger. */
const CLOSE_GRACE_MS = 180

/** Distance between the trigger's bottom edge and the panel. */
const PANEL_GAP = 6

/** Viewport margin the placement clamp keeps. */
const PANEL_MARGIN = 12

/**
 * Unplaced panel style: hidden but laid out, so the placement hook measures
 * real dimensions on its first pass (the shipped dialogs' own seat).
 */
const MEASURE_STYLE: CSSProperties = { visibility: 'hidden', left: 0, top: 0 }

/**
 * Live context ring: the shipped meter's 14px ring, its arc drawn from the
 * occupancy reading. The capsule carries the percentage as the arc itself
 * rather than as text; the trigger's spoken label and the panel still state
 * the number.
 * @param props - the occupancy percentage to draw.
 * @returns the ring, hidden from assistive technology.
 */
function ContextRing({ percent }: { percent: number }) {
  return (
    <svg className={css.icon} viewBox="0 0 14 14" width="14" height="14" aria-hidden>
      <circle className={css.ringTrack} cx="7" cy="7" r={CONTEXT_RING_RADIUS} />
      <circle
        className={css.ringFill}
        cx="7"
        cy="7"
        r={CONTEXT_RING_RADIUS}
        strokeDasharray={contextRingDash(percent)}
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

/**
 * Render the compact metrics capsule plus, while hovered or focused, its
 * portaled merged-details panel.
 * @param props - runtime seats.
 * @returns the capsule, or null while the session has neither a step, nor
 * billable usage, nor a context sample with a known capacity.
 */
export const SessionMetricsTrigger = memo(function SessionMetricsTrigger({
  useProjection,
  t,
}: SessionMetricsProps) {
  const usage = useProjection('tokenUsage')
  const stats = useProjection('sessionStats')
  const pressure = useProjection('contextPressure')
  const breakdown = useProjection('contextBreakdown')
  const facts = useMemo<SessionTokenFacts | null>(() => {
    if (usage === undefined) return null
    const derived = tokenFacts(usage)
    return hasUsage(derived) ? derived : null
  }, [usage])
  // The shipped surfaces render on these same conditions — the meter whenever
  // a capacity and a sample are known, the stats pills whenever a step exists —
  // and this plugin hides both, so the capsule appears on their union.
  const occupancy = useMemo(() => contextOccupancy(pressure), [pressure])
  const stepped = stats !== undefined && stats.steps > 0
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | undefined>(undefined)
  const pos = useAnchoredPosition({
    open,
    anchorRef: triggerRef,
    panelRef,
    side: 'bottom',
    gap: PANEL_GAP,
    margin: PANEL_MARGIN,
  })

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
    }
  }, [])
  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = undefined
      setOpen(false)
    }, CLOSE_GRACE_MS)
  }, [clearCloseTimer])
  const keepOpen = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  // Drop any pending close on unmount.
  useEffect(() => clearCloseTimer, [clearCloseTimer])

  if (facts === null && occupancy === null && !stepped) return null

  const inputText = facts === null ? undefined : formatCompactTokens(facts.billedInputTokens, t)
  const outputText = facts === null ? undefined : formatCompactTokens(facts.outputTokens, t)
  const contextText = occupancy === null ? undefined : occupancy.percent + '%'

  // Visible segments: one icon-prefixed group per metric family, separated by
  // middots. Both token figures share the shipped token-usage (database) icon
  // and keep the fixed input-then-output order; the context reading is the
  // ring's arc alone, so it needs no value text.
  const segments: ReactNode[] = []
  const pushSegment = (key: string, icon: ReactNode, values: readonly string[]): void => {
    if (segments.length > 0) {
      segments.push(<span className={css.sep} aria-hidden="true" key={'sep-' + key}>·</span>)
    }
    const parts: ReactNode[] = []
    values.forEach((value, index) => {
      if (index > 0) {
        parts.push(<span className={css.sep} aria-hidden="true" key={'inner-' + index}>·</span>)
      }
      parts.push(<span className={css.value} key={'value-' + index}>{value}</span>)
    })
    segments.push(
      <span className={css.segment} key={key}>
        {icon}
        {parts}
      </span>,
    )
  }
  const tokenValues: string[] = []
  if (inputText !== undefined) tokenValues.push(inputText)
  if (outputText !== undefined) tokenValues.push(outputText)
  if (tokenValues.length > 0) {
    pushSegment('tokens', <IconDatabaseOutline16 className={css.icon} />, tokenValues)
  }
  if (occupancy !== null) {
    pushSegment('context', <ContextRing percent={occupancy.percent} />, [])
  }

  // Spoken summary keeps the metric words (the icons alone cannot).
  const ariaParts: string[] = []
  if (inputText !== undefined) {
    ariaParts.push(t('aria.input', { input: inputText }))
  }
  if (outputText !== undefined) {
    ariaParts.push(t('aria.output', { output: outputText }))
  }
  if (occupancy !== null && contextText !== undefined) {
    ariaParts.push(t('aria.context', { percent: contextText }))
  }
  const ariaLabel = t('aria.metrics', { items: ariaParts.join(' · ') })

  const panel = open ? (
    createPortal(
      <div
        ref={panelRef}
        className={css.panel}
        role="dialog"
        aria-label={t('aria.panel')}
        style={pos ?? MEASURE_STYLE}
        onMouseEnter={keepOpen}
        onMouseLeave={() => setOpen(false)}
      >
        <SessionMetricsDetails
          usage={usage}
          stats={stats}
          pressure={pressure}
          breakdown={breakdown}
          t={t}
        />
      </div>,
      document.body,
    )
  ) : null

  return (
    <div className={css.root}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
        onFocus={keepOpen}
        onBlur={scheduleClose}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        {segments}
      </button>
      {panel}
    </div>
  )
})

/** One titled section of the merged panel. */
function Section({ icon, label, value, children }: {
  icon: ReactNode
  label: string
  value?: string
  children?: ReactNode
}) {
  return (
    <section className={css.section}>
      <div className={css.title}>
        <span className={css.titleLabel}>{icon}{label}</span>
        {value !== undefined && <span className={css.titleValue}>{value}</span>}
      </div>
      <div className={css.titleRule} aria-hidden />
      {children}
    </section>
  )
}

/**
 * Render the merged panel body: the shipped session-statistics, token-usage,
 * and context-usage surfaces, in that order, each under its own heading.
 * @param props - projection values and the locale seat.
 * @returns the panel sections.
 */
function SessionMetricsDetails({
  usage,
  stats,
  pressure,
  breakdown,
  t,
}: {
  usage: TokenUsageProjection | undefined
  stats: SessionStatsProjection | undefined
  pressure: ContextPressureProjection | undefined
  breakdown: ContextBreakdownProjection | undefined
  t: SessionMetricsTranslate
}) {
  // Session statistics: the shipped gauge dialog's rows, under the same
  // conditions (a step happened; each figure is positive).
  const counts = stats !== undefined && stats.steps > 0
    ? t('panel.counts', { turns: stats.turns, steps: stats.steps })
    : undefined
  const timingRows: ReactNode[] = []
  if (stats !== undefined && stats.steps > 0) {
    if (stats.llmMs > 0) {
      timingRows.push(
        <Fragment key="llm"><dt>{t('panel.llmTime')}</dt><dd>{formatDuration(stats.llmMs, t)}</dd></Fragment>,
      )
    }
    if (stats.toolMs > 0) {
      timingRows.push(
        <Fragment key="tool"><dt>{t('panel.toolTime')}</dt><dd>{formatDuration(stats.toolMs, t)}</dd></Fragment>,
      )
    }
    if (stats.ttftSteps > 0) {
      timingRows.push(
        <Fragment key="ttft"><dt>{t('panel.ttft')}</dt><dd>{formatDuration(stats.ttftMs / stats.ttftSteps, t)}</dd></Fragment>,
      )
    }
    if (stats.decodeMs > 0) {
      timingRows.push(
        <Fragment key="speed">
          <dt>{t('panel.speed')}</dt>
          <dd>{t('value.tokensPerSecond', { throughput: formatThroughput(stats.decodeTokens / (stats.decodeMs / 1000)) })}</dd>
        </Fragment>,
      )
    }
  }
  // Token usage: the shipped database dialog's rows — uncached input, cached
  // input, cache write when any, output — headlined by the billed total.
  const total = usage === undefined ? 0 : sessionTotalTokens(usage)
  const cacheHit = usage === undefined ? null : cacheHitPercentText(usage)
  const usageRows: ReactNode[] = []
  if (usage !== undefined && total > 0) {
    if (cacheHit !== null) {
      usageRows.push(<Fragment key="cache"><dt>{t('panel.cacheHit')}</dt><dd>{cacheHit + '%'}</dd></Fragment>)
    }
    usageRows.push(
      <Fragment key="input">
        <dt>{t('panel.input')}</dt>
        <dd>{t('panel.count', { count: formatExactTokens(usage.uncachedInputTokens, t) })}</dd>
      </Fragment>,
      <Fragment key="cacheRead">
        <dt>{t('panel.cacheRead')}</dt>
        <dd>{t('panel.count', { count: formatExactTokens(usage.cacheReadTokens, t) })}</dd>
      </Fragment>,
    )
    if (usage.cacheWriteTokens !== 0) {
      usageRows.push(
        <Fragment key="cacheWrite">
          <dt>{t('panel.cacheWrite')}</dt>
          <dd>{t('panel.count', { count: formatExactTokens(usage.cacheWriteTokens, t) })}</dd>
        </Fragment>,
      )
    }
    usageRows.push(
      <Fragment key="output">
        <dt>{t('panel.output')}</dt>
        <dd>{t('panel.count', { count: formatExactTokens(usage.outputTokens, t) })}</dd>
      </Fragment>,
    )
  }
  // Context usage: the shipped meter panel's headline, composition bar, and
  // heuristic legend rows (they never sum to the provider-anchored figure).
  const occupancy = contextOccupancy(pressure)
  const breakdownTotal = breakdown === undefined
    ? 0
    : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens
  const contextRows: ReactNode[] = []
  let contextBar: ReactNode = null
  if (occupancy !== null) {
    const parts: { key: string; color?: string; width: number }[] = breakdown === undefined || breakdownTotal === 0
      ? [{ key: 'total', width: occupancy.percent }]
      : [
        { key: 'system', color: css.colorSystem, width: occupancy.percent * breakdown.systemTokens / breakdownTotal },
        { key: 'tools', color: css.colorTools, width: occupancy.percent * breakdown.toolsTokens / breakdownTotal },
        { key: 'messages', color: css.colorMessages, width: occupancy.percent * breakdown.messageTokens / breakdownTotal },
      ]
    contextBar = (
      <div className={css.bar}>
        {parts.filter(part => part.width > 0).map(part => (
          <div
            key={part.key}
            className={part.color === undefined ? css.barSegment : css.barSegment + ' ' + part.color}
            style={{ width: part.width + '%' }}
          />
        ))}
      </div>
    )
    contextRows.push(
      <Fragment key="used">
        <dt>{t('panel.contextUsed')}</dt>
        <dd>{t('panel.contextFigures', {
          used: formatCompactTokens(occupancy.usedTokens, t),
          window: formatCompactTokens(occupancy.contextWindow, t),
        })}</dd>
      </Fragment>,
    )
    if (breakdown !== undefined && breakdownTotal > 0) {
      const legend = [
        { key: 'system', color: css.colorSystem, label: t('panel.contextSystem'), tokens: breakdown.systemTokens },
        { key: 'tools', color: css.colorTools, label: t('panel.contextTools'), tokens: breakdown.toolsTokens },
        { key: 'messages', color: css.colorMessages, label: t('panel.contextMessages'), tokens: breakdown.messageTokens },
      ]
      for (const row of legend) {
        contextRows.push(
          <Fragment key={row.key}>
            <dt><span className={css.swatch + ' ' + row.color} aria-hidden />{row.label}</dt>
            <dd>{'~' + formatCompactTokens(row.tokens, t)}</dd>
          </Fragment>,
        )
      }
    }
  }
  return (
    <>
      {counts !== undefined && (
        <Section icon={<IconGaugeOutline16 />} label={t('panel.title')} value={counts}>
          {timingRows.length > 0 && <dl className={css.details}>{timingRows}</dl>}
        </Section>
      )}
      {usageRows.length > 0 && (
        <Section
          icon={<IconDatabaseOutline16 />}
          label={t('panel.usageTitle')}
          value={t('panel.count', { count: formatExactTokens(total, t) })}
        >
          <dl className={css.details}>{usageRows}</dl>
        </Section>
      )}
      {occupancy !== null && (
        <Section
          icon={<IconCompactOutline16 />}
          label={t('panel.context')}
          value={occupancy.percent + '%'}
        >
          {contextBar}
          <dl className={css.details}>{contextRows}</dl>
        </Section>
      )}
    </>
  )
}

/**
 * Replacement occupant of the shipped bottom-of-chat stats pills: this entry
 * reuses the `stats` cell of `conversation.composer.dock` at a lower
 * priority, so ui-chat's StatsPills (priority 0) are shadowed and the strip
 * disappears — those figures moved into the Session Header capsule above.
 */
export const SessionMetricsSuppressed = memo(function SessionMetricsSuppressed(): null {
  return null
})
