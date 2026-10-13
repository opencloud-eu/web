import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Key, KeyboardActions, Modifier } from '@opencloud-eu/web-pkg'
import { Item } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useKeyboardTableNavigation } from '../../../../src/composables/keyboardActions'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useScrollTo: vi.fn(() => ({ scrollToResource: vi.fn() })),
  focusCheckbox: vi.fn()
}))

const items: Item[] = [{ id: '1' }, { id: '2' }, { id: '3' }] as Item[]

describe('useKeyboardTableNavigation', () => {
  describe('space', () => {
    it('does not change the selection without a last selected row', () => {
      const { selectedRows, triggerKey } = getWrapper({ lastSelectedRowId: null })
      triggerKey(Key.Space)
      expect(selectedRows.value).toEqual([])
    })
    it('toggles the last selected row', () => {
      const { selectedRows, triggerKey } = getWrapper({ lastSelectedRowId: '2' })
      triggerKey(Key.Space)
      expect(selectedRows.value.map(({ id }) => id)).toEqual(['2'])
    })
    it('prevents the default action when the focus is not on a checkbox', () => {
      const { triggerKey } = getWrapper({ lastSelectedRowId: '2' })
      const event = triggerKey(Key.Space)
      expect(event.preventDefault).toHaveBeenCalled()
    })
    it('leaves a focused checkbox to toggle its own row', () => {
      const { selectedRows, triggerKey } = getWrapper({ lastSelectedRowId: '2' })
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      const event = triggerKey(Key.Space, undefined, checkbox)
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(selectedRows.value).toEqual([])
    })
  })
  describe('shift + arrow', () => {
    it('does not add already selected rows again', () => {
      const { selectedRows, triggerKey } = getWrapper({
        selectedRows: [...items],
        lastSelectedRowId: '3'
      })
      triggerKey(Key.ArrowUp, Modifier.Shift)
      expect(selectedRows.value.map(({ id }) => id)).toEqual(['1', '2', '3'])
    })
    it('adds the next row to the selection', () => {
      const { selectedRows, triggerKey } = getWrapper({
        selectedRows: [items[0]],
        lastSelectedRowId: '1'
      })
      triggerKey(Key.ArrowDown, Modifier.Shift)
      expect(selectedRows.value.map(({ id }) => id)).toEqual(['1', '2'])
    })
  })
})

function getWrapper({
  selectedRows = [],
  lastSelectedRowId
}: {
  selectedRows?: Item[]
  lastSelectedRowId: string | null
}) {
  const selectedRowsRef = ref<Item[]>(selectedRows)
  const callbacks: Record<string, (event: KeyboardEvent) => void> = {}
  const keyActions = mock<KeyboardActions>({
    selectionCursor: ref(0),
    bindKeyAction: (keys, callback, { preventDefault = true } = {}) => {
      callbacks[`${keys.modifier || ''}${keys.primary}`] = (event) => {
        if (preventDefault) {
          event.preventDefault()
        }
        callback(event)
      }
      return ''
    }
  })
  const wrapper = getComposableWrapper(() => {
    useKeyboardTableNavigation(keyActions, ref(items), selectedRowsRef, ref(lastSelectedRowId))
  })
  return {
    wrapper,
    selectedRows: selectedRowsRef,
    triggerKey: (primary: Key, modifier?: Modifier, target: EventTarget = document.body) => {
      const event = mock<KeyboardEvent>({ target })
      callbacks[`${modifier || ''}${primary}`](event)
      return event
    }
  }
}
