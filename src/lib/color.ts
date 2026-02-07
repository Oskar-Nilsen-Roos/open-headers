import {
  formatHex,
  hsv as culoriHsv,
  oklch as culoriOklch,
  parse,
  rgb as culoriRgb,
  wcagContrast,
} from 'culori'
import type { Hsv as CuloriHsv, Oklch as CuloriOklch, Rgb as CuloriRgb } from 'culori'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HsvColor {
  h: number
  s: number
  v: number
}

export interface OklchColor {
  l: number
  c: number
  h: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toCuloriRgb(color: RgbColor): CuloriRgb {
  return {
    mode: 'rgb',
    r: clamp(color.r, 0, 255) / 255,
    g: clamp(color.g, 0, 255) / 255,
    b: clamp(color.b, 0, 255) / 255,
  }
}

function fromCuloriRgb(color: CuloriRgb | undefined | null): RgbColor | null {
  if (!color) return null
  if (
    typeof color.r !== 'number'
    || typeof color.g !== 'number'
    || typeof color.b !== 'number'
  ) {
    return null
  }

  return {
    r: Math.round(clamp(color.r, 0, 1) * 255),
    g: Math.round(clamp(color.g, 0, 1) * 255),
    b: Math.round(clamp(color.b, 0, 1) * 255),
  }
}

function normalizeHex(color: string | undefined): string | null {
  if (!color) return null
  return color.toLowerCase()
}

function parseToCuloriRgb(input: string): CuloriRgb | null {
  const parsed = parse(input.trim())
  if (!parsed) return null
  return culoriRgb(parsed) ?? null
}

function contrastRatio(colorA: string, colorB: string): number {
  return wcagContrast(colorA, colorB)
}

export function hexToRgb(hex: string): RgbColor | null {
  return parseColorInputToRgb(hex)
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const formatted = normalizeHex(formatHex(toCuloriRgb({ r, g, b })))
  return formatted ?? '#000000'
}

export function parseColorInputToRgb(input: string): RgbColor | null {
  const rgbColor = parseToCuloriRgb(input)
  return fromCuloriRgb(rgbColor)
}

export function parseColorInputToHex(input: string): string | null {
  const parsed = parse(input.trim())
  if (!parsed) return null
  return normalizeHex(formatHex(parsed))
}

export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const hsvColor = culoriHsv(toCuloriRgb({ r, g, b }))
  const h = typeof hsvColor?.h === 'number' ? hsvColor.h : 0
  const s = typeof hsvColor?.s === 'number' ? hsvColor.s * 100 : 0
  const v = typeof hsvColor?.v === 'number' ? hsvColor.v * 100 : 0

  return {
    h: clamp(h, 0, 360),
    s: clamp(s, 0, 100),
    v: clamp(v, 0, 100),
  }
}

export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hsvColor: CuloriHsv = {
    mode: 'hsv',
    h: Number.isFinite(h) ? h : 0,
    s: clamp(s, 0, 100) / 100,
    v: clamp(v, 0, 100) / 100,
  }

  const rgbColor = culoriRgb(hsvColor)
  return fromCuloriRgb(rgbColor) ?? { r: 124, g: 58, b: 237 }
}

export function hexToHsv(hex: string, fallbackHex = '#7c3aed'): HsvColor {
  const rgbColor = parseColorInputToRgb(hex) ?? parseColorInputToRgb(fallbackHex) ?? { r: 124, g: 58, b: 237 }
  return rgbToHsv(rgbColor)
}

export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv))
}

export function rgbToOklch({ r, g, b }: RgbColor): OklchColor {
  const converted = culoriOklch(toCuloriRgb({ r, g, b }))
  return {
    l: clamp(typeof converted?.l === 'number' ? converted.l : 0.5, 0, 1),
    c: clamp(typeof converted?.c === 'number' ? converted.c : 0, 0, 1),
    h: typeof converted?.h === 'number' ? converted.h : 250,
  }
}

export function oklchToRgb({ l, c, h }: OklchColor): RgbColor {
  const color: CuloriOklch = {
    mode: 'oklch',
    l: clamp(l, 0, 1),
    c: clamp(c, 0, 1),
    h: Number.isFinite(h) ? h : 250,
  }

  const rgbColor = culoriRgb(color)
  return fromCuloriRgb(rgbColor) ?? { r: 124, g: 58, b: 237 }
}

interface ContrastCandidate {
  hex: string
  ratio: number
}

function findContrastCandidate(
  backgroundHex: string,
  backgroundOklch: OklchColor,
  direction: 'light' | 'dark'
): ContrastCandidate {
  const baseHue = Number.isFinite(backgroundOklch.h) ? backgroundOklch.h : 250
  const hue = direction === 'dark' ? (baseHue + 180) % 360 : baseHue
  const baseChroma = clamp(backgroundOklch.c * 0.2, 0.008, 0.05)

  const startLightness = direction === 'light' ? 0.7 : 0.38
  const endLightness = direction === 'light' ? 0.99 : 0.06
  const steps = 72

  let best: ContrastCandidate | null = null
  let firstPassing: ContrastCandidate | null = null

  for (let index = 0; index <= steps; index++) {
    const progress = index / steps
    const lightness = startLightness + (endLightness - startLightness) * progress
    const chroma = direction === 'light'
      ? clamp(baseChroma * (1 - progress * 0.6), 0.004, 0.04)
      : clamp(baseChroma * (0.85 + progress * 0.3), 0.006, 0.055)

    const candidateHex = rgbToHex(oklchToRgb({
      l: lightness,
      c: chroma,
      h: hue,
    }))
    const ratio = contrastRatio(backgroundHex, candidateHex)
    const candidate = { hex: candidateHex, ratio }

    if (!best || candidate.ratio > best.ratio) best = candidate
    if (!firstPassing && candidate.ratio >= 4.5) firstPassing = candidate
  }

  return firstPassing ?? best ?? {
    hex: direction === 'light' ? '#f8fafc' : '#1f2937',
    ratio: 1,
  }
}

export function getReadableTextColor(backgroundColor: string): string {
  const backgroundHex = parseColorInputToHex(backgroundColor)
  if (!backgroundHex) return '#f8fafc'

  // Keep text near-white by default and only switch once contrast genuinely fails.
  const persistentLightHex = rgbToHex(oklchToRgb({ l: 0.992, c: 0.004, h: 250 }))
  if (contrastRatio(backgroundHex, persistentLightHex) >= 4.5) {
    return persistentLightHex
  }

  const backgroundRgb = parseColorInputToRgb(backgroundHex)
  if (!backgroundRgb) return '#f8fafc'

  const backgroundOklch = rgbToOklch(backgroundRgb)
  const darkCandidate = findContrastCandidate(backgroundHex, backgroundOklch, 'dark')
  if (darkCandidate.ratio >= 4.5) return darkCandidate.hex

  const lightCandidate = findContrastCandidate(backgroundHex, backgroundOklch, 'light')
  return darkCandidate.ratio >= lightCandidate.ratio ? darkCandidate.hex : lightCandidate.hex
}

export function toRgba(color: string, alpha: number): string {
  const rgbColor = parseColorInputToRgb(color)
  if (!rgbColor) return `rgba(255, 255, 255, ${clamp(alpha, 0, 1)})`
  return `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${clamp(alpha, 0, 1)})`
}
