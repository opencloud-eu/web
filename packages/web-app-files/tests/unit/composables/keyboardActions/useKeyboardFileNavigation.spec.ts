import { ref, nextTick } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  Key,
  KeyboardActions,
  useKeyboardActions,
  useResourcesStore,
  FolderViewModeConstants
} from '@opencloud-eu/web-pkg'
import { useKeyboardFileNavigation } from '../../../../src/composables/keyboardActions/useKeyboardFileNavigation'
import { createMockStore, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { enableAutoUnmount } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useScrollTo: () => ({ scrollToResource: vi.fn() }),
  focusCheckbox: vi.fn()
}))

enableAutoUnmount(afterEach)

function createResource(id: string): Resource {
  return mock<Resource>({ id, processing: false })
}

function createKeyActions(): KeyboardActions {
  const actions = ref([])
  return {
    actions,
    selectionCursor: ref(0),
    bindKeyAction: vi.fn((keys, callback, { preventDefault = true } = {}) => {
      const id = `action-${actions.value.length}`
      actions.value.push({
        id,
        ...keys,
        modifier: keys.modifier ?? null,
        callback: (event: KeyboardEvent) => {
          if (preventDefault) {
            event.preventDefault()
          }
          callback(event)
        }
      })
      return id
    }),
    removeKeyAction: vi.fn(),
    resetSelectionCursor: vi.fn()
  } as unknown as KeyboardActions
}

function triggerAction(
  keyActions: KeyboardActions,
  key: string,
  modifier: string | null = null,
  target: EventTarget = document.body
) {
  const action = keyActions.actions.value.find((a) => a.primary === key && a.modifier === modifier)
  const event = mock<KeyboardEvent>({ target })
  action?.callback(event)
  return event
}

describe('useKeyboardFileNavigation', () => {
  it('does not reset selection when navigating to the next file', async () => {
    const resources = [createResource('1'), createResource('2'), createResource('3')]

    createMockStore({
      stubActions: false,
      resourcesStore: { resources }
    })

    const store = useResourcesStore()
    store.addSelection('1')

    const keyActions = createKeyActions()
    const viewMode = ref(FolderViewModeConstants.name.table)

    useKeyboardFileNavigation(keyActions, ref(resources), viewMode)

    const selectionStates: string[][] = []
    store.$subscribe(() => {
      selectionStates.push([...store.selectedIds])
    })

    triggerAction(keyActions, 'ArrowDown')
    await nextTick()
    await nextTick()

    expect(store.selectedIds).toEqual(['2'])
    expect(selectionStates.every((state) => state.length > 0)).toBe(true)
  })

  it('does not reset selection when navigating to the previous file', async () => {
    const resources = [createResource('1'), createResource('2'), createResource('3')]

    createMockStore({
      stubActions: false,
      resourcesStore: { resources }
    })

    const store = useResourcesStore()
    store.addSelection('2')

    const keyActions = createKeyActions()
    const viewMode = ref(FolderViewModeConstants.name.table)

    useKeyboardFileNavigation(keyActions, ref(resources), viewMode)

    const selectionStates: string[][] = []
    store.$subscribe(() => {
      selectionStates.push([...store.selectedIds])
    })

    triggerAction(keyActions, 'ArrowUp')
    await nextTick()
    await nextTick()

    expect(store.selectedIds).toEqual(['1'])
    expect(selectionStates.every((state) => state.length > 0)).toBe(true)
  })

  describe('space', () => {
    function setup() {
      const resources = [createResource('1'), createResource('2')]
      const { vm } = getComposableWrapper(
        () => {
          const store = useResourcesStore()
          store.setSelection(['1', '2'])
          store.setLastSelectedId('2')
          const keyActions = useKeyboardActions()
          useKeyboardFileNavigation(
            keyActions,
            ref(resources),
            ref(FolderViewModeConstants.name.table)
          )
          return { store }
        },
        { pluginOptions: { piniaOptions: { stubActions: false, resourcesStore: { resources } } } }
      )
      return { store: vm.store }
    }

    function pressSpace(target: EventTarget) {
      const event = new KeyboardEvent('keydown', {
        key: Key.Space,
        bubbles: true,
        cancelable: true
      })
      target.dispatchEvent(event)
      return event
    }

    it('toggles the latest selected resource and prevents the default action', () => {
      const { store } = setup()

      const event = pressSpace(document.body)

      expect(event.defaultPrevented).toBe(true)
      expect(store.selectedIds).toEqual(['1'])
    })

    it('does not toggle the latest selected resource if it is not shown', () => {
      const resources = [createResource('1'), createResource('2'), createResource('3')]
      createMockStore({ stubActions: false, resourcesStore: { resources } })
      const store = useResourcesStore()
      store.setLastSelectedId('1')

      const keyActions = createKeyActions()
      // another page is shown, without the latest selected resource
      useKeyboardFileNavigation(
        keyActions,
        ref(resources.slice(1)),
        ref(FolderViewModeConstants.name.table)
      )

      triggerAction(keyActions, ' ')

      expect(store.selectedIds).toEqual([])
    })

    it('leaves a focused checkbox to toggle its own resource', () => {
      const { store } = setup()

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      document.body.appendChild(checkbox)
      const event = pressSpace(checkbox)
      checkbox.remove()

      expect(event.defaultPrevented).toBe(false)
      expect(store.selectedIds).toEqual(['1', '2'])
    })
  })

  describe('without a selected resource', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<div id="tiles-view"><ul>' +
        ['1', '2', '3'].map((id) => `<li><div data-item-id="${id}"></div></li>`).join('') +
        '</ul></div>'
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it.each(['ArrowUp', 'ArrowDown'])('does nothing on Shift+%s in tiles view', async (key) => {
      const resources = [createResource('1'), createResource('2'), createResource('3')]
      createMockStore({ stubActions: false, resourcesStore: { resources } })
      const store = useResourcesStore()

      const keyActions = createKeyActions()
      useKeyboardFileNavigation(keyActions, ref(resources), ref(FolderViewModeConstants.name.tiles))
      await nextTick()

      expect(() => triggerAction(keyActions, key, 'Shift')).not.toThrow()
      expect(store.selectedIds).toEqual([])
    })

    it('does not add an empty selection on Space', () => {
      const resources = [createResource('1'), createResource('2')]
      createMockStore({ stubActions: false, resourcesStore: { resources } })
      const store = useResourcesStore()

      const keyActions = createKeyActions()
      useKeyboardFileNavigation(keyActions, ref(resources), ref(FolderViewModeConstants.name.table))

      triggerAction(keyActions, ' ')

      expect(store.selectedIds).toEqual([])
    })
  })
})
