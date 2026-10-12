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
  })
})

function getWrapper({ lastSelectedRowId }: { lastSelectedRowId: string | null }) {
  const selectedRows = ref<Item[]>([])
  const callbacks: Record<string, (event?: KeyboardEvent) => void> = {}
  const keyActions = mock<KeyboardActions>({
    selectionCursor: ref(0),
    bindKeyAction: (keys, callback) => {
      callbacks[`${keys.modifier || ''}${keys.primary}`] = callback
      return ''
    }
  })
  const wrapper = getComposableWrapper(() => {
    useKeyboardTableNavigation(keyActions, ref(items), selectedRows, ref(lastSelectedRowId))
  })
  return {
    wrapper,
    selectedRows,
    triggerKey: (primary: Key, modifier?: Modifier) => callbacks[`${modifier || ''}${primary}`]()
  }
}
