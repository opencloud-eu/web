import { nextTick, computed, unref, Ref, watch, MaybeRef, MaybeRefOrGetter } from 'vue'
import { fileList } from '../../helpers/ui'
import {
  usePagination,
  useInfiniteScroll,
  useSort,
  SortField,
  PaginationConstants,
  useResourcesStore,
  folderService,
  useExtensionRegistry,
  ExtensionPoint,
  FolderViewExtension,
  FolderView,
  useRouter,
  useIsInfiniteScrollEnabled
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
  /**
   * Sort fields for all view modes, instead of the ones determined from the resources.
   */
  sortFields?: SortField[]
  /**
   * Resources matching this predicate get sorted before the rest, regardless of the sort direction.
   * When folders are sorted first, this applies within the folder and the file group.
   */
  pinFirst?: (resource: R) => boolean
  /**
   * Resets the rendered items in infinite scroll mode to one chunk whenever this value
   * changes, e.g. when the view component is reused to render another folder.
   */
  infiniteScrollResetKey?: MaybeRef<unknown>
  /**
   * Resets the rendered items in infinite scroll mode to one chunk whenever any of
   * these values change, e.g. when a filter within the view changes.
   */
  infiniteScrollResetOn?: MaybeRef<Array<MaybeRefOrGetter<unknown>>>
}

type ResourcesViewDefaultsResult<T extends Resource, TT, TU extends any[]> = {
  fileListHeaderY: Ref<number>
  refreshFileListHeaderPosition(): void
  loadResourcesTask: Task<TT, TU>
  loadResources(...args: TU): Promise<void>
  areResourcesLoading: ReadOnlyRef<boolean>
  storeItems: ReadOnlyRef<T[]>
  sortFields: ReadOnlyRef<SortField[]>
  sortedResources: Ref<T[]>
  paginatedResources: Ref<T[]>
  paginationPages: ReadOnlyRef<number>
  paginationPage: ReadOnlyRef<number>
  /** Whether the items per page selector is set to infinite scrolling. */
  isInfiniteScrollEnabled: ReadOnlyRef<boolean>
  /** Whether the complete list is rendered already (infinite scroll mode only). */
  allLoaded: ReadOnlyRef<boolean>
  /** Appends the next item chunk to the rendered items (infinite scroll mode only). */
  loadMore(): void
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

  async function loadResources(...args: TU) {
    try {
      await loadResourcesTask.perform(...args)
    } catch (e) {
      // a newer load or leaving the view cancels the running load
      if (e !== 'cancel') {
        throw e
      }
    }
  }

  const language = useGettext()
  const resourcesStore = useResourcesStore()
  const extensionRegistry = useExtensionRegistry()
  const storeItems = computed(() => resourcesStore.activeResources) as unknown as Ref<T[]>

  const { refresh: refreshFileListHeaderPosition, y: fileListHeaderY } = useFileListHeaderPosition()

  const viewMode = useViewMode()
  const viewSize = useViewSize()

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
    if (options.sortFields) {
      return options.sortFields
    }
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
    foldersFirst: computed(() => resourcesStore.areFoldersSortedFirst),
    pinFirst: options.pinFirst
  })
  const router = useRouter()
  const isInfiniteScrollEnabled = useIsInfiniteScrollEnabled()

  const {
    items: legacyPaginatedItems,
    total: paginationPages,
    page: paginationPage,
    perPage: legacyPerPage
  } = usePagination<T>({
    items,
    enabled: computed(() => !unref(isInfiniteScrollEnabled))
  })

  const {
    items: infiniteScrollItems,
    renderedCount,
    total: infiniteScrollTotal,
    allLoaded,
    loadMore
  } = useInfiniteScroll<T>({
    items,
    enabled: isInfiniteScrollEnabled,
    resetKey: options.infiniteScrollResetKey,
    resetOn: options.infiniteScrollResetOn
  })

  const paginatedResources = computed(() =>
    unref(isInfiniteScrollEnabled) ? unref(infiniteScrollItems) : unref(legacyPaginatedItems)
  )

  // routing all page writes through the same hook keeps them serialized
  const pageQuery = useRouteQuery('page')

  /**
   * The number of items a legacy `?page=N` deep link asked for. The list can still
   * be empty when the link is opened, so the target is kept as the number of items
   * and applied once resources are available, instead of being clamped to the
   * current total right away.
   */
  let pendingLegacyPageCount: number | null = null

  const clearPageQuery = () => {
    if (queryItemAsString(unref(router.currentRoute).query.page)) {
      pageQuery.value = undefined
    }
  }

  /**
   * A page query belongs to the folder route it was created for. When the view is
   * reused for another folder, a carried-over param must not be treated as a
   * legacy deep link for the new folder.
   */
  const folderRouteKey = computed(() => {
    const route = unref(router.currentRoute)
    return `${route.path}|${queryItemAsString(route.query.fileId) || ''}`
  })
  watch(folderRouteKey, () => {
    pendingLegacyPageCount = null
    if (unref(isInfiniteScrollEnabled)) {
      clearPageQuery()
    }
  })

  watch(
    isInfiniteScrollEnabled,
    (isInfiniteScroll, wasInfiniteScroll) => {
      if (isInfiniteScroll) {
        const page = parseInt(queryItemAsString(unref(router.currentRoute).query.page)) || 1

        if (wasInfiniteScroll === undefined) {
          // legacy deep links that carry ?page=N still point to the resource the user
          // wants to see: retain how many items they refer to and strip the param,
          // which has no meaning in infinite scroll mode
          if (page > 1) {
            pendingLegacyPageCount = page * PaginationConstants.infiniteScrollChunk
          }
        } else if (!wasInfiniteScroll) {
          // handing over from numbered pagination: keep rendering everything the user
          // had already scrolled to, then strip the no longer relevant page param
          renderedCount.value = Math.max(unref(renderedCount), page * unref(legacyPerPage))
          pendingLegacyPageCount = null
        }

        clearPageQuery()
        return
      }

      if (wasInfiniteScroll) {
        // handing over to numbered pagination: write back the equivalent last-viewed
        // page (ceil keeps the last viewed chunk visible instead of an empty boundary)
        pendingLegacyPageCount = null
        const page = Math.max(1, Math.ceil(unref(renderedCount) / unref(legacyPerPage)))
        pageQuery.value = String(page)
      }
    },
    { immediate: true }
  )

  watch(
    () => unref(infiniteScrollTotal),
    (total) => {
      if (pendingLegacyPageCount === null || total <= 0) {
        return
      }
      // the rendered count may only grow, so an earlier mode switch is not undone
      renderedCount.value = Math.max(unref(renderedCount), pendingLegacyPageCount)
      pendingLegacyPageCount = null
    },
    {
      // post flush so that a resetKey that is initialized together with the resources
      // (e.g. the current folder) resets first, before the legacy target is applied
      immediate: true,
      flush: 'post'
    }
  )

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
        case 'removeResources':
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
    loadResources,
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
    isInfiniteScrollEnabled,
    allLoaded,
    loadMore,
    handleSort,
    sortBy,
    sortDir,
    ...useSelectedResources(),
    ...useScrollTo()
  }
}
