import { mock } from 'vitest-mock-extended'
import { ResourcePreview, SearchResultValue } from '../../../../src/components'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useIsVisible } from '@opencloud-eu/design-system/composables'
import { useGetMatchingSpace } from '../../../../src/composables/spaces/useGetMatchingSpace'
import {
  defaultComponentMocks,
  defaultPlugins,
  shallowMount,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { useFileActions } from '../../../../src/composables/actions'
import { CapabilityStore } from '../../../../src/composables/piniaStores'
import ResourceListItem from '../../../../src/components/FilesList/ResourceListItem.vue'
import { useLoadPreview } from '../../../../src/composables/resources'
import { ImageDimension } from '../../../../src/constants'
import { ProcessorType } from '../../../../src/services'

vi.mock('../../../../src/composables/spaces/useGetMatchingSpace', () => ({
  useGetMatchingSpace: vi.fn()
}))

vi.mock('../../../../src/composables/actions', () => ({
  useFileActions: vi.fn()
}))

vi.mock('../../../../src/composables/resources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/composables/resources')>()),
  useLoadPreview: vi.fn()
}))

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@opencloud-eu/design-system/composables')>()),
  useIsVisible: vi.fn()
}))

const selectors = {
  resourceListItemStub: 'resource-list-item-stub'
}

describe('Preview component', () => {
  const driveAliasAndItem = '1'
  vi.mocked(useGetMatchingSpace).mockImplementation(() => useGetMatchingSpaceMock())
  it('should render preview component', async () => {
    const { wrapper } = getWrapper({
      space: mock<SpaceResource>({
        id: '1',
        driveType: 'project',
        name: 'New space',
        getDriveAliasAndItem: () => driveAliasAndItem
      })
    })
    ;(wrapper.vm as any).previewData = 'blob:image'
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('should render resource component without file extension when areFileExtensionsShown is set to false', () => {
    const { wrapper } = getWrapper({
      areFileExtensionsShown: false,
      space: mock<SpaceResource>({
        id: '1',
        driveType: 'project',
        name: 'New space',
        getDriveAliasAndItem: () => driveAliasAndItem
      })
    })
    expect(
      wrapper.findComponent<typeof ResourceListItem>(selectors.resourceListItemStub).attributes()
        .isextensiondisplayed
    ).toBe('false')
  })

  describe('thumbnail processor', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it.each([
      { name: 'project spaces', isProjectSpace: true, processor: ProcessorType.enum.fit },
      { name: 'files inside project spaces', isProjectSpace: false, processor: undefined }
    ])('uses the correct processor for $name', async ({ isProjectSpace, processor }) => {
      const space = {
        ...mock<SpaceResource>({
          id: 'space',
          name: 'Project space',
          type: 'space',
          path: '/',
          driveType: 'project',
          disabled: false,
          getDriveAliasAndItem: () => driveAliasAndItem
        })
      }
      const resource = {
        ...(isProjectSpace
          ? space
          : mock<Resource>({
              id: 'file',
              name: 'image.jpg',
              type: 'file',
              path: '/image.jpg',
              storageId: space.id
            })),
        highlights: ''
      }
      const { wrapper, loadPreview } = getWrapper({
        space,
        searchResult: { id: resource.id, data: resource }
      })

      vi.mocked(useIsVisible).mock.lastCall[0].onVisibleCallback()
      await vi.advanceTimersByTimeAsync(250)

      expect(loadPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          space,
          resource,
          dimensions: ImageDimension.Thumbnail,
          updateStore: false
        })
      )
      expect(loadPreview.mock.lastCall[0].processor).toBe(processor)
      expect(wrapper.findComponent(ResourceListItem).props('resource').thumbnail).toBe('blob:image')
    })
  })
})

function getWrapper({
  space = null,
  searchResult = mock<SearchResultValue>({
    id: '1',
    data: {
      storageId: '1',
      name: 'lorem.txt',
      path: '/',
      remoteItemPath: ''
    }
  }),
  areFileExtensionsShown = true
}: {
  space?: SpaceResource
  searchResult?: SearchResultValue
  areFileExtensionsShown?: boolean
} = {}) {
  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({
      getMatchingSpace() {
        return space
      }
    })
  )
  vi.mocked(useFileActions).mockReturnValue(mock<ReturnType<typeof useFileActions>>())
  vi.mocked(useIsVisible).mockReturnValue(mock<ReturnType<typeof useIsVisible>>())
  const loadPreview = vi
    .fn<ReturnType<typeof useLoadPreview>['loadPreview']>()
    .mockResolvedValue('blob:image')
  vi.mocked(useLoadPreview).mockReturnValue(
    mock<ReturnType<typeof useLoadPreview>>({ loadPreview })
  )

  const mocks = defaultComponentMocks()
  const capabilities = {
    spaces: { projects: true }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    loadPreview,
    wrapper: shallowMount(ResourcePreview, {
      props: {
        searchResult
      },
      global: {
        provide: mocks,
        renderStubDefaultSlot: true,
        mocks,
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              capabilityState: { capabilities },
              resourcesStore: { areFileExtensionsShown }
            }
          })
        ]
      }
    })
  }
}
