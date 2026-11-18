/**
 * Pure behavior of the background setting: which image sources are accepted,
 * how a local path becomes an authenticated file URL, how opacity resolves per
 * palette, and how it is clamped and rendered.
 */
import { describe, expect, it } from 'vitest'
import {
  backgroundImageUrl, clampOpacity, DEFAULT_BACKGROUND_SETTINGS, isBackgroundImage, opacityPercent,
  paletteOpacity, type BackgroundSettings,
} from '../src/client/settings.ts'

describe('isBackgroundImage', () => {
  it('accepts empty, http(s), data images, and absolute paths', () => {
    const accepted = [
      '', '  ', 'https://example.com/bg.webp', 'http://127.0.0.1:3000/bg.png',
      'data:image/png;base64,AAAA', 'data:image/svg+xml,%3Csvg/%3E',
      '/home/me/bg.jpg', 'C:\\pics\\bg.jpg', 'C:/pics/bg.jpg',
    ]
    for (const value of accepted) expect(isBackgroundImage(value), value).toBe(true)
  })

  it('rejects relative, non-image, and unsupported local values', () => {
    const rejected = [
      'bg.jpg', 'ftp://example.com/bg.jpg', 'data:text/plain,hi', 'https://',
      '//server/share/bg.jpg', '\\\\server\\share\\bg.jpg', 'javascript:alert(1)',
      '/tmp/a\u0000b',
    ]
    for (const value of rejected) expect(isBackgroundImage(value), value).toBe(false)
  })
})

describe('backgroundImageUrl', () => {
  it('passes remote and data URLs through unchanged', () => {
    expect(backgroundImageUrl('https://example.com/bg.webp', 'http://host/')).toBe('https://example.com/bg.webp')
    expect(backgroundImageUrl(' data:image/png;base64,AAAA ', 'http://host/')).toBe('data:image/png;base64,AAAA')
  })

  it('routes absolute paths through the authenticated file route', () => {
    expect(backgroundImageUrl('/tmp/a b.png', 'http://127.0.0.1:41011/'))
      .toBe('http://127.0.0.1:41011/api/file?path=%2Ftmp%2Fa%20b.png')
    expect(backgroundImageUrl('C:\\pics\\a.png', 'http://host/base/'))
      .toBe('http://host/base/api/file?path=C%3A%5Cpics%5Ca.png')
    expect(backgroundImageUrl('/tmp/a.png', 'dsh-app://app/'))
      .toBe('dsh-app://app/api/file?path=%2Ftmp%2Fa.png')
  })

  it('refuses unsupported sources and transports', () => {
    expect(backgroundImageUrl('', 'http://host/')).toBeUndefined()
    expect(backgroundImageUrl('relative.png', 'http://host/')).toBeUndefined()
    expect(backgroundImageUrl('/tmp/a.png', 'file:///tmp/')).toBeUndefined()
  })
})

describe('opacity', () => {
  it('clamps and rounds to a whole percentage', () => {
    expect(opacityPercent(0)).toBe(0)
    expect(opacityPercent(0.5)).toBe(50)
    expect(opacityPercent(0.333)).toBe(33)
    expect(opacityPercent(1)).toBe(100)
    expect(opacityPercent(-1)).toBe(0)
    expect(opacityPercent(2)).toBe(100)
    expect(opacityPercent(Number.NaN)).toBe(50)
  })

  it('clampOpacity stays finite and in range', () => {
    expect(clampOpacity(Number.POSITIVE_INFINITY)).toBe(0.5)
    expect(clampOpacity(-0.2)).toBe(0)
    expect(clampOpacity(0.7)).toBe(0.7)
  })

  it('defaults match the host schema', () => {
    expect(DEFAULT_BACKGROUND_SETTINGS).toEqual({ enabled: false, image: '', opacity: 0.5 })
  })
})

describe('paletteOpacity', () => {
  const shared: BackgroundSettings = { enabled: true, image: '', opacity: 0.4 }

  it('uses each palette value and falls back to the shared one', () => {
    expect(paletteOpacity(shared, 'light')).toBe(0.4)
    expect(paletteOpacity(shared, 'dark')).toBe(0.4)
    expect(paletteOpacity({ ...shared, opacityLight: 0.2 }, 'light')).toBe(0.2)
    expect(paletteOpacity({ ...shared, opacityLight: 0.2 }, 'dark')).toBe(0.4)
    expect(paletteOpacity({ ...shared, opacityDark: 0.9 }, 'dark')).toBe(0.9)
    expect(paletteOpacity({ ...shared, opacityDark: 0.9 }, 'light')).toBe(0.4)
  })

  it('clamps a stored per-palette value', () => {
    expect(paletteOpacity({ ...shared, opacityLight: 1.4 }, 'light')).toBe(1)
    expect(paletteOpacity({ ...shared, opacityDark: -1 }, 'dark')).toBe(0)
  })
})
