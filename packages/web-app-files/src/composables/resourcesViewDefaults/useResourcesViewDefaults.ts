import { nextTick, computed, unref, Ref } from 'vue'
import { fileList } from '../../helpers/ui'
import {
  usePagination,
  useSort,
  SortField,
  useResourcesStore,
  folderService,
  useExtensionRegistry,
  ExtensionPoint,
  FolderViewExtension,
  FolderView
} from '@opencloud-eu/web-pkg'
import { queryItemAsString, useRouteQuery } from '@opencloud-eu/web-pkg'
import {
  determineResourceTableSortFields,
  determineResourceTilesSortFields,
  translateSortFields
} from '@opencloud-eu/web-pkg'
import { Task } from 'vue-concurrency'
import { isIncomingShareResource, Resource } from '@opencloud-eu/web-client'
import { useSelectedResources, SelectedResourcesResult } from '@opencloud-eu/web-pkg'
import { ReadOnlyRef } from '@opencloud-eu/web-pkg'
import {
  useFileListHeaderPosition,
  useViewMode,
  useViewSize,
  FolderViewModeConstants
} from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { ScrollToResult, useScrollTo } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

interface ResourcesViewDefaultsOptions<T, U extends any[], R extends Resource = Resource> {
  folderViewExtensionPoint: ExtensionPoint<FolderViewExtension>
  loadResourcesTask?: Task<T, U>
  /**
   * Narrows down the resources (e.g. via search or filters) before they get sorted and paginated.
   */
  filterResources?: (resources: R[]) => R[]
}

type ResourcesViewDefaultsResult<T extends Resource, TT, TU extends any[]> = {
  fileListHeaderY: Ref<number>
  refreshFileListHeaderPosition(): void
  loadResourcesTask: Task<TT, TU>
  areResourcesLoading: ReadOnlyRef<boolean>
  storeItems: ReadOnlyRef<T[]>
  sortFields: ReadOnlyRef<SortField[]>
  sortedResources: Ref<T[]>
  paginatedResources: Ref<T[]>
  paginationPages: ReadOnlyRef<number>
  paginationPage: ReadOnlyRef<number>
  handleSort({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }): void
  sortBy: ReadOnlyRef<string>
  sortDir: ReadOnlyRef<SortDir>
  viewMode: ReadOnlyRef<string>
  viewModes: ReadOnlyRef<FolderView[]>
  folderView: ReadOnlyRef<FolderView | undefined>
  viewSize: ReadOnlyRef<number>
  selectedResources: Ref<Resource[]>
  selectedResourcesIds: Ref<string[]>
  isResourceInSelection(resource: Resource): boolean
} & SelectedResourcesResult &
  ScrollToResult

export const useResourcesViewDefaults = <T extends Resource, TT, TU extends any[]>(
  options: ResourcesViewDefaultsOptions<TT, TU, T>
): ResourcesViewDefaultsResult<T, TT, TU> => {
  const loadResourcesTask = options.loadResourcesTask || folderService.getTask()
  const areResourcesLoading = computed(() => {
    return loadResourcesTask.isRunning || !loadResourcesTask.last
  })

  const language = useGettext()
  const resourcesStore = useResourcesStore()
  const extensionRegistry = useExtensionRegistry()
  const storeItems = computed(() => resourcesStore.activeResources) as unknown as Ref<T[]>

  const { refresh: refreshFileListHeaderPosition, y: fileListHeaderY } = useFileListHeaderPosition()

  const currentViewModeQuery = useRouteQuery(
    FolderViewModeConstants.queryName,
    FolderViewModeConstants.defaultModeName
  )
  const currentViewMode = computed((): string => queryItemAsString(currentViewModeQuery.value))
  const viewMode = useViewMode(currentViewMode)

  const currentTilesSizeQuery = useRouteQuery('tiles-size', '1')
  const currentTilesSize = computed((): string => String(currentTilesSizeQuery.value))
  const viewSize = useViewSize(currentTilesSize)

  const viewModes = computed(() => {
    return [
      ...extensionRegistry
        .requestExtensions(options.folderViewExtensionPoint)
        .map((e) => e.folderView)
    ]
  })

  const folderView = computed(() => {
    return unref(viewModes).find((v) => v.name === unref(viewMode)) || unref(viewModes)[0]
  })

  const sortFields = computed((): SortField[] => {
    if (unref(viewMode) === FolderViewModeConstants.name.tiles) {
      return translateSortFields(determineResourceTilesSortFields(unref(storeItems)[0]), language)
    }
    return determineResourceTableSortFields(unref(storeItems)[0])
  })

  const filteredItems = computed(() => {
    if (!options.filterResources) {
      return unref(storeItems)
    }
    return options.filterResources(unref(storeItems))
  })

  const { sortBy, sortDir, items, handleSort } = useSort<T>({
    items: filteredItems,
    fields: sortFields,
    foldersFirst: computed(() => resourcesStore.areFoldersSortedFirst)
  })
  const {
    items: paginatedResources,
    total: paginationPages,
    page: paginationPage
  } = usePagination<T>({ items, perPageStoragePrefix: 'files' })

  const scrollToParam = useRouteQuery('scrollTo')
  function resetScrollToParam() {
    scrollToParam.value = undefined
  }

  function isScrollToResourceSelected() {
    const scrollTo = queryItemAsString(unref(scrollToParam))
    if (resourcesStore.selectedIds.includes(scrollTo)) {
      return true
    }
    // incoming shares are referenced by their remote item id
    return resourcesStore.selectedResources.some(
      (r) => isIncomingShareResource(r) && r.remoteItemId === scrollTo
    )
  }

  resourcesStore.$onAction((action) => {
    const hadSelection = resourcesStore.selectedIds.length > 0
    action.after(async () => {
      switch (action.name) {
        case 'upsertResource':
          await nextTick()
          fileList.accentuateItem(action.args[0].id)
          break
        case 'upsertResources':
          await nextTick()
          for (const resource of action.args[0]) {
            fileList.accentuateItem(resource.id)
          }
          break
        case 'toggleSelection':
          if (!resourcesStore.selectedIds.includes(action.args[0]) && unref(scrollToParam)) {
            // resource got deselected
            resetScrollToParam()
          }
          break
        case 'resetSelection':
          // an empty selection (e.g. right after navigating to a route with scrollTo) has nothing
          // to do with the scrollTo param, it must not be stripped then
          if (hadSelection && unref(scrollToParam)) {
            resetScrollToParam()
          }
          break
        case 'removeSelection':
          if (hadSelection && !resourcesStore.selectedIds.length && unref(scrollToParam)) {
            resetScrollToParam()
          }
          break
        case 'setSelection':
          if (unref(scrollToParam) && !isScrollToResourceSelected()) {
            // selection reset or replaced by other resources
            resetScrollToParam()
          }
          break
      }
    })
  })

  return {
    fileListHeaderY,
    refreshFileListHeaderPosition,
    loadResourcesTask,
    areResourcesLoading,
    storeItems,
    sortFields,
    sortedResources: items,
    viewMode,
    viewSize,
    viewModes,
    folderView,
    paginatedResources,
    paginationPages,
    paginationPage,
    handleSort,
    sortBy,
    sortDir,
    ...useSelectedResources(),
    ...useScrollTo()
  }
}
