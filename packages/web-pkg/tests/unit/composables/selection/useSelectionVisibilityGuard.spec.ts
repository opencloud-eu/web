import { effectScope, nextTick, ref } from 'vue'
import { useSelectionVisibilityGuard } from '../../../../src/composables/selection'

describe('useSelectionVisibilityGuard', () => {
  function setup({ visibleIds, selectedIds }: { visibleIds: string[]; selectedIds: string[] }) {
    const visible = ref(visibleIds)
    const selected = ref(selectedIds)
    const deselect = vi.fn((ids: string[]) => {
      selected.value = selected.value.filter((id) => !ids.includes(id))
    })
    const scope = effectScope()
    scope.run(() =>
      useSelectionVisibilityGuard({ visibleIds: visible, selectedIds: selected, deselect })
    )
    onTestFinished(() => scope.stop())
    return { visible, selected, deselect }
  }

  it('deselects selected items that leave the view', async () => {
    const { visible, selected } = setup({ visibleIds: ['1', '2', '3'], selectedIds: ['1', '3'] })

    visible.value = ['3', '4', '5']
    await nextTick()

    expect(selected.value).toEqual(['3'])
  })
  it('keeps selected items that have not been visible yet', async () => {
    const { visible, selected, deselect } = setup({
      visibleIds: ['1', '2'],
      selectedIds: ['4']
    })

    visible.value = ['3', '4']
    await nextTick()

    expect(deselect).not.toHaveBeenCalled()
    expect(selected.value).toEqual(['4'])
  })
  it('does nothing if no selected item leaves the view', async () => {
    const { visible, deselect } = setup({ visibleIds: ['1', '2'], selectedIds: ['2'] })

    visible.value = ['2', '3']
    await nextTick()

    expect(deselect).not.toHaveBeenCalled()
  })
  it('accepts getters', async () => {
    const visible = ref([{ id: '1' }, { id: '2' }])
    const selected = ref([{ id: '1' }, { id: '2' }])
    const scope = effectScope()
    scope.run(() =>
      useSelectionVisibilityGuard({
        visibleIds: () => visible.value.map(({ id }) => id),
        selectedIds: () => selected.value.map(({ id }) => id),
        deselect: (ids) => {
          selected.value = selected.value.filter(({ id }) => !ids.includes(id))
        }
      })
    )
    onTestFinished(() => scope.stop())

    visible.value = [{ id: '2' }]
    await nextTick()

    expect(selected.value).toEqual([{ id: '2' }])
  })
})
