type OpenDrop = {
  getAnchor: () => HTMLElement | null
  hide: () => void
}

/**
 * Registry of all currently open drops with their anchor element and hide handler.
 *
 * Drops are teleported, so a nested drop is no DOM child of the drop it was opened from.
 * The registry restores that relation. It lets a drop tell a click inside one of its nested
 * drops apart from a real outside click, and lets a nested drop close its ancestors.
 */
const openDrops = new Map<HTMLElement, OpenDrop>()

export function registerOpenDrop(dropEl: HTMLElement, entry: OpenDrop): void {
  openDrops.set(dropEl, entry)
}

export function unregisterOpenDrop(dropEl: HTMLElement): void {
  openDrops.delete(dropEl)
}

/** Collects the open drops that `dropEl` was opened from, closest ancestor first. */
function getAncestorDrops(dropEl: HTMLElement): OpenDrop[] {
  const ancestors: OpenDrop[] = []
  const visited = new Set<HTMLElement>([dropEl])
  let current: HTMLElement | null = dropEl

  while (current) {
    const anchor = openDrops.get(current)?.getAnchor() ?? null
    const parent = anchor?.closest<HTMLElement>('.oc-drop') ?? null
    if (!parent || visited.has(parent)) {
      break
    }

    visited.add(parent)
    const entry = openDrops.get(parent)
    if (entry) {
      ancestors.push(entry)
    }
    current = parent
  }

  return ancestors
}

/** Checks if `target` sits inside `dropEl` or inside a drop that was opened from within it. */
export function isInDropChain(dropEl: HTMLElement, target: Node): boolean {
  const targetEl = target instanceof HTMLElement ? target : target.parentElement
  const nestedDrop = targetEl?.closest<HTMLElement>('.oc-drop') ?? null
  if (!nestedDrop) {
    return false
  }
  if (nestedDrop === dropEl) {
    return true
  }

  return getAncestorDrops(nestedDrop).some((entry) => entry === openDrops.get(dropEl))
}

/** Closes all open drops that `dropEl` was opened from. */
export function hideAncestorDrops(dropEl: HTMLElement): void {
  getAncestorDrops(dropEl).forEach((entry) => entry.hide())
}
