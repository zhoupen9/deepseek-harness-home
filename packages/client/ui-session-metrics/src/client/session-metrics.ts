/**
 * Pure display folds for the session-metrics pill and its hover panel.
 *
 * Every figure rides the durable whole-log projections served by
 * `useProjection` (`tokenUsage` from dsh-token-meter, `sessionStats` from
 * dsh-session-stats) — the same sources the shipped chat StatsLine consumes.
 * These helpers are reimplemented here (they may not be imported from a
 * feature plugin package), mirroring ui-chat's numeric display rules:
 * compact K/M token counts, grouped exact counts, cache-hit rounding that
 * never lies a partial hit up to 100%, and compact durations.
 */
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { SessionMetricsTranslate } from './locales.ts'

/**
 * Sum the three disjoint prompt-side billing buckets.
 * @param usage - the session's token-usage projection value.
 * @returns billed input tokens.
 */
export function billedInputTokens(usage: TokenUsageProjection): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** Whole-number rounding units, positive ties rounded up (ui-chat mirror). */
function roundedPercentUnits(
  cacheReadTokens: number,
  denominator: number,
  decimalPlaces: number,
): number {
  const scale = (decimalPlaces === 0 ? 1 : 10) * 100
  const doubledScale = scale * 2
  const denominatorQuotient = Math.floor(denominator / doubledScale)
  const denominatorRemainder = denominator % doubledScale
  let lower = 0
  let upper = scale
  while (lower < upper) {
    const candidate = Math.floor((lower + upper + 1) / 2)
    const factor = candidate * 2 - 1
    const threshold = factor * denominatorQuotient + Math.ceil(factor * denominatorRemainder / doubledScale)
    if (cacheReadTokens >= threshold) lower = candidate
    else upper = candidate - 1
  }
  return lower
}

/** Render percentage units at the requested decimal precision. */
function displayPercentUnits(units: number, decimalPlaces: number): string {
  if (decimalPlaces === 0) return String(units)
  const whole = Math.floor(units / 10)
  const tenths = units % 10
  return tenths === 0 ? String(whole) : String(whole) + '.' + String(tenths)
}

/**
 * Display-ready cache-hit share of prompt-side input over the whole durable log.
 * @param cacheReadTokens - exact prompt tokens served from cache.
 * @param promptTokens - exact aggregate prompt tokens.
 * @returns integer text when integer rounding stays below 100, otherwise the
 * minimum decimal precision that still rounds below 100; a full hit returns
 * 100, and no billed input returns null.
 */
export function formatCacheHitPercent(cacheReadTokens: number, promptTokens: number): string | null {
  if (promptTokens === 0) return null
  const missedInputTokens = promptTokens - cacheReadTokens
  if (missedInputTokens === 0) return '100'
  const roundedUnits = roundedPercentUnits(cacheReadTokens, promptTokens, 0)
  if (roundedUnits < 100) return displayPercentUnits(roundedUnits, 0)
  let distinguishingPlaces = 1
  let scaledDoubleGap = missedInputTokens * 200
  const denominatorTens = Math.floor(promptTokens / 10)
  while (scaledDoubleGap <= denominatorTens) {
    scaledDoubleGap *= 10
    distinguishingPlaces += 1
  }
  const denominatorOnes = promptTokens % 10
  let roundedLoss = 5
  for (let loss = 1; loss < 5; loss += 1) {
    const factor = loss * 2 + 1
    const threshold = factor * denominatorTens + Math.floor(factor * denominatorOnes / 10)
    if (scaledDoubleGap <= threshold) {
      roundedLoss = loss
      break
    }
  }
  const tail = '9'.repeat(distinguishingPlaces - 1) + String(10 - roundedLoss)
  return '99.' + tail
}

/**
 * Display-ready cache-hit share for a token-usage projection.
 * @param usage - the session's token-usage projection value.
 * @returns the percentage text, or null when there is no billed input.
 */
export function cacheHitPercentText(usage: TokenUsageProjection): string | null {
  return formatCacheHitPercent(usage.cacheReadTokens, billedInputTokens(usage))
}

/**
 * Compact token count: 517 / 12.2K / 517K / 1.2M (ui-chat display rule).
 * @param value - non-negative token count.
 * @param t - namespace-bound translator.
 * @returns locale-owned compact display string.
 */
export function formatCompactTokens(value: number, t: SessionMetricsTranslate): string {
  const scaled = (candidate: number): string =>
    candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10)
  if (value < 1000) return String(value)
  if (value < 1000000) return t('number.thousand', { value: scaled(value / 1000) })
  return t('number.million', { value: scaled(value / 1000000) })
}

/**
 * Exact integer token count with locale-owned digit grouping.
 * @param value - non-negative safe integer token count.
 * @param t - namespace-bound translator.
 * @returns an unrounded display string.
 */
export function formatExactTokens(value: number, t: SessionMetricsTranslate): string {
  const digits = String(value)
  const groups: string[] = []
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end))
  }
  return groups.join(t('number.groupSeparator'))
}

/**
 * Compact duration: 45.2s under a minute, 2m42s from there on (ui-chat rule).
 * @param ms - duration in milliseconds.
 * @param t - namespace-bound translator.
 * @returns display string.
 */
export function formatDuration(ms: number, t: SessionMetricsTranslate): string {
  const s = ms / 1000
  if (s < 60) {
    return t('duration.compactSeconds', { seconds: Math.round(s * 10) / 10 })
  }
  const whole = Math.round(s)
  return t('duration.compactMinutes', {
    minutes: Math.floor(whole / 60),
    seconds: whole % 60,
  })
}

/**
 * Decode-throughput digits: integers from 10 tok/s up, one decimal below.
 * @param tps - tokens per second.
 * @returns display string without the unit.
 */
export function formatThroughput(tps: number): string {
  const clamped = Math.max(0, tps)
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
}

/**
 * Every token figure the compact pill needs, or null while the projection is
 * absent. The pill hides when neither billed input nor output exists yet —
 * the same emptiness rule the shipped StatsLine applies.
 */
export interface SessionTokenFacts {
  readonly billedInputTokens: number
  readonly outputTokens: number
  /** Cache-hit share text without the percent sign; null when no billed input. */
  readonly cacheHitPercent: string | null
}

/**
 * Derive the compact token facts from a token-usage projection value.
 * @param usage - the session's token-usage projection value.
 * @returns the derived facts.
 */
export function tokenFacts(usage: TokenUsageProjection): SessionTokenFacts {
  return {
    billedInputTokens: billedInputTokens(usage),
    outputTokens: usage.outputTokens,
    cacheHitPercent: cacheHitPercentText(usage),
  }
}

/**
 * Whether the session has any billable usage yet (the pill visibility rule).
 * @param facts - derived token facts.
 * @returns true when any billed input or output exists.
 */
export function hasUsage(facts: SessionTokenFacts): boolean {
  return facts.billedInputTokens > 0 || facts.outputTokens > 0
}
