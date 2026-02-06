import { describe, it, expect } from 'vitest'
import {
  getReadableTextColor,
  parseColorInputToRgb,
  parseColorInputToHex,
} from '@/lib/color'

function toLinear(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hexColor: string): number {
  const rgb = parseColorInputToRgb(hexColor)
  if (!rgb) return 0
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = luminance(foreground)
  const l2 = luminance(background)
  const light = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (light + 0.05) / (dark + 0.05)
}

describe('color utils', () => {
  it('parses hex and rgb inputs', () => {
    expect(parseColorInputToHex('#ff00aa')).toBe('#ff00aa')
    expect(parseColorInputToHex('rgb(255, 0, 170)')).toBe('#ff00aa')
  })

  it('parses oklch input', () => {
    const parsed = parseColorInputToHex('oklch(62% 0.22 328)')
    expect(parsed).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns high-contrast readable text across bright, dark, and mid backgrounds', () => {
    const backgrounds = ['#ffffff', '#000000', '#4c3f8f', '#93c5fd', '#10b981']
    for (const background of backgrounds) {
      const text = getReadableTextColor(background)
      expect(text).toMatch(/^#[0-9a-f]{6}$/)
      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps a near-white text color on darker blue surfaces', () => {
    const text = getReadableTextColor('#003b72')
    expect(text).toMatch(/^#[0-9a-f]{6}$/)

    const rgb = parseColorInputToRgb(text)
    expect(rgb).toBeTruthy()
    expect((rgb?.r ?? 0)).toBeGreaterThanOrEqual(240)
    expect((rgb?.g ?? 0)).toBeGreaterThanOrEqual(240)
    expect((rgb?.b ?? 0)).toBeGreaterThanOrEqual(240)
    expect(contrastRatio(text, '#003b72')).toBeGreaterThanOrEqual(4.5)
  })
})
