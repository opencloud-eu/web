import { nextTick, computed, unref, Ref } from 'vue'
import { fileList } from '../../helpers/ui'
import {
  usePagination,
  useSort,
  SortDir,
  SortField,
  useResourcesStore,
  folderService,
  useExtensionRegistry,
  ExtensionPoint,
  FolderViewExtension,
  FolderView
} from '@opencloud-eu/web-pkg'
import { useSideBar } from '@opencloud-eu/web-pkg'
import { queryItemAsString, useRouteQuery } from '@opencloud-eu/web-pkg'
import {
  determineResourceTableSortFields,
  determineResourceTilesSortFields,
  translateSortFields
} from '@opencloud-eu/web-pkg'
import { Task } from 'vue-concurrency'
import { Resource } from '@opencloud-eu/web-client'
import { useSelectedResources, SelectedResourcesResult } from '@opencloud-eu/web-pkg'
import { ReadOnlyRef } from '@opencloud-eu/web-pkg'
import {
  useFileListHeaderPosition,
  useViewMode,
  useViewSize,
  FolderViewModeConstants
} from '@opencloud-eu/web-pkg'

import { ScrollToResult, useScrollTo } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

interface ResourcesViewDefaultsOptions<T, U extends any[]> {
  folderViewExtensionPoint: ExtensionPoint<FolderViewExtension>
  loadResourcesTask?: Task<T, U>
}

type ResourcesViewDefaultsResult<T extends Resource, TT, TU extends any[]> = {
  fileListHeaderY: Ref<number>
  refreshFileListHeaderPosition(): void
  loadResourcesTask: Task<TT, TU>
  areResourcesLoading: ReadOnlyRef<boolean>
  storeItems: ReadOnlyRef<T[]>
  sortFields: ReadOnlyRef<SortField[]>
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

  isSideBarOpen: Ref<boolean>
  sideBarActivePanel: Ref<string>
} & SelectedResourcesResult &
  ScrollToResult

export const useResourcesViewDefaults = <T extends Resource, TT, TU extends any[]>(
  options: ResourcesViewDefaultsOptions<TT, TU>
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

  const { sortBy, sortDir, items, handleSort } = useSort<T>({
    items: storeItems,
    fields: sortFields
  })
  const {
    items: paginatedResources,
    total: paginationPages,
    page: paginationPage
  } = usePagination<T>({ items, perPageStoragePrefix: 'files' })

  const accentuateItem = async (id: string) => {
    await nextTick()
    fileList.accentuateItem(id)
  }
  resourcesStore.$onAction((action) => {
    if (action.name === 'upsertResource') {
      accentuateItem(action.args[0].id)
    }
  })

  return {
    fileListHeaderY,
    refreshFileListHeaderPosition,
    loadResourcesTask,
    areResourcesLoading,
    storeItems,
    sortFields,
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
    ...useSideBar(),
    ...useScrollTo()
  }
}
