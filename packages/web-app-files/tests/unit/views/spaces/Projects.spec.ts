import Projects from '../../../../src/views/spaces/Projects.vue'
import { mock } from 'vitest-mock-extended'
import { nextTick, ref } from 'vue'
import {
  queryItemAsString,
  useExtensionRegistry,
  FolderViewExtension,
  ResourceTable,
  FileSideBar,
  eventBus
} from '@opencloud-eu/web-pkg'

import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation,
  PiniaMockOptions
} from '@opencloud-eu/web-test-helpers'
import { AbilityRule, SpaceResource } from '@opencloud-eu/web-client'
import { folderViewsProjectSpacesExtensionPoint } from '../../../../src/extensionPoints'
import { flushPromises } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  appDefaults: vi.fn(),
  useRouteQueryPersisted: vi.fn().mockImplementation(() => ref('resource-table')),
  useFileActions: vi.fn()
}))

const spacesResources = [
  {
    id: '1',
    name: 'Some space',
    driveType: 'project',
    description: 'desc',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    getDriveAliasAndItem: () => '1'
  },
  {
    id: '2',
    name: 'Some other space',
    driveType: 'project',
    description: 'desc',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    getDriveAliasAndItem: () => '2'
  },
  {
    id: '3',
    name: 'Some disabled space',
    driveType: 'project',
    description: 'desc',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: true,
    getDriveAliasAndItem: () => '2'
  }
] as unknown as SpaceResource[]

describe('Projects view', () => {
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
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('shows the no-content-message after loading', async () => {
      const { wrapper } = getMountedWrapper()
      await flushPromises()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
      expect(wrapper.find('.no-content-message').exists()).toBeTruthy()
    })
    it('lists all available project spaces', async () => {
      const spaces = spacesResources
      const { wrapper } = getMountedWrapper({ spaces })
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
      expect(wrapper.find('.no-content-message').exists()).toBeFalsy()
      expect(wrapper.find('.spaces-table').exists()).toBeTruthy()
    })
    it('shows only filtered spaces if filter applied', async () => {
      const { wrapper } = getMountedWrapper({ spaces: spacesResources, stubAppBar: false })
      await flushPromises()
      wrapper.find('input').setValue('Some other space')
      await nextTick()
      expect(wrapper.findAll('tbody tr').length).toEqual(1)
    })
    it('shows only enabled spaces if includeDisabled filter is not applied', async () => {
      const { wrapper } = getMountedWrapper({ spaces: spacesResources })
      await flushPromises()
      await nextTick()
      expect(wrapper.findAll('tbody tr').length).toEqual(2)
    })
    it('shows all spaces if includeDisabled filter is applied', async () => {
      const { wrapper } = getMountedWrapper({ spaces: spacesResources, includeDisabled: true })
      await flushPromises()
      await nextTick()
      expect(wrapper.findAll('tbody tr').length).toEqual(3)
    })
  })
  it('switches only once to the page of a space that is on another page', async () => {
    const spaces = Array.from({ length: 130 }, (_, i) => {
      const id = String(i + 1).padStart(3, '0')
      return { ...spacesResources[0], id, name: `Space ${id}`, getDriveAliasAndItem: () => id }
    }) as unknown as SpaceResource[]
    const { mocks } = getMountedWrapper({
      spaces,
      store: { resourcesStore: { resources: spaces } }
    })
    await flushPromises()
    mocks.$router.push.mockClear()
    mocks.$router.push.mockReturnValue(new Promise(() => undefined))

    eventBus.publish('app.files.navigate.page', {
      resourceId: '121',
      forceScroll: true,
      topbarElement: 'files-app-bar'
    })

    expect(mocks.$router.push).toHaveBeenCalledTimes(1)
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ page: 3 }) })
    )
  })
  it('should not pass selected resource as space to sidebar when driveType is not "project"', () => {
    const resource = mock<SpaceResource>({ id: 'selected-resource', driveType: 'personal' })
    const { wrapper } = getMountedWrapper({
      store: { resourcesStore: { resources: [resource], selectedIds: ['selected-resource'] } }
    })

    const fileSideBar = wrapper.findComponent<typeof FileSideBar>('file-side-bar-stub')
    expect(fileSideBar.props('space')).toStrictEqual(null)
  })
  it('should pass selected resource as space to sidebar when driveType is "project"', () => {
    const resource = mock<SpaceResource>({ id: 'selected-resource', driveType: 'project' })
    const { wrapper } = getMountedWrapper({
      store: { resourcesStore: { resources: [resource], selectedIds: ['selected-resource'] } }
    })

    const fileSideBar = wrapper.findComponent<typeof FileSideBar>('file-side-bar-stub')
    expect(fileSideBar.props('space')).not.toStrictEqual(null)
  })
})

function getMountedWrapper({
  mocks = {},
  spaces = [],
  abilities = [],
  stubAppBar = true,
  includeDisabled = false,
  store = {}
}: {
  mocks?: Record<string, unknown>
  spaces?: SpaceResource[]
  abilities?: AbilityRule[]
  stubAppBar?: boolean
  includeDisabled?: boolean
  store?: PiniaMockOptions
} = {}) {
  const plugins = defaultPlugins({
    abilities,
    piniaOptions: {
      spacesState: { spaces },
      resourcesStore: { areDisabledSpacesShown: includeDisabled },
      ...store
    }
  })

  vi.mocked(queryItemAsString).mockImplementation(() => includeDisabled.toString())
  vi.mocked(queryItemAsString).mockImplementation(() => 'resource-table')

  const extensions = [
    {
      id: 'com.github.opencloud-eu.web.files.folder-view.resource-table',
      type: 'folderView',
      extensionPointIds: [folderViewsProjectSpacesExtensionPoint.id],
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
  vi.mocked(requestExtensions).mockImplementation((extensionPoint) =>
    extensions.filter((e) => e.type === extensionPoint.extensionType)
  )

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects', path: '/' })
    }),
    ...(mocks && mocks)
  }

  return {
    mocks: defaultMocks,
    wrapper: mount(Projects, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: {
          ...defaultStubs,
          'context-actions': true,
          'app-bar': stubAppBar,
          'resource-table': false,
          CreateSpace: true
        }
      }
    })
  }
}
