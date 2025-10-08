import SharedViaLink from '../../../../src/views/shares/SharedViaLink.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { ref } from 'vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { OutgoingShareResource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { ResourceTable, useExtensionRegistry, FolderViewExtension } from '@opencloud-eu/web-pkg'
import {
  folderViewsFavoritesExtensionPoint,
  folderViewsFolderExtensionPoint,
  folderViewsProjectSpacesExtensionPoint,
  folderViewsSharedViaLink,
  folderViewsTrashOverviewExtensionPoint
} from '../../../../src/extensionPoints'

vi.mock('../../../../src/composables')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn()
}))

describe('SharedViaLink view', () => {
  it('appBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('app-bar-stub').exists()).toBeTruthy()
  })
  it('sideBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('file-side-bar-stub').exists()).toBeTruthy()
  })
  describe('different files view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getMountedWrapper({ loading: true })
      console.log(wrapper.html())
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('shows the no-content-message after loading', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
      expect(wrapper.find('.no-content-message').exists()).toBeTruthy()
    })
    it('shows the files table when files are available', () => {
      const mockedFiles = [mockDeep<OutgoingShareResource>(), mockDeep<OutgoingShareResource>()]
      const { wrapper } = getMountedWrapper({ files: mockedFiles })
      console.log(wrapper.html())
      expect(wrapper.find('.no-content-message').exists()).toBeFalsy()
      expect(wrapper.find('resource-table-stub').exists()).toBeTruthy()
      expect(
        wrapper.findComponent<typeof ResourceTable>('resource-table-stub').props().resources.length
      ).toEqual(mockedFiles.length)
    })
  })
})

function getMountedWrapper({
  mocks = {},
  files = [],
  loading = false
}: {
  mocks?: Record<string, unknown>
  files?: OutgoingShareResource[]
  loading?: boolean
} = {}) {
  const plugins = [...defaultPlugins()]

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-shares-via-link' })
    }),
    ...(mocks && mocks)
  }

  vi.mocked(useResourcesViewDefaults).mockImplementation(() =>
    useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading)
    })
  )

  const extensions = [
    {
      id: 'com.github.opencloud-eu.web.files.folder-view.resource-table',
      type: 'folderView',
      extensionPointIds: [
        folderViewsFolderExtensionPoint.id,
        folderViewsProjectSpacesExtensionPoint.id,
        folderViewsFavoritesExtensionPoint.id,
        folderViewsTrashOverviewExtensionPoint.id,
        folderViewsSharedViaLink.id
      ],
      folderView: {
        name: 'resource-table',
        label: 'Switch to default view',
        icon: {
          name: 'menu-line',
          fillType: 'none'
        },
        component: ResourceTable
      }
    }
  ] satisfies FolderViewExtension[]
  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue(extensions)

  return {
    mocks: defaultMocks,
    wrapper: mount(SharedViaLink, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: defaultStubs
      }
    })
  }
}
