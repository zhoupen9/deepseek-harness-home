/**
 * DOM projection of the background setting: the attribute and variables the
 * stylesheet consumes, both palette opacities, and the theme override that
 * clears the surfaces which would otherwise hide the layer.
 */
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackgroundPresenter } from '../src/client/presenter.ts'
import {
  BACKGROUND_ATTRIBUTE, BACKGROUND_IMAGE_VARIABLE, BACKGROUND_OPACITY_DARK_VARIABLE,
  BACKGROUND_OPACITY_LIGHT_VARIABLE, DEFAULT_BACKGROUND_SETTINGS,
} from '../src/client/settings.ts'

interface FakeBody {
  attributes: Set<string>
  styles: Map<string, string>
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
    setAttribute: (name) => { attributes.add(name) },
    removeAttribute: (name) => { attributes.delete(name) },
    style: {
      setProperty: (name, value) => { styles.set(name, value) },
      removeProperty: (name) => { styles.delete(name) },
    },
  }
}

function mount(): { body: FakeBody; overrideTokens: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn>; presenter: BackgroundPresenter } {
  const body = fakeBody()
  vi.stubGlobal('document', { baseURI: 'http://127.0.0.1:41011/', body })
  const release = vi.fn()
  const overrideTokens = vi.fn(() => release)
  const presenter = new BackgroundPresenter({ theme: { overrideTokens } } as never)
  return { body, overrideTokens, release, presenter }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('BackgroundPresenter', () => {
  it('paints an enabled local image and clears the base surfaces once', () => {
    const { body, overrideTokens, presenter } = mount()
    presenter.apply({ enabled: true, image: '/tmp/bg.png', opacity: 0.4 })
    expect(body.attributes.has(BACKGROUND_ATTRIBUTE)).toBe(true)
    expect(body.styles.get(BACKGROUND_IMAGE_VARIABLE))
      .toBe('url("http://127.0.0.1:41011/api/file?path=%2Ftmp%2Fbg.png")')
    expect(body.styles.get(BACKGROUND_OPACITY_LIGHT_VARIABLE)).toBe('0.4')
    expect(body.styles.get(BACKGROUND_OPACITY_DARK_VARIABLE)).toBe('0.4')
    expect(overrideTokens).toHaveBeenCalledOnce()
    expect(overrideTokens).toHaveBeenCalledWith('@zar-desktop/ui-background', {
      '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-sidebar-fill': { light: 'transparent', dark: 'transparent' },
    })
  })

  it('writes each palette opacity from its own value, falling back to the shared one', () => {
    const { body, presenter } = mount()
    presenter.apply({ enabled: true, image: '/tmp/bg.png', opacity: 0.4, opacityLight: 0.2 })
    expect(body.styles.get(BACKGROUND_OPACITY_LIGHT_VARIABLE)).toBe('0.2')
    expect(body.styles.get(BACKGROUND_OPACITY_DARK_VARIABLE)).toBe('0.4')
    presenter.apply({ enabled: true, image: '/tmp/bg.png', opacity: 0.4, opacityDark: 0.9 })
    expect(body.styles.get(BACKGROUND_OPACITY_LIGHT_VARIABLE)).toBe('0.4')
    expect(body.styles.get(BACKGROUND_OPACITY_DARK_VARIABLE)).toBe('0.9')
  })

  it('updates the image and opacities without stacking a second override', () => {
    const { body, overrideTokens, presenter } = mount()
    presenter.apply({ enabled: true, image: '/tmp/a.png', opacity: 0.4 })
    presenter.apply({ enabled: true, image: 'https://example.com/b.png', opacity: 0.7, opacityDark: 1 })
    expect(overrideTokens).toHaveBeenCalledOnce()
    expect(body.styles.get(BACKGROUND_IMAGE_VARIABLE)).toBe('url("https://example.com/b.png")')
    expect(body.styles.get(BACKGROUND_OPACITY_LIGHT_VARIABLE)).toBe('0.7')
    expect(body.styles.get(BACKGROUND_OPACITY_DARK_VARIABLE)).toBe('1')
  })

  it('retracts the layer and releases the override when disabled', () => {
    const { body, release, presenter } = mount()
    presenter.apply({ enabled: true, image: '/tmp/a.png', opacity: 0.5 })
    presenter.apply({ enabled: false, image: '/tmp/a.png', opacity: 0.5 })
    expect(body.attributes.has(BACKGROUND_ATTRIBUTE)).toBe(false)
    expect(body.styles.has(BACKGROUND_IMAGE_VARIABLE)).toBe(false)
    expect(body.styles.has(BACKGROUND_OPACITY_LIGHT_VARIABLE)).toBe(false)
    expect(body.styles.has(BACKGROUND_OPACITY_DARK_VARIABLE)).toBe(false)
    expect(release).toHaveBeenCalledOnce()
  })

  it('never paints an unsupported source', () => {
    const { body, overrideTokens, presenter } = mount()
    presenter.apply({ enabled: true, image: 'not an image', opacity: 0.5 })
    presenter.apply({ ...DEFAULT_BACKGROUND_SETTINGS, enabled: true })
    expect(body.attributes.has(BACKGROUND_ATTRIBUTE)).toBe(false)
    expect(overrideTokens).not.toHaveBeenCalled()
  })

  it('releases everything on dispose and can paint again afterwards', () => {
    const { body, overrideTokens, release, presenter } = mount()
    presenter.apply({ enabled: true, image: '/tmp/a.png', opacity: 0.5 })
    presenter.dispose()
    expect(release).toHaveBeenCalledOnce()
    expect(body.attributes.has(BACKGROUND_ATTRIBUTE)).toBe(false)
    presenter.apply({ enabled: true, image: '/tmp/a.png', opacity: 0.5 })
    expect(overrideTokens).toHaveBeenCalledTimes(2)
    expect(body.attributes.has(BACKGROUND_ATTRIBUTE)).toBe(true)
  })

  it('keeps the stylesheet selectors in step with the presenter constants', () => {
    const css = readFileSync(new URL('../src/client/background.css', import.meta.url), 'utf8')
    // The palette base layer sits under the image layer, both behind content.
    expect(css).toContain(`html:not([data-platform='darwin']) body[${BACKGROUND_ATTRIBUTE}]::before`)
    expect(css).toContain(`body[${BACKGROUND_ATTRIBUTE}]::after`)
    expect(css).toContain(`var(${BACKGROUND_IMAGE_VARIABLE})`)
    expect(css).toContain(`var(${BACKGROUND_OPACITY_LIGHT_VARIABLE}`)
    expect(css).toContain(`var(${BACKGROUND_OPACITY_DARK_VARIABLE}`)
    expect(css).toContain('[data-ds-dark-theme]')
  })
})
