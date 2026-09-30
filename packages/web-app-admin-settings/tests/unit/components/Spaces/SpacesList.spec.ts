import SpacesList from '../../../../src/components/Spaces/SpacesList.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import {
  ProcessorType,
  queryItemAsString,
  useLoadPreview,
  useSideBar,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { useSpaceSettingsStore } from '../../../../src/composables'
import { mock } from 'vitest-mock-extended'
import { GraphSharePermission, SpaceResource } from '@opencloud-eu/web-client'
import { Permission } from '@opencloud-eu/web-client/graph/generated'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { OcCheckbox, OcStatusIndicators, OcTable } from '@opencloud-eu/design-system/components'

const spaceMocks = [
  mock<SpaceResource>({
    id: '1',
    name: '1 Some space',
    disabled: false,
    extension: '',
    root: {
      permissions: [
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user1' } },
          '@libre.graph.permissions.actions': [GraphSharePermission.deletePermissions]
        }),
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user2' } },
          '@libre.graph.permissions.actions': [GraphSharePermission.deletePermissions]
        }),
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user3' } },
          '@libre.graph.permissions.actions': [GraphSharePermission.deletePermissions]
        })
      ]
    },
    spaceQuota: {
      total: 1000000000,
      used: 0,
      remaining: 1000000000
    }
  }),
  mock<SpaceResource>({
    id: '2',
    name: '2 Another space',
    extension: '',
    disabled: true,
    root: {
      permissions: [
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user1' } },
          '@libre.graph.permissions.actions': [GraphSharePermission.deletePermissions]
        }),
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user2' } },
          '@libre.graph.permissions.actions': [GraphSharePermission.deletePermissions]
        }),
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user3' } },
          '@libre.graph.permissions.actions': [GraphSharePermission.deletePermissions]
        }),
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user4' } },
          '@libre.graph.permissions.actions': []
        }),
        mock<Permission>({
          grantedToV2: { user: { displayName: 'user5' } },
          '@libre.graph.permissions.actions': []
        })
      ]
    },
    spaceQuota: {
      total: 2000000000,
      used: 500000000,
      remaining: 1500000000
    }
  })
]

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  useLoadPreview: vi.fn()
}))

