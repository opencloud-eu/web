import {
  hideAncestorDrops,
  isInDropChain,
  registerOpenDrop,
  unregisterOpenDrop
} from './dropRegistry'

/**
 * Builds a drop element and appends it to a parent. Drops are teleported, so a nested drop is
 * always a body child. Its relation to the parent drop only exists through the anchor.
 */
function createDrop(id: string) {
  const dropEl = document.createElement('div')
  dropEl.classList.add('oc-drop')
  dropEl.id = id
  document.body.appendChild(dropEl)
  return dropEl
}

function createAnchor(parent: HTMLElement) {
  const anchor = document.createElement('button')
  parent.appendChild(anchor)
  return anchor
}

function register(dropEl: HTMLElement, anchor: HTMLElement | null = null) {
  const hide = vi.fn()
  registerOpenDrop(dropEl, { getAnchor: () => anchor, hide })
  return hide
}

describe('dropRegistry', () => {
  let registered: HTMLElement[]

  beforeEach(() => {
    registered = []
    document.body.innerHTML = ''
  })

  afterEach(() => {
    registered.forEach((el) => unregisterOpenDrop(el))
  })

  const track = (...els: HTMLElement[]) => {
    registered.push(...els)
    return els
  }

  describe('isInDropChain', () => {
    it('returns false for a target outside of any drop', () => {
      const [drop] = track(createDrop('drop'))
      register(drop)

      const outside = document.createElement('div')
      document.body.appendChild(outside)

      expect(isInDropChain(drop, outside)).toBe(false)
    })

    it('returns true for a target inside the drop itself', () => {
      const [drop] = track(createDrop('drop'))
      register(drop)

      const child = document.createElement('span')
      drop.appendChild(child)

      expect(isInDropChain(drop, child)).toBe(true)
    })

    it('returns true for a target inside a nested drop', () => {
      const [parent, nested] = track(createDrop('parent'), createDrop('nested'))
      register(parent)
      register(nested, createAnchor(parent))

      const child = document.createElement('span')
      nested.appendChild(child)

      expect(isInDropChain(parent, child)).toBe(true)
    })

    it('returns true for a target inside a deeply nested drop', () => {
      const [parent, nested, deep] = track(
        createDrop('parent'),
        createDrop('nested'),
        createDrop('deep')
      )
      register(parent)
      register(nested, createAnchor(parent))
      register(deep, createAnchor(nested))

      expect(isInDropChain(parent, deep)).toBe(true)
    })

    it('returns false for a target inside an unrelated drop', () => {
      const [drop, other] = track(createDrop('drop'), createDrop('other'))
      register(drop)
      register(other)

      const child = document.createElement('span')
      other.appendChild(child)

      expect(isInDropChain(drop, child)).toBe(false)
    })

    it('returns false for a target inside the parent of the given drop', () => {
      const [parent, nested] = track(createDrop('parent'), createDrop('nested'))
      register(parent)
      register(nested, createAnchor(parent))

      const child = document.createElement('span')
      parent.appendChild(child)

      expect(isInDropChain(nested, child)).toBe(false)
    })

    it('resolves a text node target through its parent element', () => {
      const [parent, nested] = track(createDrop('parent'), createDrop('nested'))
      register(parent)
      register(nested, createAnchor(parent))

      const text = document.createTextNode('label')
      nested.appendChild(text)

      expect(isInDropChain(parent, text)).toBe(true)
    })

    it('returns false once the nested drop got unregistered', () => {
      const [parent, nested] = track(createDrop('parent'), createDrop('nested'))
      register(parent)
      register(nested, createAnchor(parent))
      unregisterOpenDrop(nested)

      expect(isInDropChain(parent, nested)).toBe(false)
    })
  })

  describe('hideAncestorDrops', () => {
    it('does nothing for a drop without ancestors', () => {
      const [drop] = track(createDrop('drop'))
      const hide = register(drop)

      hideAncestorDrops(drop)

      expect(hide).not.toHaveBeenCalled()
    })

    it('hides all ancestors but not the drop itself', () => {
      const [parent, nested, deep] = track(
        createDrop('parent'),
        createDrop('nested'),
        createDrop('deep')
      )
      const hideParent = register(parent)
      const hideNested = register(nested, createAnchor(parent))
      const hideDeep = register(deep, createAnchor(nested))

      hideAncestorDrops(deep)

      expect(hideNested).toHaveBeenCalledTimes(1)
      expect(hideParent).toHaveBeenCalledTimes(1)
      expect(hideDeep).not.toHaveBeenCalled()
    })

    it('stops at an ancestor that is no longer registered', () => {
      const [parent, nested, deep] = track(
        createDrop('parent'),
        createDrop('nested'),
        createDrop('deep')
      )
      const hideParent = register(parent)
      register(nested, createAnchor(parent))
      register(deep, createAnchor(nested))
      unregisterOpenDrop(nested)

      hideAncestorDrops(deep)

      expect(hideParent).not.toHaveBeenCalled()
    })

    it('does not loop on a drop that anchors inside itself', () => {
      const [drop] = track(createDrop('drop'))
      const hide = register(drop, createAnchor(document.body))
      unregisterOpenDrop(drop)
      registerOpenDrop(drop, { getAnchor: () => createAnchor(drop), hide })

      hideAncestorDrops(drop)

      expect(hide).not.toHaveBeenCalled()
    })
  })
})
