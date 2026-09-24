/**
 * Upstream-drift guard for everything this plugin mirrors instead of importing.
 *
 * A profile-local plugin may not import another feature plugin's values or
 * stylesheet, and the module table it can require is only the baseline
 * (react, cordis, client/store, ui-slots, ui-primitives, ui-dockkit). So the
 * shipped stat-dialog skin, the token/duration formatting rules, the shipped
 * copy, the baseline exports it reaches for, and the slot and setting
 * contracts it depends on are all mirrored here by hand — and every one of
 * them can go stale silently. Each mirror did, at least once: the 0.1.7 merge
 * renamed the icon exports the capsule renders, added the compact
 * performance-usage level, and added a backdrop filter to the panel skin.
 *
 * This spec compares each mirror against the harness that the local `dsh`
 * actually runs, and fails with the specific drift, so re-synchronizing stays
 * a deliberate step. It reads upstream sources and the built bundle; it never
 * mutates anything.
 *
 * The harness root resolves from $DSH_HARNESS_DIR first, otherwise from the
 * `dsh` entry on PATH (the launcher lives at <root>/apps/<app>/node_modules/.bin).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { en, zh } from '../src/client/locales.ts'
import {
  CONTEXT_RING_RADIUS,
  contextOccupancy,
  formatCacheHitPercent,
  formatCompactTokens,
  formatDuration,
  formatThroughput,
  tokenFacts,
} from '../src/client/session-metrics.ts'

/** Walk up from a directory until the harness package tree is found. */
function harnessFrom(start: string): string | undefined {
  let current = resolve(start)
  for (;;) {
    if (existsSync(join(current, 'packages/client/ui-primitives/src/index.ts'))) return current
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/** Resolve the harness checkout the local launcher runs from. */
function harnessRoot(): string {
  const configured = process.env.DSH_HARNESS_DIR
  if (configured !== undefined && configured !== '') {
    const found = harnessFrom(configured)
    if (found === undefined) throw new Error('DSH_HARNESS_DIR is not a harness checkout: ' + configured)
    return found
  }
  for (const dir of (process.env.PATH ?? '').split(':')) {
    if (dir === '' || !existsSync(join(dir, 'dsh'))) continue
    const found = harnessFrom(dir)
    if (found !== undefined) return found
  }
  throw new Error('no harness checkout found; set DSH_HARNESS_DIR to the deepseek-harness root')
}

const HARNESS = harnessRoot()
const read = (relative: string): string => readFileSync(join(HARNESS, relative), 'utf8')
const has = (relative: string): boolean => existsSync(join(HARNESS, relative))
/** Read one of this plugin's own files (the built bundle is the runtime truth). */
const readOwn = (relative: string): string => readFileSync(new URL('../' + relative, import.meta.url), 'utf8')

const STAT_DIALOG_CSS = 'packages/client/ui-chat/src/client/chat/stat-dialog.module.css'
const CONTEXT_METER_CSS = 'packages/client/ui-conversation/src/client/skeleton/ContextMeter.module.css'
const STATS_PILLS = 'packages/client/ui-chat/src/client/chat/StatsPills.tsx'
const CHAT_SETTINGS = 'packages/client/ui-chat/src/chat-settings.ts'
const CHAT_APPLY = 'packages/client/ui-chat/src/client/apply.ts'
const CONVERSATION_SLOTS = 'packages/client/ui-conversation/src/client/contract/slots.ts'
const BUNDLE = 'lib/client.js'

/** Load one upstream TypeScript module through its file URL. */
async function upstream(relative: string): Promise<Record<string, unknown>> {
  return await import(pathToFileURL(join(HARNESS, relative)).href) as Record<string, unknown>
}

/** Namespace translator over one dictionary, with {placeholder} interpolation. */
function translator(dictionary: Record<string, string>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const template = dictionary[key]
    if (template === undefined) throw new Error('missing dictionary key: ' + key)
    let out = template
    for (const [name, value] of Object.entries(params ?? {})) {
      out = out.split('{' + name + '}').join(String(value))
    }
    return out
  }
}

/** Placeholder names are the caller's; wording is what must match upstream. */
const wording = (text: string): string => text.replace(/\{[A-Za-z0-9_]+\}/g, '{}')

const t = translator(zh as unknown as Record<string, string>) as never
const enT = translator(en as unknown as Record<string, string>) as never

describe('baseline module exports the plugin bundle reaches for', () => {
  const PACKAGE_SOURCE: Record<string, string> = {
    '@deepseek-ai/dsh-client-ui-primitives': 'packages/client/ui-primitives/src/index.ts',
    '@deepseek-ai/dsh-client-store': 'packages/client/store/src/index.ts',
    '@deepseek-ai/dsh-client-ui-slots': 'packages/client/ui-slots/src/index.ts',
  }

  /** Exported names of a package entry, following \`export *\` re-exports. */
  function exportedNames(entry: string, seen = new Set<string>()): Set<string> {
    const names = new Set<string>()
    if (!has(entry) || seen.has(entry)) return names
    seen.add(entry)
    const source = read(entry)
    for (const match of source.matchAll(/export\s+(?:const|function|class|let|var|interface|type|enum)\s+([A-Za-z0-9_$]+)/g)) {
      names.add(match[1] as string)
    }
    for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const member of (match[1] ?? '').split(',')) {
        const name = member.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim()
        if (name !== undefined && name !== '') names.add(name)
      }
    }
    for (const match of source.matchAll(/export\s*\*\s*from\s*'([^']+)'/g)) {
      const target = match[1]
      if (target === undefined || !target.startsWith('.')) continue
      for (const name of exportedNames(join(dirname(entry), target), seen)) names.add(name)
    }
    return names
  }

  /** Every member the bundle reads off one baseline require binding. */
  function reachedMembers(): Array<{ specifier: string; member: string }> {
    const source = readOwn(BUNDLE)
    const reached: Array<{ specifier: string; member: string }> = []
    for (const binding of source.matchAll(/let\s+([A-Za-z0-9_$]+)\s*=\s*require\("([^"]+)"\)/g)) {
      const [, name, specifier] = binding
      if (name === undefined || specifier === undefined || PACKAGE_SOURCE[specifier] === undefined) continue
      for (const use of source.matchAll(new RegExp('\\b' + name + '\\.([A-Za-z0-9_$]+)', 'g'))) {
        const member = use[1]
        if (member === undefined || member === 'default') continue
        reached.push({ specifier, member })
      }
    }
    return reached
  }

  it('resolves every export the runtime require would hand the plugin', () => {
    const reached = reachedMembers()
    expect(reached.length).toBeGreaterThan(0)
    const missing = reached
      .filter(({ specifier, member }) => !exportedNames(PACKAGE_SOURCE[specifier] as string).has(member))
      .map(({ specifier, member }) => specifier + ' has no export ' + member)
    expect([...new Set(missing)]).toEqual([])
  })
})

