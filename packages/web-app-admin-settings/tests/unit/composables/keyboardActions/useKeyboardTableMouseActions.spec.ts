import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { eventBus, Key, KeyboardActions, Modifier } from '@opencloud-eu/web-pkg'
import { Item } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation
} from '../../../../src/composables/keyboardActions'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useScrollTo: vi.fn(() => ({ scrollToResource: vi.fn() })),
  focusCheckbox: vi.fn()
}))

const items: Item[] = [{ id: '1' }, { id: '2' }, { id: '3' }] as Item[]

describe('useKeyboardTableMouseActions', () => {
  beforeEach(() => {
    document.body.innerHTML = `<table><tbody>${items
      .map(({ id }) => `<tr data-item-id="${id}"><td>item ${id}</td></tr>`)
      .join('')}</tbody></table>`
  })

  describe('shift click', () => {
    it('selects the range between the last selected and the clicked row', () => {
      const { selectedRows } = getWrapper()
      eventBus.publish('app.admin-settings.list.clicked.shift', {
        resource: items[2]
      })
      expect(selectedRows.value.map(({ id }) => id)).toEqual(['1', '2', '3'])
    })
    it.each([
      { anchor: 0, target: 2, keys: [Key.ArrowUp, Key.ArrowDown] },
      { anchor: 2, target: 0, keys: [Key.ArrowDown, Key.ArrowUp] }
    ])(
      'keeps a contiguous range on shift + arrow afterwards (row $anchor to row $target)',
      ({ anchor, target, keys }) => {
        const { selectedRows, triggerKey } = getWrapper(anchor)
        eventBus.publish('app.admin-settings.list.clicked.shift', {
          resource: items[target]
        })
        keys.forEach((key) => triggerKey(key, Modifier.Shift))
        expect(selectedRows.value.map(({ id }) => id).sort()).toEqual(['1', '2', '3'])
      }
    )
  })
})

function getWrapper(anchor = 0) {
  const selectedRows = ref<Item[]>([items[anchor]])
  const lastSelectedRowId = ref(items[anchor].id)
  const callbacks: Record<string, (event?: KeyboardEvent) => void> = {}
  const keyActions = mock<KeyboardActions>({
    selectionCursor: ref(0),
    bindKeyAction: (keys, callback) => {
      callbacks[`${keys.modifier || ''}${keys.primary}`] = callback
      return ''
    }
  })
  const wrapper = getComposableWrapper(() => {
    useKeyboardTableMouseActions(keyActions, ref(items), selectedRows, lastSelectedRowId)
    useKeyboardTableNavigation(keyActions, ref(items), selectedRows, lastSelectedRowId)
  })
  return {
    wrapper,
    selectedRows,
    triggerKey: (primary: Key, modifier?: Modifier) => callbacks[`${modifier || ''}${primary}`]()
  }
}
