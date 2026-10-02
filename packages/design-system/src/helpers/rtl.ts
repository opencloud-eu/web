import type { Placement } from '@floating-ui/dom'

const rtlLanguages = ['ar', 'ckb', 'dv', 'fa', 'he', 'ps', 'sd', 'ug', 'ur', 'yi']

/** Whether a language code (e.g. `ar` or `ar-SA`) is written right-to-left. */
export function isRtlLanguage(language: string): boolean {
  return rtlLanguages.includes(language.trim().split('-')[0])
}

/**
 * Wraps a string in bidi isolates so it keeps its left-to-right order (numbers followed by
 * units, file names, ...) when rendered inside right-to-left text.
 */
export function isolateLtr(text: string): string {
  return `\u2066${text}\u2069`
}

export function isRtl(): boolean {
  return document.documentElement.dir === 'rtl'
}

/**
 * Mirrors the physical sides of a floating-ui placement in right-to-left documents,
 * e.g. `right-start` becomes `left-start`. Alignments (`-start`, `-end`) are already
 * handled by floating-ui.
 */
export function getDirectionAwarePlacement(placement: Placement): Placement {
  if (!isRtl()) {
    return placement
  }
  if (placement.startsWith('left')) {
    return placement.replace('left', 'right') as Placement
  }
  if (placement.startsWith('right')) {
    return placement.replace('right', 'left') as Placement
  }
  return placement
}