describe('mirrored formatting rules still match upstream', () => {
  it('agrees with the shipped token formatters', async () => {
    const tokens = await upstream('packages/client/ui-chat/src/client/chat/token-format.ts')
    const formatTokens = tokens['formatTokens'] as (v: number, t: never) => string
    const hitPercent = tokens['formatCacheHitPercent'] as (read: number, prompt: number) => string | null
    for (const value of [0, 1, 517, 999, 1_000, 12_200, 517_000, 1_200_000, 999_999_999]) {
      expect(formatCompactTokens(value, t)).toBe(formatTokens(value, t))
    }
    for (const [read, prompt] of [[0, 0], [120, 120], [62, 100], [313, 1_000], [1, 3], [3, 7], [999_999, 1_000_000]]) {
      expect(formatCacheHitPercent(read as number, prompt as number)).toBe(hitPercent(read as number, prompt as number))
    }
    const usage = { uncachedInputTokens: 30, cacheReadTokens: 60, cacheWriteTokens: 10, outputTokens: 5 }
    // Billed input is 30 + 60 + 10 = 100, of which 60 came from cache.
    expect(tokenFacts(usage as never).cacheHitPercent).toBe(hitPercent(60, 100))
  })

  it('agrees with the shipped throughput and duration rules', async () => {
    const chrome = await upstream('packages/client/ui-chat/src/client/chat/message-chrome.ts')
    const perSecond = chrome['formatTokensPerSecond'] as (v: number) => string
    for (const value of [0, 9.94, 10, 45.2, 100.5, 1_234.5]) {
      expect(formatThroughput(value)).toBe(perSecond(value))
    }
    // The statistics dialog's duration rule is inline in its component, so pin
    // the plugin's rule and assert the shipped one still uses the same templates.
    expect(formatDuration(45_200, enT)).toBe('45.2s')
    expect(formatDuration(162_000, enT)).toBe('2m42s')
    const pills = read(STATS_PILLS)
    expect(pills).toContain("t('duration.compactSeconds'")
    expect(pills).toContain("t('duration.compactMinutes'")
    expect(pills).toContain('if (s < 60)')
  })

  it('agrees with the shipped occupancy fold', async () => {
    const occupancy = await upstream('packages/client/ui-conversation/src/client/context-occupancy.ts')
    const shipped = occupancy['contextOccupancy'] as (p: unknown) => unknown
    const cases: unknown[] = [
      undefined,
      {},
      { pressureTokens: 100, contextWindow: 1_000 },
      { projectedTokens: 50, pressureTokens: 100, contextWindow: 200 },
      { projectedTokens: 7, contextWindow: 10 },
      { pressureTokens: 250, contextWindow: 1_000 },
    ]
    for (const value of cases) {
      const mine = contextOccupancy(value as never)
      const theirs = shipped(value) as { percent: number; usedTokens: number; contextWindow: number } | null
      expect(mine).toEqual(theirs)
    }
    // Documented deviation: a non-positive capacity divides to Infinity, which the
    // shipped fold's cap turns into a full 100% (negative capacity goes negative);
    // this plugin hides the reading instead of claiming a full context.
    expect(contextOccupancy({ pressureTokens: 10, contextWindow: 0 } as never)).toBeNull()
    expect((shipped({ pressureTokens: 10, contextWindow: 0 }) as { percent: number }).percent).toBe(100)
  })

  it('keeps the context ring geometry the meter draws', () => {
    expect(CONTEXT_RING_RADIUS).toBe(5.5)
    const meter = read('packages/client/ui-conversation/src/client/skeleton/ContextMeter.tsx')
    expect(meter).toContain('const RADIUS = 5.5')
    expect(meter).toContain('viewBox="0 0 14 14"')
    expect(meter).toContain("transform=\"rotate(-90 7 7)\"")
  })
})

