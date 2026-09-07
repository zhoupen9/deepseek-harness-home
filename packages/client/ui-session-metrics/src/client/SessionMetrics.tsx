/**
 * Session-metrics header capsule and its hover details panel.
 *
 * The compact capsule (cache-hit rate · input tokens · output tokens) renders
 * as the leftmost entry of the Session Header's right-aligned utilities row,
 * immediately left of the shipped "Session log" download capsule. Hovering
 * (or keyboard-focusing) the capsule opens a portaled details panel with the
 * full session metrics — turn/step counts, model/tool wall times, TTFT and
 * decode throughput from the `sessionStats` projection, and the exact token
 * buckets plus cache-hit share from the `tokenUsage` projection.
 *
 * The sibling `SessionMetricsSuppressed` occupant replaces the shipped
 * bottom-of-chat stats strip (ui-chat's StatsLine entry, id `stats`) by
 * outranking it in the same `conversation.composer.dock` cell and rendering
 * nothing: the strip's content now lives in this header capsule.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { SessionMetricsTranslate } from './locales.ts'
import {
  billedInputTokens,
  cacheHitPercentText,
  formatCompactTokens,
  formatDuration,
  formatExactTokens,
  formatThroughput,
  hasUsage,
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

/** Anchor geometry of the trigger, in viewport coordinates. */
interface AnchorRect {
  /** Viewport top of the panel (below the trigger). */
  readonly top: number
  /** Viewport distance from the panel's right edge to the viewport's right edge. */
  readonly right: number
}

/** Milliseconds of grace before the panel closes after leaving the trigger. */
const CLOSE_GRACE_MS = 180

/** One label/value row of the details panel. */
function MetricRow({
  label,
  value,
  sub = false,
  rate = false,
}: {
  label: string
  value: string
  sub?: boolean
  rate?: boolean
}) {
  return (
    <div className={css.row}>
      <span className={sub ? css.label + ' ' + css.labelSub : css.label}>{label}</span>
      <span className={rate ? css.value + ' ' + css.valueRate : sub ? css.value + ' ' + css.valueSub : css.value}>
        {value}
      </span>
    </div>
  )
}

/**
 * Render the compact metrics capsule plus, while hovered or focused, its
 * portaled details panel.
 * @param props - runtime seats.
 * @returns the capsule, or null while the session has no billable usage.
 */
