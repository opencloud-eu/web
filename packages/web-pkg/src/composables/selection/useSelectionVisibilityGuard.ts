import { MaybeRefOrGetter, toValue, watch } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useResourcesStore } from '../piniaStores'

/**
 * Keeps a selection in line with the visible rows: selected items that leave the view (page change,
 * sorting, filtering, ...) get deselected, so actions on the selection never hit rows the user can't see.
 *
 * Only items that were visible and disappeared are deselected. Items that are selected before they
 * show up (e.g. via the `scrollTo` param, which switches to the right page afterwards) stay selected.
 */
export function useSelectionVisibilityGuard({
  visibleIds,
  selectedIds,
  deselect
}: {
  visibleIds: MaybeRefOrGetter<string[]>
  selectedIds: MaybeRefOrGetter<string[]>
  deselect: (ids: string[]) => void
}) {
  watch(
    () => toValue(visibleIds),
    (ids, previousIds) => {
      const selected = toValue(selectedIds)
      if (!selected.length || !previousIds?.length) {
        return
      }

      const visible = new Set(ids)
      const previouslyVisible = new Set(previousIds)
      const hiddenIds = selected.filter((id) => previouslyVisible.has(id) && !visible.has(id))
      if (!hiddenIds.length) {
        return
      }

      deselect(hiddenIds)
    }
  )
}

/**
 * Applies `useSelectionVisibilityGuard` to the selection of the resources store.
 *
 * Views use it for the list they render, because the folder view (and its own guard) gets replaced
 * by a "no content" message when e.g. a filter hides every resource.
 */
export function useResourcesSelectionVisibilityGuard(resources: MaybeRefOrGetter<Resource[]>) {
  const resourcesStore = useResourcesStore()

  useSelectionVisibilityGuard({
    visibleIds: () => (toValue(resources) || []).map(({ id }) => id),
    selectedIds: () => resourcesStore.selectedIds,
    deselect: (ids) => resourcesStore.deselectResources(ids)
  })
}