describe('mirrored copy still matches upstream', () => {
  type Source = 'chat' | 'conversation' | 'shared'
  const PAIRS: ReadonlyArray<{ plugin: string; source: Source; upstream: string }> = [
    { plugin: 'panel.title', source: 'chat', upstream: 'stats.dialog.title' },
    { plugin: 'panel.usageTitle', source: 'chat', upstream: 'stats.dialog.usageTitle' },
    { plugin: 'panel.counts', source: 'chat', upstream: 'stats.counts' },
    { plugin: 'panel.llmTime', source: 'chat', upstream: 'stats.dialog.llmTime' },
    { plugin: 'panel.toolTime', source: 'chat', upstream: 'stats.dialog.toolTime' },
    { plugin: 'panel.ttft', source: 'chat', upstream: 'stats.dialog.ttft' },
    { plugin: 'panel.speed', source: 'chat', upstream: 'stats.dialog.speed' },
    { plugin: 'value.cacheHit', source: 'chat', upstream: 'stats.cacheHit' },
    { plugin: 'value.tokensPerSecond', source: 'chat', upstream: 'message.tokensPerSecond' },
    { plugin: 'panel.cacheHit', source: 'chat', upstream: 'message.turnUsage.cacheHit' },
    { plugin: 'panel.input', source: 'chat', upstream: 'message.turnUsage.input' },
    { plugin: 'panel.cacheRead', source: 'chat', upstream: 'message.turnUsage.cacheRead' },
    { plugin: 'panel.cacheWrite', source: 'chat', upstream: 'message.turnUsage.cacheWrite' },
    { plugin: 'panel.output', source: 'chat', upstream: 'message.turnUsage.output' },
    { plugin: 'panel.count', source: 'chat', upstream: 'message.turnUsage.count' },
    { plugin: 'aria.context', source: 'conversation', upstream: 'context.aria' },
    { plugin: 'panel.contextUsed', source: 'conversation', upstream: 'context.used' },
    { plugin: 'panel.contextSystem', source: 'conversation', upstream: 'context.system' },
    { plugin: 'panel.contextTools', source: 'conversation', upstream: 'context.tools' },
    { plugin: 'panel.contextMessages', source: 'conversation', upstream: 'context.messages' },
    { plugin: 'duration.compactSeconds', source: 'chat', upstream: 'duration.compactSeconds' },
    { plugin: 'duration.compactMinutes', source: 'chat', upstream: 'duration.compactMinutes' },
    { plugin: 'number.thousand', source: 'shared', upstream: 'number.thousand' },
    { plugin: 'number.million', source: 'shared', upstream: 'number.million' },
  ]
  const SOURCE_FILE: Record<Source, string> = {
    chat: 'packages/client/ui-chat/src/client/locale.ts',
    conversation: 'packages/client/ui-conversation/src/client/locales.ts',
    shared: 'packages/client/locale/src/locales/',
  }

  it('renders every mirrored row exactly like the shipped surface', async () => {
    const loaded = new Map<Source, { zh: Record<string, string>; en: Record<string, string> }>()
    for (const source of ['chat', 'conversation'] as const) {
      const module = await upstream(SOURCE_FILE[source])
      loaded.set(source, { zh: module['zh'] as Record<string, string>, en: module['en'] as Record<string, string> })
    }
    for (const locale of ['zh', 'en'] as const) {
      loaded.set('shared', {
        zh: (await upstream(SOURCE_FILE.shared + 'zh.ts'))['zh'] as Record<string, string>,
        en: (await upstream(SOURCE_FILE.shared + 'en.ts'))['en'] as Record<string, string>,
      })
    }
    const mine = { zh, en } as Record<'zh' | 'en', Record<string, string>>
    const drift: string[] = []
    for (const pair of PAIRS) {
      for (const locale of ['zh', 'en'] as const) {
        const shipped = loaded.get(pair.source)?.[locale]?.[pair.upstream]
        if (shipped === undefined) {
          drift.push(pair.source + ' no longer defines ' + pair.upstream)
          continue
        }
        if (wording(mine[locale][pair.plugin] as string) !== wording(shipped)) {
          drift.push(locale + ' ' + pair.plugin + ' = ' + JSON.stringify(mine[locale][pair.plugin])
            + ' but ' + pair.upstream + ' = ' + JSON.stringify(shipped))
        }
      }
    }
    expect(drift).toEqual([])
  })

  it('classifies every shipped key in the mirrored namespaces', async () => {
    const mapped = (source: Source): Set<string> =>
      new Set(PAIRS.filter(pair => pair.source === source).map(pair => pair.upstream))
    // Shipped keys this plugin deliberately does not mirror, each because it
    // describes the per-turn panel rather than the session panel.
    const NOT_MIRRORED: Record<Source, readonly string[]> = {
      chat: ['message.turnUsage.title', 'message.turnUsage.consumed', 'message.turnUsage.model', 'message.turnUsage.reasoning'],
      conversation: [],
      shared: [],
    }
    const SCOPE: Record<Source, RegExp> = {
      chat: /^(stats\.|message\.turnUsage\.)/,
      conversation: /^context\./,
      shared: /^never$/,
    }
    const unclassified: string[] = []
    for (const source of ['chat', 'conversation'] as const) {
      const module = await upstream(SOURCE_FILE[source])
      const dictionary = module['zh'] as Record<string, string>
      for (const key of Object.keys(dictionary)) {
        if (!SCOPE[source].test(key)) continue
        if (mapped(source).has(key) || NOT_MIRRORED[source].includes(key)) continue
        unclassified.push(source + ' ' + key)
      }
    }
    expect(unclassified).toEqual([])
  })
})

