import SpaceDetails from '../../../../../../src/components/SideBar/Spaces/Details/SpaceDetails.vue'
import {
  CollaboratorShare,
  ShareRole,
  SpaceResource,
  Resource,
  GraphSharePermission
} from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from 'vue-router'
import { DriveItem, User } from '@opencloud-eu/web-client/graph/generated'
import { flushPromises } from '@vue/test-utils'
import { nextTick, Ref, ref } from 'vue'
import { useLoadPreview } from '../../../../../../src/composables/resources'
import { useSpacesStore } from '../../../../../../src/composables/piniaStores'

vi.mock('../../../../../../src/composables/resources', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLoadPreview: vi.fn()
}))

const spaceMock = {
  type: 'space',
  name: ' space',
  id: '1',
  driveType: 'project',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  spaceQuota: {
    used: 100,
    total: 1000
  }
} as unknown as SpaceResource

const getSpaceImageData = (eTag: string) =>
  ({ id: 'image', name: 'image.png', eTag, file: { mimeType: 'image/png' } }) as DriveItem

const spaceShare = {
  id: '1',
  sharedWith: {
    id: '1',
    displayName: 'alice'
  },
  resourceId: '1',
  role: mock<ShareRole>(),
  permissions: [GraphSharePermission.deletePermissions]
} as CollaboratorShare

const selectors = {
  spaceDefaultImage: '.space-default-image',
  spaceMembers: '.oc-space-details-sidebar-members'
}

describe('Details SideBar Panel', () => {
  it('displays the details side panel', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('does render the space default image', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find(selectors.spaceDefaultImage).exists()).toBeTruthy()
  })
  it('does not render share indicators if "showShareIndicators" is false', () => {
    const { wrapper } = createWrapper({
      spaceResource: spaceMock,
      props: { showShareIndicators: false }
    })
    expect(wrapper.find(selectors.spaceMembers).exists()).toBeFalsy()
  })
  it('does not render share indicators if space is disabled', () => {
    const { wrapper } = createWrapper({
      spaceResource: { ...spaceMock, disabled: true },
      props: { showShareIndicators: true }
    })
    expect(wrapper.find(selectors.spaceMembers).exists()).toBeFalsy()
  })
  it('names the share panel button by its visible text and describes it with the share summary', () => {
    const { wrapper } = createWrapper()
    const showButton = wrapper.find(selectors.spaceMembers).findAll('oc-button-stub').at(-1)
    expect(showButton.attributes('arialabel')).toBeUndefined()
    const description = wrapper.find(`[id="${showButton.attributes('aria-describedby')}"]`)
    expect(description.text()).toBe('This space has 1 member.')
  })
  it('renders the size if the space is the current folder', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.findAll('dt').map((dt) => dt.text())).toContain('Size')
  })
  it.each([
    { size: 0, used: 205000, expected: '205 kB' },
    { size: 205000, used: 0, expected: '0 B' },
    { size: 205000, used: undefined, expected: '205 kB' }
  ])(
    'renders the used quota $used as size, falling back to the space size $size',
    ({ size, used, expected }) => {
      const { wrapper } = createWrapper({
        spaceResource: { ...spaceMock, size, spaceQuota: { used, total: 1000000 } }
      })
      const sizeIndex = wrapper.findAll('dt').findIndex((dt) => dt.text() === 'Size')
      expect(wrapper.findAll('dd').at(sizeIndex).text()).toContain(`${expected},`)
    }
  )
  it('does not render the replaced image url when the image changes', async () => {
    const resource = ref<SpaceResource>({
      ...spaceMock,
      webDavPath: '/spaces/1',
      spaceImageData: getSpaceImageData('old')
    })
    const imageSourcesAfterLoading: string[] = []
    const loadPreview = vi.fn().mockResolvedValueOnce('blob:old')
    const { wrapper } = createWrapper({ resource, loadPreview })
    await flushPromises()
    expect(wrapper.find('img').attributes('src')).toBe('blob:old')

    // like useLoadPreview: the loading flag is cleared before the new url is returned,
    // while the old url has already been revoked by the preview cache
    loadPreview.mockImplementationOnce(async () => {
      const spacesStore = useSpacesStore()
      spacesStore.addToImagesLoading(spaceMock.id)
      await nextTick()
      spacesStore.removeFromImagesLoading(spaceMock.id)
      await nextTick()
      const img = wrapper.find('img')
      if (img.exists()) {
        imageSourcesAfterLoading.push(img.attributes('src'))
      }
      return 'blob:new'
    })
    resource.value = { ...resource.value, spaceImageData: getSpaceImageData('new') }
    await flushPromises()

    expect(loadPreview).toHaveBeenCalledTimes(2)
    expect(imageSourcesAfterLoading).not.toContain('blob:old')
    expect(wrapper.find('img').attributes('src')).toBe('blob:new')
  })
  it('does not render the size if the space is not the current folder', () => {
    const { wrapper } = createWrapper({ currentFolder: null })
    expect(wrapper.findAll('dt').map((dt) => dt.text())).not.toContain('Size')
  })
})

function createWrapper({
  spaceResource = spaceMock,
  props = {},
  currentFolder = spaceResource as Resource,
  resource = undefined as Ref<SpaceResource>,
  loadPreview = vi.fn().mockResolvedValue(null)
}: {
  spaceResource?: SpaceResource
  props?: Record<string, unknown>
  currentFolder?: Resource
  resource?: Ref<SpaceResource>
  loadPreview?: ReturnType<typeof useLoadPreview>['loadPreview']
} = {}) {
  vi.mocked(useLoadPreview).mockReturnValue(
    mock<ReturnType<typeof useLoadPreview>>({ loadPreview })
  )
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  return {
    wrapper: shallowMount(SpaceDetails, {
      props: { ...props },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              stubActions: false,
              userState: { user: { id: '1', onPremisesSamAccountName: 'marie' } as User },
              sharesState: { collaboratorShares: [spaceShare] },
              resourcesStore: {
                currentFolder,
                resources: [mock<Resource>({ name: 'file1', type: 'file' })]
              }
            }
          })
        ],
        mocks,
        provide: { resource: resource || spaceResource, ...mocks }
      }
    })
  }
}
