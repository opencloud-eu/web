import Projects from '../../../../src/views/spaces/Projects.vue'
import { mock } from 'vitest-mock-extended'
import { nextTick, ref } from 'vue'
import {
  queryItemAsString,
  useExtensionRegistry,
  FolderViewExtension,
  ResourceTable,
  FileSideBar
} from '@opencloud-eu/web-pkg'

import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation,
  PiniaMockOptions
} from '@opencloud-eu/web-test-helpers'
import { AbilityRule, buildSpace, SpaceResource } from '@opencloud-eu/web-client'
import { Drive } from '@opencloud-eu/web-client/graph/generated'
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
    it('shows the status of disabled spaces next to their name, where narrow screens still see it', async () => {
      // rendered rows need real space resources, the plain fixtures only cover the lazy placeholders
      const spaces = spacesResources.map(({ id, name, disabled }) =>
        buildSpace({
          id,
          name,
          driveType: 'project',
          driveAlias: `project/${id}`,
          root: disabled ? { deleted: { state: 'trashed' } } : {},
          special: []
        } as Drive)
      )
      const { wrapper } = getMountedWrapper({ spaces, includeDisabled: true, lazy: false })
      await flushPromises()
      const tagsBySpaceId = Object.fromEntries(
        wrapper
          .findAll('tbody tr')
          .map((row) => [
            row.attributes('data-item-id'),
            row.findAll('.oc-table-data-cell-name .oc-tag')
          ])
      )
      expect(tagsBySpaceId['1']).toHaveLength(0)
      expect(tagsBySpaceId['2']).toHaveLength(0)
      expect(tagsBySpaceId['3']).toHaveLength(1)
      expect(tagsBySpaceId['3'][0].text()).toBe('Disabled')
      expect(tagsBySpaceId['3'][0].classes()).toContain('lg:hidden')
    })
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
  lazy = true,
  store = {}
}: {
  mocks?: Record<string, unknown>
  spaces?: SpaceResource[]
  abilities?: AbilityRule[]
  stubAppBar?: boolean
  includeDisabled?: boolean
  lazy?: boolean
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
        component: ResourceTable,
        componentAttrs: () => ({ lazy })
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
