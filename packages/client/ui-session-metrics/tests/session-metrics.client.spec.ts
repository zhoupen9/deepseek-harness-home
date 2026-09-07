/**
 * Behavior spec for the Session-metrics pure logic: billing-bucket sums,
 * cache-hit share rounding (never a partial hit shown as 100%), compact K/M
 * and grouped-exact token formatting, compact durations, decode throughput
 * digits, the pill visibility rule, and zh/en dictionary completeness.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime); typechecks fully under the harness tsconfig once the
 * package is dropped into packages/client/ui-session-metrics.
 */
import { describe, expect, it } from 'vitest'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import { en, zh, type SessionMetricsKey } from '../src/client/locales.ts'
import {
  billedInputTokens,
  cacheHitPercentText,
  formatCacheHitPercent,
  formatCompactTokens,
  formatDuration,
  formatExactTokens,
  formatThroughput,
  hasUsage,
  tokenFacts,
} from '../src/client/session-metrics.ts'

/** Tiny namespace translator with {placeholder} interpolation. */
function translator(dictionary: Record<SessionMetricsKey, string>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const template = dictionary[key as SessionMetricsKey]
    if (template === undefined) throw new Error('missing dictionary key: ' + key)
    let out = template
    for (const [name, value] of Object.entries(params ?? {})) {
      out = out.split('{' + name + '}').join(String(value))
    }
    return out
  }
}

const zhT = translator(zh)
const enT = translator(en)

function usage(overrides: Partial<TokenUsageProjection> = {}): TokenUsageProjection {
  return { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, ...overrides }
}

describe('billedInputTokens', () => {
  it('sums the three disjoint prompt-side buckets', () => {
    expect(billedInputTokens(usage({ uncachedInputTokens: 100, cacheReadTokens: 40, cacheWriteTokens: 12 }))).toBe(152)
  })

  it('reads zero from an empty projection', () => {
    expect(billedInputTokens(usage())).toBe(0)
  })
})

describe('formatCacheHitPercent', () => {
  it('returns null without billed input', () => {
    expect(formatCacheHitPercent(0, 0)).toBeNull()
  })

  it('reports a full cache hit as 100', () => {
    expect(formatCacheHitPercent(120, 120)).toBe('100')
  })

  it('reports an integer-roundable partial hit without decimals', () => {
    expect(formatCacheHitPercent(62, 100)).toBe('62')
    expect(formatCacheHitPercent(313, 1000)).toBe('31')
  })

  it('never rounds a partial hit up to 100', () => {
    const text = formatCacheHitPercent(999999, 1000000)
    expect(text).not.toBeNull()
    expect(text!.startsWith('99.')).toBe(true)
    expect(text!.length).toBeGreaterThan(4)
  })
})

describe('cacheHitPercentText / tokenFacts', () => {
  it('derives the cache share from the billed-input denominator', () => {
    const value = usage({ uncachedInputTokens: 30, cacheReadTokens: 60, cacheWriteTokens: 10 })
    expect(cacheHitPercentText(value)).toBe('60')
    expect(tokenFacts(value)).toEqual({
      billedInputTokens: 100,
      outputTokens: 0,
      cacheHitPercent: '60',
    })
  })

  it('keeps the pill hidden until any billable usage exists', () => {
    expect(hasUsage(tokenFacts(usage()))).toBe(false)
    expect(hasUsage(tokenFacts(usage({ cacheWriteTokens: 5 })))).toBe(true)
    expect(hasUsage(tokenFacts(usage({ outputTokens: 1 })))).toBe(true)
  })
})

describe('formatCompactTokens', () => {
  it('renders raw digits under one thousand', () => {
    expect(formatCompactTokens(517, enT)).toBe('517')
    expect(formatCompactTokens(0, enT)).toBe('0')
  })

  it('scales thousands with one decimal until 100', () => {
    expect(formatCompactTokens(1000, enT)).toBe('1K')
    expect(formatCompactTokens(12200, enT)).toBe('12.2K')
    expect(formatCompactTokens(517000, enT)).toBe('517K')
  })

  it('scales millions', () => {
    expect(formatCompactTokens(1200000, enT)).toBe('1.2M')
  })

  it('keeps the K unit in the Chinese dictionary too', () => {
    expect(formatCompactTokens(12200, zhT)).toBe('12.2K')
  })
})

describe('formatExactTokens', () => {
  it('groups digits with the locale separator', () => {
    expect(formatExactTokens(0, enT)).toBe('0')
    expect(formatExactTokens(517, enT)).toBe('517')
    expect(formatExactTokens(1234567, enT)).toBe('1,234,567')
  })
})

describe('formatDuration', () => {
  it('keeps one decimal under a minute', () => {
    expect(formatDuration(45200, enT)).toBe('45.2s')
    expect(formatDuration(45200, zhT)).toBe('45.2秒')
  })

  it('switches to minutes from a minute up', () => {
    expect(formatDuration(60000, enT)).toBe('1m0s')
    expect(formatDuration(162000, zhT)).toBe('2分42秒')
  })
})

describe('formatThroughput', () => {
  it('drops the decimal from 10 tok/s up', () => {
    expect(formatThroughput(52.4)).toBe('52')
    expect(formatThroughput(9.44)).toBe('9.4')
    expect(formatThroughput(-3)).toBe('0')
  })
})

describe('locales', () => {
  it('mirrors every Chinese key in English', () => {
    for (const key of Object.keys(zh) as SessionMetricsKey[]) {
      expect(en).toHaveProperty(key)
    }
    expect(Object.keys(en)).toHaveLength(Object.keys(zh).length)
  })

  it('formats the compact capsule line for both languages', () => {
    expect(zhT('compact.cache', { percent: '62' })).toBe('缓存命中 62%')
    expect(enT('compact.input', { input: '12.2K' })).toBe('Input 12.2K')
    expect(enT('compact.output', { output: '517' })).toBe('Output 517')
  })
})
