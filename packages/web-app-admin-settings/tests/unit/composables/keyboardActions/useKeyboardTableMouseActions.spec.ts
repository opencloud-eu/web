import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { eventBus, KeyboardActions } from '@opencloud-eu/web-pkg'
import { Item } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useKeyboardTableMouseActions } from '../../../../src/composables/keyboardActions'

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
      eventBus.publish('app.files.list.clicked.shift', {
        resource: items[2],
        skipTargetSelection: false
      })
      expect(selectedRows.value.map(({ id }) => id)).toEqual(['1', '2', '3'])
    })
  })
})

function getWrapper() {
  const selectedRows = ref<Item[]>([items[0]])
  const wrapper = getComposableWrapper(() => {
    useKeyboardTableMouseActions(mock<KeyboardActions>(), ref(items), selectedRows, ref('1'))
  })
  return { wrapper, selectedRows }
}
