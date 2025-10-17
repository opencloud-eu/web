import { useResourcesViewDefaults } from '../../src/composables'
import { computed, readonly, ref } from 'vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Task } from 'vue-concurrency'
import { SpaceResource } from '@opencloud-eu/web-client'
import { FolderView, ResourceTable } from '@opencloud-eu/web-pkg'

export const useResourcesViewDefaultsMock = (
  options: Partial<ReturnType<typeof useResourcesViewDefaults>> = {}
): ReturnType<typeof useResourcesViewDefaults<any, any, any>> => {
  const folderView = {
    name: 'resource-table',
    label: 'Switch to default view',
    icon: {
      name: 'menu-line',
      fillType: 'none'
    },
    component: ResourceTable
  } satisfies FolderView

  return {
    fileListHeaderY: ref(0),
    refreshFileListHeaderPosition: vi.fn(),
    loadResourcesTask: mockDeep<Task<any, any>>({
      isRunning: false
    }),
    areResourcesLoading: ref(false),
    storeItems: ref([]),
    sortFields: ref([]),
    paginatedResources: ref([]),
    paginationPages: readonly(ref(0)),
    paginationPage: readonly(ref(0)),
    handleSort: vi.fn(),
    sortBy: readonly(ref('name')),
    sortDir: undefined,
    selectedResources: ref([]),
    selectedResourcesIds: ref([]),
    selectedResourceSpace: ref(mock<SpaceResource>()),
    isResourceInSelection: vi.fn(() => false),
    isSideBarOpen: ref(false),
    sideBarActivePanel: ref(''),
    scrollToResource: vi.fn(),
    scrollToResourceFromRoute: vi.fn(),
    viewMode: ref('resource-table'),
    viewSize: ref(1),
    viewModes: computed(() => [folderView]),
    folderView: computed(() => folderView),
    folderViewStyle: ref({}),
    ...options
  }
}
