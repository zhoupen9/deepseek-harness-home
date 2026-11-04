/**
 * Upstream-drift guard for everything this plugin mirrors instead of importing.
 *
 * A profile-local plugin may not import another feature plugin's values or
 * stylesheet, and the module table it can require is only the baseline. The
 * shipped To-dos copy, the composer cell this plugin shadows, the slot
 * declarations, the todos projection, and the baseline exports all live in the
 * harness and can drift silently. This spec compares each mirror against the
 * harness the local dsh runs from, so re-synchronizing stays deliberate.
 *
 * The harness root resolves from $DSH_HARNESS_DIR first, otherwise from the
 * dsh entry on PATH (the launcher lives at <root>/apps/<app>/node_modules/.bin).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { en, zh, type TodoPillKey } from '../src/client/locales.ts'
import { DOCK_SHADOW, HEADER_ENTRY, SESSION_METRICS_ORDER } from '../src/client/registrations.ts'

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
/** Read one of this plugin's own files (the built bundle is the runtime truth). */
const readOwn = (relative: string): string => readFileSync(new URL('../' + relative, import.meta.url), 'utf8')
/** Collapse formatting so a reformat does not read as contract drift. */
const normalize = (source: string): string => source.replace(/\s+/g, ' ')

/** Placeholder names are the caller's; wording is what must match upstream. */
const wording = (text: string): string => text.replace(/\{[A-Za-z0-9_]+\}/g, '{}')

/** Load one upstream TypeScript module through its file URL. */
async function upstream(relative: string): Promise<Record<string, unknown>> {
  return await import(pathToFileURL(join(HARNESS, relative)).href) as Record<string, unknown>
}

const TODO_PANEL = 'packages/client/ui-conversation/src/client/skeleton/TodoPanel.tsx'
const CONVERSATION_CONTENT = 'packages/client/ui-conversation/src/client/skeleton/ConversationContent.tsx'
const CONVERSATION_SLOTS = 'packages/client/ui-conversation/src/client/contract/slots.ts'
const CONVERSATION_LOCALES = 'packages/client/ui-conversation/src/client/locales.ts'
const TODO_TYPES = 'packages/todo/tool-todo/src/types.ts'
const TODO_TOOL = 'packages/todo/tool-todo/src/index.ts'
const OPEN_IN_APP = 'packages/client/ui-open-in-app/src/client/index.ts'
const PRIMITIVES_INDEX = 'packages/client/ui-primitives/src/index.ts'
const PRIMITIVES_ICONS = 'packages/client/ui-primitives/src/icons/index.tsx'
const BUNDLE = 'lib/client.js'

/** Module-table rows the shell seeds for every dynamic bundle. */
const BASELINE = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
  '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

describe('composer card this plugin shadows', () => {
  it('still registers the todo cell above the composer', () => {
    expect(normalize(read(TODO_PANEL)))
      .toContain("name: 'conversation.input.dock', id: 'todo', order: 0")
    expect(normalize(read(CONVERSATION_CONTENT)))
      .toContain("renderSlot('conversation.input.dock', zone)")
  })

  it('shadows that cell with the same id at a lower priority', () => {
    expect(DOCK_SHADOW).toMatchObject({ name: 'conversation.input.dock', id: 'todo' })
    expect(DOCK_SHADOW.priority).toBeLessThan(0)
  })
})

