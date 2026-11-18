import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  eventBus,
  FolderViewModeConstants,
  Key,
  OptionsConfig,
  useKeyboardActions,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { enableAutoUnmount } from '@vue/test-utils'
import {
  useKeyboardFileMouseActions,
  useKeyboardFileNavigation
} from '../../../../src/composables/keyboardActions'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useScrollTo: () => ({ scrollToResource: vi.fn() }),
  focusCheckbox: vi.fn()
}))

enableAutoUnmount(afterEach)

const resources = ['1', '2', '3', '4', '5'].map((id) => mock<Resource>({ id, processing: false }))

function renderRows(rows: Resource[]) {
  document.body.innerHTML = `<table><tbody>${rows
    .map(
      ({ id, processing }) =>
        `<tr data-item-id="${id}"${processing ? ' class="oc-table-disabled"' : ''}><td>item ${id}</td></tr>`
    )
    .join('')}</tbody></table>`
}

function shiftClick(index: number, rows = resources) {
  eventBus.publish('app.files.list.clicked.shift', {
    resource: rows[index],
    skipTargetSelection: false
  })
}

function pressKey(key: Key, shiftKey = false) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey }))
}

describe('useKeyboardFileMouseActions', () => {
  beforeEach(() => {
    renderRows(resources)
  })

  describe('shift click', () => {
    it('keeps the anchor fixed on consecutive shift clicks', () => {
      const { store } = getWrapper()
      shiftClick(2)
      shiftClick(4)
      expect([...store.selectedIds].sort()).toEqual(['1', '2', '3', '4', '5'])
      shiftClick(1)
      expect([...store.selectedIds].sort()).toEqual(['1', '2'])
    })
    it.each([
      { anchor: 0, target: 2, keys: [Key.ArrowUp, Key.ArrowDown] },
      { anchor: 2, target: 0, keys: [Key.ArrowDown, Key.ArrowUp] }
    ])(
      'keeps a contiguous range on shift + arrow afterwards (row $anchor to row $target)',
      ({ anchor, target, keys }) => {
        const { store } = getWrapper(anchor)
        shiftClick(target)
        pressKey(keys[0], true)
        expect(store.selectedIds).toHaveLength(2)
        pressKey(keys[1], true)
        expect([...store.selectedIds].sort()).toEqual(['1', '2', '3'])
      }
    )
    it('skips processing rows when shrinking the range with shift + arrow', () => {
      const rows = resources.map((r) => mock<Resource>({ id: r.id, processing: r.id === '2' }))
      renderRows(rows)
      const { store } = getWrapper(3, rows)
      shiftClick(0, rows)
      expect([...store.selectedIds].sort()).toEqual(['1', '3', '4'])
      pressKey(Key.ArrowDown, true)
      pressKey(Key.ArrowDown, true)
      expect(store.selectedIds).toEqual(['4'])
      pressKey(Key.ArrowDown, true)
      expect([...store.selectedIds].sort()).toEqual(['4', '5'])
    })
    it('skips disabled rows when shrinking the range with shift + arrow in embed mode', () => {
      const rows = resources.map((r) =>
        mock<Resource>({
          id: r.id,
          extension: r.id === '2' ? 'md' : 'txt',
          mimeType: 'application/octet-stream',
          isFolder: false,
          isInVault: false,
          processing: false
        })
      )
      document.body.innerHTML = `<table><tbody>${rows
        .map(
          ({ id }) =>
            `<tr data-item-id="${id}"${id === '2' ? ' class="oc-table-disabled"' : ''}><td>item ${id}</td></tr>`
        )
        .join('')}</tbody></table>`
      const { store } = getWrapper(3, rows, { embed: { enabled: true, fileTypes: ['txt'] } })
      shiftClick(0, rows)
      expect([...store.selectedIds].sort()).toEqual(['1', '3', '4'])
      pressKey(Key.ArrowDown, true)
      pressKey(Key.ArrowDown, true)
      expect(store.selectedIds).toEqual(['4'])
      pressKey(Key.ArrowDown, true)
      expect([...store.selectedIds].sort()).toEqual(['4', '5'])
    })
    it('drops an anchor that is no longer selected', () => {
      const { store } = getWrapper()
      shiftClick(2)
      pressKey(Key.ArrowDown)
      shiftClick(4)
      expect([...store.selectedIds].sort()).toEqual(['4', '5'])
    })
    it('moves the anchor to the ctrl clicked row', () => {
      const { store } = getWrapper()
      shiftClick(1)
      eventBus.publish('app.files.list.clicked.meta', resources[3])
      shiftClick(4)
      expect([...store.selectedIds].sort()).toEqual(['4', '5'])
    })
    it('lets shift + arrow start from the clicked row after a ctrl click', () => {
      const { store } = getWrapper()
      shiftClick(2)
      eventBus.publish('app.files.list.clicked.meta', resources[4])
      pressKey(Key.ArrowUp, true)
      expect([...store.selectedIds].sort()).toEqual(['1', '2', '3', '4', '5'])
    })
  })
})

// the config store keeps embed options of earlier tests, so disable embed mode explicitly
function getWrapper(
  anchor = 0,
  rows = resources,
  options: OptionsConfig = { embed: { enabled: false } }
) {
  const { vm } = getComposableWrapper(
    () => {
      const store = useResourcesStore()
      store.setSelection([rows[anchor].id])
      const keyActions = useKeyboardActions({ skipDisabledKeyBindingsCheck: true })
      const viewMode = ref(FolderViewModeConstants.name.table)
      useKeyboardFileNavigation(keyActions, ref(rows), viewMode)
      useKeyboardFileMouseActions(keyActions, viewMode)
      return { store }
    },
    {
      pluginOptions: {
        piniaOptions: {
          stubActions: false,
          resourcesStore: { resources: rows },
          configState: { options }
        }
      }
    }
  )
  return { store: vm.store }
}