describe('SpacesList', () => {
  describe('space images', () => {
    it('loads the images of the visible spaces and stores them on the spaces', async () => {
      const { loadPreview } = getWrapper({ spaces: spaceMocks })
      await flushPromises()
      expect(loadPreview).toHaveBeenCalledTimes(spaceMocks.length)
      expect(loadPreview).toHaveBeenCalledWith({
        space: spaceMocks[0],
        resource: spaceMocks[0],
        processor: ProcessorType.enum.fit,
        updateStore: false
      })
      const { updateSpaceField } = useSpacesStore()
      expect(updateSpaceField).toHaveBeenCalledWith({
        id: spaceMocks[0].id,
        field: 'thumbnail',
        value: 'blob:preview'
      })
    })
    it('loads the image of a space again when it changes', async () => {
      // plain spaces, filled and changed via the store like in the app. the table rows aren't
      // rendered (shallowMount), they would need the methods of real space resources
      const spaces = ['1', '2'].map((id) => ({
        id,
        name: `space ${id}`,
        driveType: 'project',
        root: { permissions: [] as Permission[] },
        spaceQuota: { total: 1, used: 0, remaining: 1 },
        spaceImageData: { eTag: '1' }
      }))
      const { loadPreview } = getWrapper({ mountType: shallowMount, stubActions: false })
      const spacesStore = useSpacesStore()
      spacesStore.setAllProjectSpaces(spaces as SpaceResource[])
      await flushPromises()
      expect(loadPreview).toHaveBeenCalledTimes(spaces.length)
      loadPreview.mockClear()

      spacesStore.updateSpaceField({
        id: spaces[1].id,
        field: 'spaceImageData',
        value: { id: 'image', eTag: '2' }
      })
      await flushPromises()

      expect(loadPreview).toHaveBeenCalledTimes(1)
      expect(loadPreview).toHaveBeenCalledWith(
        expect.objectContaining({ space: expect.objectContaining({ id: spaces[1].id }) })
      )
    })
  })

  describe('rendering', () => {
    it('renders a row per space', () => {
      const { wrapper } = getWrapper({ spaces: spaceMocks })
      expect(getColumn(wrapper, 'name')).toEqual(['1 Some space', '2 Another space'])
    })
    it('renders the first two managers and the amount of further managers', () => {
      const { wrapper } = getWrapper({ spaces: spaceMocks })
      expect(getColumn(wrapper, 'manager')).toEqual(['user1, user2... +1', 'user1, user2... +1'])
    })
    it('renders the member count', () => {
      const { wrapper } = getWrapper({ spaces: spaceMocks })
      expect(getColumn(wrapper, 'members')).toEqual(['3', '5'])
    })
    it('renders the quota', () => {
      const { wrapper } = getWrapper({ spaces: spaceMocks })
      expect(getColumn(wrapper, 'totalQuota')).toEqual(['1 GB', '2 GB'])
      expect(getColumn(wrapper, 'usedQuota')).toEqual(['0 B', '500 MB'])
      expect(getColumn(wrapper, 'remainingQuota')).toEqual(['1 GB', '1.5 GB'])
    })
    it('renders an unrestricted quota', () => {
      const space = mock<SpaceResource>({
        ...spaceMocks[0],
        spaceQuota: { total: 0, used: undefined, remaining: undefined }
      })
      const { wrapper } = getWrapper({ spaces: [space] })
      expect(getColumn(wrapper, 'totalQuota')).toEqual(['Unrestricted'])
      expect(getColumn(wrapper, 'usedQuota')).toEqual(['-'])
      expect(getColumn(wrapper, 'remainingQuota')).toEqual(['Unrestricted'])
    })
    it('renders the status indicators of each space', () => {
      const { wrapper } = getWrapper({ spaces: spaceMocks })
      expect(wrapper.findAllComponents(OcStatusIndicators)).toHaveLength(spaceMocks.length)
    })
    it('renders the total amount of spaces in the footer', () => {
      const { wrapper } = getWrapper({ spaces: spaceMocks })
      expect(wrapper.find('.oc-table-footer').text()).toContain('2 spaces in total')
    })
    it('renders the empty message if there are no spaces', () => {
      const { wrapper } = getWrapper({ spaces: [] })
      expect(wrapper.find('#admin-settings-spaces-empty').exists()).toBeTruthy()
      expect(wrapper.findComponent(OcTable).exists()).toBeFalsy()
    })
  })
  describe('sorting', () => {
    it.each(['name', 'members', 'totalQuota', 'usedQuota', 'remainingQuota'])(
      'writes the sort parameters for property "%s" to the route query',
      (prop) => {
        const { wrapper, mocks } = getWrapper({ mountType: shallowMount, spaces: spaceMocks })
        const table = wrapper.findComponent(OcTable)
        table.vm.$emit('sort', { sortBy: prop, sortDir: SortDir.Asc })
        expect(mocks.$router.replace).toHaveBeenCalledWith({
          query: expect.objectContaining({ 'sort-by': prop, 'sort-dir': SortDir.Asc })
        })
        table.vm.$emit('sort', { sortBy: prop, sortDir: SortDir.Desc })
        expect(mocks.$router.replace).toHaveBeenCalledWith({
          query: expect.objectContaining({ 'sort-by': prop, 'sort-dir': SortDir.Desc })
        })
      }
    )
    it('writes the sort parameters to the route query when the table emits "sort"', () => {
      const { wrapper, mocks } = getWrapper({ spaces: [spaceMocks[0]] })
      wrapper.findComponent(OcTable).vm.$emit('sort', { sortBy: 'members', sortDir: SortDir.Desc })
      expect(mocks.$router.replace).toHaveBeenCalledWith({
        query: expect.objectContaining({ 'sort-by': 'members', 'sort-dir': SortDir.Desc })
      })
    })
  })
  it('shows only filtered spaces if filter applied', async () => {
    const { wrapper } = getWrapper({ spaces: spaceMocks })
    await wrapper.setProps({ filterTerm: 'Another' })
    expect(wrapper.findComponent(OcTable).props('data')).toEqual([spaceMocks[1]])
    expect(wrapper.find('.oc-table-footer').text()).toContain('1 matching spaces')
  })
  it('should show the space details on details button click', async () => {
    const { wrapper } = getWrapper({ spaces: spaceMocks })

    const { openSideBar } = useSideBar()
    await wrapper.find('.spaces-table-btn-details').trigger('click')
    expect(openSideBar).toHaveBeenCalled()
  })
  it.each([
    { description: 'another space', selectedSpaces: [spaceMocks[1]] },
    { description: 'the same space', selectedSpaces: [spaceMocks[0]] }
  ])(
    'selects only the clicked space on details button click if $description is selected',
    async ({ selectedSpaces }) => {
      const { wrapper } = getWrapper({ spaces: spaceMocks, selectedSpaces, stubActions: false })
      await wrapper.find('.spaces-table-btn-details').trigger('click')
      const { selectedSpaces: newSelection } = useSpaceSettingsStore()
      expect(newSelection).toEqual([spaceMocks[0]])
    }
  )
  describe('toggle selection', () => {
    const spaces = [
      mock<SpaceResource>({ id: '1', name: 'Some Space' }),
      mock<SpaceResource>({ id: '2', name: 'Some other Space' })
    ]

    it('selects all spaces via the header checkbox', () => {
      const { wrapper } = getWrapper({ spaces })
      getSelectAllCheckbox(wrapper).vm.$emit('update:modelValue', true)
      const { setSelectedSpaces } = useSpaceSettingsStore()
      // selects the spaces in the order they are displayed, which is sorted by name
      expect(setSelectedSpaces).toHaveBeenCalledWith([spaces[1], spaces[0]])
    })
    it('de-selects all spaces via the header checkbox if all are selected', () => {
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces })
      expect(getSelectAllCheckbox(wrapper).props('modelValue')).toBeTruthy()
      getSelectAllCheckbox(wrapper).vm.$emit('update:modelValue', false)
      const { setSelectedSpaces } = useSpaceSettingsStore()
      expect(setSelectedSpaces).toHaveBeenCalledWith([])
    })
    it('selects a space via its checkbox', () => {
      const { wrapper } = getWrapper({ spaces: [spaces[0]] })
      getSpaceCheckbox(wrapper, spaces[0]).vm.$emit('update:modelValue', true)
      const { addSelectedSpace } = useSpaceSettingsStore()
      expect(addSelectedSpace).toHaveBeenCalledWith(spaces[0])
    })
    it('de-selects a selected space via its checkbox', () => {
      const { wrapper } = getWrapper({ spaces: [spaces[0]], selectedSpaces: [spaces[0]] })
      getSpaceCheckbox(wrapper, spaces[0]).vm.$emit('update:modelValue', false)
      const { setSelectedSpaces } = useSpaceSettingsStore()
      expect(setSelectedSpaces).toHaveBeenCalledWith([])
    })
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

function getColumn(wrapper: Wrapper, name: string) {
  return wrapper.findAll(`.oc-table-data-cell-${name}`).map((cell) => cell.text())
}

function getSelectAllCheckbox(wrapper: Wrapper) {
  return wrapper
    .findAllComponents(OcCheckbox)
    .find((checkbox) => checkbox.props('label') === 'Select all spaces')
}

function getSpaceCheckbox(wrapper: Wrapper, space: SpaceResource) {
  return wrapper
    .findAllComponents(OcCheckbox)
    .find((checkbox) => checkbox.props('label') === `Select ${space.name}`)
}

function getWrapper({
  mountType = mount,
  spaces = [],
  selectedSpaces = [],
  stubActions = true
}: {
  mountType?: typeof mount
  spaces?: SpaceResource[]
  selectedSpaces?: SpaceResource[]
  stubActions?: boolean
} = {}) {
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '1')
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '100')
  const mocks = defaultComponentMocks()
  const loadPreview = vi.fn().mockResolvedValue('blob:preview')
  vi.mocked(useLoadPreview).mockReturnValue(
    mock<ReturnType<typeof useLoadPreview>>({ loadPreview })
  )

  return {
    mocks,
    loadPreview,
    wrapper: mountType(SpacesList, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              stubActions,
              spacesState: { allProjectSpaces: spaces },
              spaceSettingsStore: { selectedSpaces }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: {
          OcCheckbox: true,
          OcStatusIndicators: true
        }
      }
    })
  }
}