describe('target slots', () => {
  it('keeps both target slots declared as session-scoped lists', () => {
    const slots = normalize(read(CONVERSATION_SLOTS))
    // Multi-line declaration members end without a separator; single-line ones
    // use semicolons. Accept either spelling of the same kind/scope pair.
    expect(slots).toMatch(/'conversation\.session\.header\.utilities': \{ kind: 'list';? scope: 'session'/)
    expect(slots).toMatch(/'conversation\.input\.dock': \{ kind: 'list';? scope: 'session'/)
  })

  it('keeps the header utilities right-aligned in ascending order', () => {
    const session = read('packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx')
    expect(normalize(session)).toContain("renderSlot('conversation.session.header.utilities', {})")
  })
})

describe('todos projection contract', () => {
  it('still declares the whole-list projection and its three states', () => {
    const types = normalize(read(TODO_TYPES))
    expect(types).toContain('todos: SessionProjectionSummaryExcluded<TodoItem[]> | null')
    expect(types).toContain("status: 'pending' | 'in_progress' | 'completed'")
    expect(normalize(read(TODO_TOOL))).toContain("key: 'todos'")
  })
})

describe('mirrored copy', () => {
  const PAIRS: ReadonlyArray<{ plugin: TodoPillKey; upstream: string }> = [
    { plugin: 'title', upstream: 'todo.title' },
    { plugin: 'progress.done', upstream: 'todo.progress.done' },
    { plugin: 'progress.active', upstream: 'todo.progress.active' },
    { plugin: 'progress.pending', upstream: 'todo.progress.pending' },
    { plugin: 'status.completed', upstream: 'todo.status.completed' },
    { plugin: 'status.inProgress', upstream: 'todo.status.inProgress' },
    { plugin: 'status.pending', upstream: 'todo.status.pending' },
  ]

  it('renders every mirrored string exactly like the shipped card', async () => {
    const module = await upstream(CONVERSATION_LOCALES)
    const shipped = { zh: module['zh'], en: module['en'] } as Record<'zh' | 'en', Record<string, string>>
    const mine = { zh, en } as Record<'zh' | 'en', Record<string, string>>
    const drift: string[] = []
    for (const pair of PAIRS) {
      for (const locale of ['zh', 'en'] as const) {
        const shippedValue = shipped[locale][pair.upstream]
        if (shippedValue === undefined) {
          drift.push('conversation no longer defines ' + pair.upstream)
          continue
        }
        const own = mine[locale][pair.plugin] as string
        if (wording(own) !== wording(shippedValue)) {
          drift.push(locale + ' ' + pair.plugin + ' = ' + JSON.stringify(own)
            + ' but ' + pair.upstream + ' = ' + JSON.stringify(shippedValue))
        }
      }
    }
    expect(drift).toEqual([])
  })
})

describe('header row placement', () => {
  it('stays left of the shipped open-in-app utility', () => {
    expect(normalize(read(OPEN_IN_APP))).toContain("id: 'open-in-app', order: -10")
    expect(HEADER_ENTRY.order).toBeLessThan(-10)
  })

  it('stays left of the session-metrics capsule when that plugin is installed', () => {
    expect(HEADER_ENTRY.name).toBe('conversation.session.header.utilities')
    expect(HEADER_ENTRY.id).toBe('todo-pill')
    expect(SESSION_METRICS_ORDER).toBe(-11)
    expect(HEADER_ENTRY.order).toBeLessThan(SESSION_METRICS_ORDER)
    const sibling = join(dirname(fileURLToPath(import.meta.url)), '../../ui-session-metrics/src/client/index.ts')
    if (existsSync(sibling)) {
      expect(readFileSync(sibling, 'utf8')).toContain('order: -11')
    }
  })
})

describe('baseline module exports the plugin bundle reaches for', () => {
  const PACKAGE_SOURCE: Record<string, string> = {
    '@deepseek-ai/dsh-client-ui-primitives': 'packages/client/ui-primitives/src/index.ts',
    '@deepseek-ai/dsh-client-store': 'packages/client/store/src/index.ts',
    '@deepseek-ai/dsh-client-ui-slots': 'packages/client/ui-slots/src/index.ts',
  }

  /** Exported names of a package entry, following export * re-exports. */
  function exportedNames(entry: string, seen = new Set<string>()): Set<string> {
    const names = new Set<string>()
    if (!existsSync(join(HARNESS, entry)) || seen.has(entry)) return names
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

  it('requires only baseline module-table rows', () => {
    const specifiers = [...readOwn(BUNDLE).matchAll(/require\("([^"]+)"\)/g)]
      .map(match => match[1] as string)
    for (const specifier of specifiers) expect(BASELINE).toContain(specifier)
  })

  it('keeps the ui-primitives names this plugin imports', () => {
    const index = read(PRIMITIVES_INDEX)
    for (const name of ['StateDot', 'Tooltip', 'useAnchoredPosition', 'useDismissOnOutsidePointer']) {
      expect(index).toMatch(new RegExp('export\\s*\\{[^}]*\\b' + name + '\\b'))
    }
    expect(read(PRIMITIVES_ICONS)).toContain('IconChecklistOutlineRegular')
  })
})

describe('built bundle', () => {
  it('carries both registrations and their order/priority', () => {
    const bundle = readOwn(BUNDLE)
    expect(bundle).toContain('conversation.session.header.utilities')
    expect(bundle).toContain('conversation.input.dock')
    expect(bundle).toMatch(/id:\s*"todo-pill"/)
    expect(bundle).toMatch(/order:\s*-12/)
    expect(bundle).toMatch(/priority:\s*-1/)
  })
})
