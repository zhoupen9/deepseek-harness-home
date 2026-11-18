/**
 * DOM projection of the palette setting: the override layer handed to the
 * theme service, the base variables the background image blends with, the
 * yield to a painted image, and the observer that keeps both in step.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PalettePresenter } from '../src/client/presenter.ts'
import {
  BACKGROUND_IMAGE_ATTRIBUTE, DEFAULT_PALETTE_SETTINGS, PALETTE_BASE_DARK_VARIABLE,
  PALETTE_BASE_LIGHT_VARIABLE, PALETTE_PLUGIN_ID,
} from '../src/client/settings.ts'

interface FakeBody {
  attributes: Set<string>
  styles: Map<string, string>
  hasAttribute: (name: string) => boolean
  setAttribute: (name: string) => void
  removeAttribute: (name: string) => void
  style: {
    setProperty: (name: string, value: string) => void
    removeProperty: (name: string) => void
  }
}

function fakeBody(): FakeBody {
  const attributes = new Set<string>()
  const styles = new Map<string, string>()
  return {
    attributes,
    styles,
    hasAttribute: name => attributes.has(name),
    setAttribute: (name) => { attributes.add(name) },
    removeAttribute: (name) => { attributes.delete(name) },
    style: {
      setProperty: (name, value) => { styles.set(name, value) },
      removeProperty: (name) => { styles.delete(name) },
    },
  }
}

/** Stands in for the browser observer so a test can fire the attribute change. */
class FakeObserver {
  static last: FakeObserver | undefined
  disconnected = false
  constructor(readonly callback: () => void) { FakeObserver.last = this }
  observe(): void {}
  disconnect(): void { this.disconnected = true }
}

function mount() {
  const body = fakeBody()
  vi.stubGlobal('document', { body })
  vi.stubGlobal('MutationObserver', FakeObserver)
  const release = vi.fn()
  const overrideTokens = vi.fn(() => release)
  const presenter = new PalettePresenter({ theme: { overrideTokens } } as never)
  return { body, presenter, overrideTokens, release }
}

const painted = { ...DEFAULT_PALETTE_SETTINGS, backgroundLight: '#101010', surfaceDark: '#202020' }

afterEach(() => { vi.unstubAllGlobals(); FakeObserver.last = undefined })

describe('PalettePresenter', () => {
  it('applies the assembled layer and writes the image base variables', () => {
    const { body, presenter, overrideTokens } = mount()
    presenter.apply(painted)
    expect(overrideTokens).toHaveBeenCalledWith(PALETTE_PLUGIN_ID, {
      '--dsw-alias-bg-base': { light: '#101010', dark: '#151517' },
      '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#202020' },
    })
    expect(body.styles.get(PALETTE_BASE_LIGHT_VARIABLE)).toBe('#101010')
    expect(body.styles.get(PALETTE_BASE_DARK_VARIABLE)).toBe('#151517')
  })

  it('yields the cleared surfaces while a background image is painted', () => {
    const { body, presenter, overrideTokens } = mount()
    body.attributes.add(BACKGROUND_IMAGE_ATTRIBUTE)
    presenter.apply({ ...painted, sidebarLight: '#303030' })
    expect(overrideTokens).toHaveBeenCalledWith(PALETTE_PLUGIN_ID, {
      '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#202020' },
    })
    // The image layer still receives the palette base.
    expect(body.styles.get(PALETTE_BASE_LIGHT_VARIABLE)).toBe('#101010')
  })

  it('re-applies when the image starts or stops painting', () => {
    const { body, presenter, overrideTokens } = mount()
    presenter.apply(painted)
    expect(Object.keys(overrideTokens.mock.calls[0]![1] as object)).toContain('--dsw-alias-bg-base')
    body.attributes.add(BACKGROUND_IMAGE_ATTRIBUTE)
    FakeObserver.last?.callback()
    const latest = overrideTokens.mock.calls.at(-1)![1] as Record<string, unknown>
    expect(Object.keys(latest)).not.toContain('--dsw-alias-bg-base')
    body.attributes.delete(BACKGROUND_IMAGE_ATTRIBUTE)
    FakeObserver.last?.callback()
    expect(Object.keys(overrideTokens.mock.calls.at(-1)![1] as object)).toContain('--dsw-alias-bg-base')
  })

  it('releases the layer and the base variables when the setting is cleared', () => {
    const { body, presenter, release } = mount()
    presenter.apply(painted)
    presenter.apply(DEFAULT_PALETTE_SETTINGS)
    expect(release).toHaveBeenCalledOnce()
    expect(body.styles.has(PALETTE_BASE_LIGHT_VARIABLE)).toBe(false)
    expect(body.styles.has(PALETTE_BASE_DARK_VARIABLE)).toBe(false)
  })

  it('releases everything on dispose, including the observer', () => {
    const { body, presenter, release } = mount()
    presenter.apply(painted)
    presenter.dispose()
    expect(release).toHaveBeenCalledOnce()
    expect(FakeObserver.last?.disconnected).toBe(true)
    expect(body.styles.has(PALETTE_BASE_LIGHT_VARIABLE)).toBe(false)
    expect(body.styles.has(PALETTE_BASE_DARK_VARIABLE)).toBe(false)
  })

  it('does nothing without a document', () => {
    vi.stubGlobal('document', undefined)
    const overrideTokens = vi.fn()
    const presenter = new PalettePresenter({ theme: { overrideTokens } } as never)
    expect(() => { presenter.apply(painted) }).not.toThrow()
    expect(overrideTokens).not.toHaveBeenCalled()
  })
})