describe('mirrored skin still matches upstream', () => {
  /** Declarations of one class rule, keyed by property. */
  function declarations(css: string, selector: string): Map<string, string> {
    const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const open = body.indexOf('\n' + selector + ' {')
    if (open === -1) return new Map()
    const start = body.indexOf('{', open)
    const end = body.indexOf('}', start)
    const properties = new Map<string, string>()
    for (const declaration of body.slice(start, end).split(';')) {
      const at = declaration.indexOf(':')
      if (at === -1) continue
      const property = declaration.slice(0, at).trim()
      if (property !== '') properties.set(property, declaration.slice(at + 1).trim())
    }
    return properties
  }

  const SKIN: ReadonlyArray<{
    plugin: string
    upstream: string
    selector: string
    upstreamSelector?: string
    ignored?: readonly string[]
  }> = [
    { plugin: '.panel', upstream: STAT_DIALOG_CSS, selector: '.panel' },
    { plugin: '.title', upstream: STAT_DIALOG_CSS, selector: '.title' },
    { plugin: '.titleLabel', upstream: STAT_DIALOG_CSS, selector: '.titleLabel' },
    { plugin: '.titleRule', upstream: STAT_DIALOG_CSS, selector: '.titleRule' },
    { plugin: '.titleValue', upstream: STAT_DIALOG_CSS, selector: '.titleValue' },
    { plugin: '.details', upstream: STAT_DIALOG_CSS, selector: '.details' },
    // The merged panel tightens the bar's vertical margin to sit under a section rule.
    { plugin: '.bar', upstream: CONTEXT_METER_CSS, selector: '.bar', ignored: ['margin'] },
    { plugin: '.barSegment', upstream: CONTEXT_METER_CSS, selector: '.segment' },
    { plugin: '.swatch', upstream: CONTEXT_METER_CSS, selector: '.swatch' },
    { plugin: '.colorSystem', upstream: CONTEXT_METER_CSS, selector: '.colorSystem' },
    { plugin: '.colorTools', upstream: CONTEXT_METER_CSS, selector: '.colorTools' },
    { plugin: '.colorMessages', upstream: CONTEXT_METER_CSS, selector: '.colorMessages' },
    { plugin: '.ringTrack', upstream: CONTEXT_METER_CSS, selector: '.track' },
    { plugin: '.ringFill', upstream: CONTEXT_METER_CSS, selector: '.fill' },
  ]

  it('keeps every copied rule in step with the shipped stylesheet', () => {
    const mine = readFileSync(new URL('../src/client/SessionMetrics.module.css', import.meta.url), 'utf8')
    const drift: string[] = []
    for (const entry of SKIN) {
      const selector = entry.upstreamSelector ?? entry.selector
      const theirs = declarations(read(entry.upstream), selector)
      if (theirs.size === 0) {
        drift.push(entry.upstream + ' no longer declares ' + selector)
        continue
      }
      const ours = declarations(mine, entry.plugin)
      // Layout differences the merged panel intentionally owns.
      if (entry.ignored !== undefined) for (const property of entry.ignored) ours.delete(property)
      for (const [property, value] of theirs) {
        if (entry.ignored?.includes(property) === true) continue
        if (!ours.has(property)) drift.push(entry.plugin + ' is missing ' + property + ': ' + value)
        else if (ours.get(property) !== value) drift.push(entry.plugin + ' ' + property + ' = ' + ours.get(property) + ' but upstream = ' + value)
      }
      for (const property of ours.keys()) {
        if (entry.ignored?.includes(property) === true) continue
        if (!theirs.has(property)) drift.push(entry.plugin + ' adds ' + property + ', absent upstream')
      }
    }
    expect(drift).toEqual([])
  })
})

describe('mirrored slot and setting contracts still hold', () => {
  it('still declares both slots the plugin registers into', () => {
    const slots = read(CONVERSATION_SLOTS)
    expect(slots).toContain("'conversation.session.header.utilities'")
    expect(slots).toContain("'conversation.composer.dock'")
    const apply = read(CHAT_APPLY)
    expect(apply).toContain("name: 'conversation.composer.dock', id: 'stats'")
  })

  it('still exposes the performance-usage level the capsule mirrors', () => {
    const settings = read(CHAT_SETTINGS)
    const modes = /PERFORMANCE_USAGE_MODES\s*=\s*\[([^\]]*)\]/.exec(settings)
    expect(modes).not.toBeNull()
    const shipped = (modes?.[1] ?? '').split(',').map(part => part.trim().replace(/['"]/g, '')).filter(part => part !== '')
    expect(shipped).toEqual(['compact', 'detailed'])
    expect(settings).toContain("CHAT_SETTINGS_NAMESPACE = 'ui-chat'")
    expect(settings).toContain("DEFAULT_PERFORMANCE_USAGE: PerformanceUsageMode = 'detailed'")
  })
})
