import type { Placement } from '@floating-ui/dom'

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