export const SessionMetricsTrigger = memo(function SessionMetricsTrigger({
  useProjection,
  t,
}: SessionMetricsProps) {
  const usage = useProjection('tokenUsage')
  const stats = useProjection('sessionStats')
  const facts = useMemo<SessionTokenFactsSafe | null>(() => {
    if (usage === undefined) return null
    const derived = tokenFacts(usage)
    return hasUsage(derived) ? derived : null
  }, [usage])
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeTimerRef = useRef<number | undefined>(undefined)

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

  // Measure the trigger whenever the panel opens, and keep the anchor
  // current while it is open (scrolls on any container, window resizes).
  useEffect(() => {
    if (!open) return
    const measure = (): void => {
      const el = triggerRef.current
      if (el === null) return
      const rect = el.getBoundingClientRect()
      setAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open])

  // Drop any pending close on unmount.
  useEffect(() => clearCloseTimer, [clearCloseTimer])

  if (facts === null) return null

  const compactParts: string[] = []
  if (facts.cacheHitPercent !== null) {
    compactParts.push(t('compact.cache', { percent: facts.cacheHitPercent }))
  }
  compactParts.push(t('compact.input', { input: formatCompactTokens(facts.billedInputTokens, t) }))
  compactParts.push(t('compact.output', { output: formatCompactTokens(facts.outputTokens, t) }))
  const compactLine = compactParts.join(' · ')
  const ariaLabel = t('aria.metrics', { line: compactLine })

  const panel = open && anchor !== null ? (
    createPortal(
      <div
        className={css.panel}
        role="tooltip"
        style={{ top: anchor.top, right: anchor.right }}
        onMouseEnter={keepOpen}
        onMouseLeave={() => setOpen(false)}
      >
        <SessionMetricsDetails usage={usage} stats={stats} t={t} />
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
        aria-expanded={open}
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
        onFocus={keepOpen}
        onBlur={scheduleClose}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        {compactParts.map((part, index) => (
          <span key={index}>
            {index > 0 && <span className={css.sep} aria-hidden="true">·</span>}
            {part}
          </span>
        ))}
      </button>
      {panel}
    </div>
  )
})

/** Token facts narrowed to the visible state. */
interface SessionTokenFactsSafe {
  readonly billedInputTokens: number
  readonly outputTokens: number
  readonly cacheHitPercent: string | null
}

/**
 * Render the full session-metrics details panel body.
 * @param props - projection values and the locale seat.
 * @returns the details panel.
 */
function SessionMetricsDetails({
  usage,
  stats,
  t,
}: {
  usage: TokenUsageProjection | undefined
  stats: SessionStatsProjection | undefined
  t: SessionMetricsTranslate
}) {
  const billed = usage === undefined ? 0 : billedInputTokens(usage)
  const output = usage === undefined ? 0 : usage.outputTokens
  const cachePercent = usage === undefined ? null : cacheHitPercentText(usage)
  const timings = usage !== undefined && stats !== undefined && stats.steps > 0
  const timingRows: ReactNode[] = []
  if (timings) {
    if (stats.llmMs > 0) {
      timingRows.push(<MetricRow key="model" label={t('panel.modelTime')} value={formatDuration(stats.llmMs, t)} />)
    }
    if (stats.toolMs > 0) {
      timingRows.push(<MetricRow key="tool" label={t('panel.toolTime')} value={formatDuration(stats.toolMs, t)} />)
    }
    if (stats.ttftSteps > 0) {
      timingRows.push(<MetricRow key="ttft" label={t('panel.ttft')} value={formatDuration(stats.ttftMs / stats.ttftSteps, t)} />)
    }
    if (stats.decodeMs > 0 && stats.decodeTokens > 0) {
      const tps = stats.decodeTokens / (stats.decodeMs / 1000)
      timingRows.push(
        <MetricRow
          key="decode"
          label={t('panel.decode')}
          value={t('value.tokensPerSecond', { throughput: formatThroughput(tps) })}
        />,
      )
    }
  }
  const tokenRows: ReactNode[] = []
  if (billed > 0) {
    tokenRows.push(<MetricRow key="input" label={t('panel.input')} value={formatExactTokens(billed, t)} />)
    if (usage.cacheReadTokens > 0) {
      tokenRows.push(
        <MetricRow
          key="cacheRead"
          sub
          label={t('panel.cacheRead')}
          value={formatExactTokens(usage.cacheReadTokens, t)}
        />,
      )
    }
    if (usage.cacheWriteTokens > 0) {
      tokenRows.push(
        <MetricRow
          key="cacheWrite"
          sub
          label={t('panel.cacheWrite')}
          value={formatExactTokens(usage.cacheWriteTokens, t)}
        />,
      )
    }
    if (usage.uncachedInputTokens > 0) {
      tokenRows.push(
        <MetricRow
          key="uncached"
          sub
          label={t('panel.uncached')}
          value={formatExactTokens(usage.uncachedInputTokens, t)}
        />,
      )
    }
  }
  if (output > 0) {
    tokenRows.push(<MetricRow key="output" label={t('panel.output')} value={formatExactTokens(output, t)} />)
  }
  if (cachePercent !== null && billed > 0) {
    tokenRows.push(
      <MetricRow key="cacheRate" rate label={t('panel.cacheRate')} value={cachePercent + '%'} />,
    )
  }
  return (
    <div>
      <div className={css.title}>{t('panel.title')}</div>
      {timings && <div className={css.caption}>{t('panel.caption', { turns: stats.turns, steps: stats.steps })}</div>}
      {timingRows}
      {timingRows.length > 0 && tokenRows.length > 0 && <div className={css.divider} />}
      {tokenRows}
    </div>
  )
}

/**
 * Replacement occupant of the shipped bottom-of-chat stats strip: this entry
 * reuses the `stats` cell of `conversation.composer.dock` with a lower
 * order, so the ui-chat StatsLine row is shadowed and the strip disappears —
 * its metrics moved into the Session Header capsule above.
 */
export const SessionMetricsSuppressed = memo(function SessionMetricsSuppressed(): null {
  return null
})