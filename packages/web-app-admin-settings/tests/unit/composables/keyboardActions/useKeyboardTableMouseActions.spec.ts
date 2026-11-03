import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { eventBus, Key, KeyboardActions, Modifier } from '@opencloud-eu/web-pkg'
import { Item } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { enableAutoUnmount } from '@vue/test-utils'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation
} from '../../../../src/composables/keyboardActions'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useScrollTo: vi.fn(() => ({ scrollToResource: vi.fn() })),
  focusCheckbox: vi.fn()
}))

enableAutoUnmount(afterEach)

const items: Item[] = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }] as Item[]

function shiftClick(index: number) {
  eventBus.publish('app.admin-settings.list.clicked.shift', { resource: items[index] })
}

describe('useKeyboardTableMouseActions', () => {
  describe('shift click', () => {
    it('selects the range between the last selected and the clicked row', () => {
      const { selectedIds } = getWrapper()
      shiftClick(2)
      expect(selectedIds()).toEqual(['1', '2', '3'])
    })
    it('keeps the anchor fixed on consecutive shift clicks', () => {
      const { selectedIds } = getWrapper()
      shiftClick(2)
      shiftClick(4)
      expect(selectedIds()).toEqual(['1', '2', '3', '4', '5'])
      shiftClick(1)
      expect(selectedIds()).toEqual(['1', '2'])
    })
    it('replaces the existing selection with the range', () => {
      const { selectedIds, selectedRows } = getWrapper(2)
      selectedRows.value.push(items[4])
      shiftClick(0)
      expect(selectedIds()).toEqual(['1', '2', '3'])
    })
    it('uses the first row as anchor if the last selected row is unknown', () => {
      const { selectedIds, selectedRows, lastSelectedRowId } = getWrapper(1)
      selectedRows.value = [items[1], items[3]]
      lastSelectedRowId.value = null
      shiftClick(2)
      expect(selectedIds()).toEqual(['1', '2', '3'])
    })
    it('uses the clicked row as anchor if nothing is selected', () => {
      const { selectedIds, selectedRows } = getWrapper()
      selectedRows.value = []
      shiftClick(2)
      expect(selectedIds()).toEqual(['3'])
    })
    it('starts the range at the row passed to setSelectionStart', () => {
      const { selectedIds, selectedRows, setSelectionStart } = getWrapper()
      shiftClick(2)
      selectedRows.value.push(items[3])
      setSelectionStart(items[3])
      shiftClick(4)
      expect(selectedIds()).toEqual(['4', '5'])
    })
    it('moves the anchor to the ctrl clicked row', () => {
      const { selectedIds } = getWrapper()
      shiftClick(1)
      eventBus.publish('app.admin-settings.list.clicked.meta', items[3])
      shiftClick(4)
      expect(selectedIds()).toEqual(['4', '5'])
    })
    it.each([
      { anchor: 0, target: 2, keys: [Key.ArrowUp, Key.ArrowDown] },
      { anchor: 2, target: 0, keys: [Key.ArrowDown, Key.ArrowUp] }
    ])(
      'keeps a contiguous range on shift + arrow afterwards (row $anchor to row $target)',
      ({ anchor, target, keys }) => {
        const { selectedIds, triggerKey } = getWrapper(anchor)
        shiftClick(target)
        keys.forEach((key) => triggerKey(key, Modifier.Shift))
        expect(selectedIds().sort()).toEqual(['1', '2', '3'])
      }
    )
  })
})

function getWrapper(anchor = 0) {
  const selectedRows = ref<Item[]>([items[anchor]])
  const lastSelectedRowId = ref(items[anchor].id)
  const callbacks: Record<string, (event?: KeyboardEvent) => void> = {}
  const selectionCursor = ref(0)
  const keyActions = mock<KeyboardActions>({
    selectionCursor,
    resetSelectionCursor: () => {
      selectionCursor.value = 0
    },
    bindKeyAction: (keys, callback) => {
      callbacks[`${keys.modifier || ''}${keys.primary}`] = callback
      return ''
    }
  })
  let mouseActions: ReturnType<typeof useKeyboardTableMouseActions>
  const wrapper = getComposableWrapper(() => {
    mouseActions = useKeyboardTableMouseActions(
      keyActions,
      ref(items),
      selectedRows,
      lastSelectedRowId
    )
    useKeyboardTableNavigation(keyActions, ref(items), selectedRows, lastSelectedRowId)
  })
  return {
    wrapper,
    ...mouseActions,
    selectedRows,
    lastSelectedRowId,
    selectedIds: () => selectedRows.value.map(({ id }) => id),
    triggerKey: (primary: Key, modifier?: Modifier) => callbacks[`${modifier || ''}${primary}`]()
  }
}
