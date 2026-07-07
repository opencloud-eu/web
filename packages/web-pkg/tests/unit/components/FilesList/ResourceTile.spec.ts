import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import ResourceTile from '../../../../src/components/FilesList/ResourceTile.vue'
import { mock } from 'vitest-mock-extended'
import { RouteLocation } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

const getSpaceMock = (disabled = false) =>
  ({
    name: 'Space 1',
    id: '1',
    storageId: '1',
    path: '',
    type: 'space',
    isFolder: true,
    disabled,
    getDriveAliasAndItem: () => '1'
  }) as unknown as SpaceResource

describe('OcTile component', () => {
  it('renders default space correctly', () => {
    const wrapper = getWrapper({ resource: getSpaceMock() })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('renders disabled space correctly', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(true), isResourceDisabled: true })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('renders selected resource correctly', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(), isResourceSelected: true })
    expect(wrapper.find('.oc-tile-card-selected').exists()).toBeTruthy()
  })
  it.each(['xlarge, xxlarge, xxxlarge'])(
    'renders resource icon size correctly',
    (resourceIconSize) => {
      const wrapper = getWrapper({ resource: getSpaceMock(), resourceIconSize })
      expect(wrapper.find('resource-icon-stub').attributes().size).toEqual(resourceIconSize)
    }
  )
  it('shows a loading spinner if isLoading is set to true', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(), isLoading: true })
    expect(wrapper.find('.oc-tile-card-loading-spinner').exists()).toBeTruthy()
  })
  it('shows a motion photo badge when the resource has a motionPhoto facet', () => {
    const resource = {
      ...getSpaceMock(),
      motionPhoto: { version: 1, presentationTimestampUs: 500000, videoSize: 1234567 }
    } as unknown as Resource
    const wrapper = getWrapper({ resource })
    expect(wrapper.find('motion-photo-badge-stub').exists()).toBeTruthy()
  })
  it('does not show a motion photo badge for regular resources', () => {
    const wrapper = getWrapper({ resource: getSpaceMock() })
    expect(wrapper.find('motion-photo-badge-stub').exists()).toBeFalsy()
  })
  // The tile wires useMotionPhotoPlayback inline (not via MotionPhotoOverlay), so
  // it needs its own hover-wiring check. The play/stop/toggle behaviour itself is
  // covered in useMotionPhotoPlayback.spec and MotionPhotoOverlay.spec.
  it('plays the motion photo inline on hover and stops on leave', async () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:tile-video')
    global.URL.revokeObjectURL = vi.fn()
    // hover-to-play is gated on a hover-capable device; make that assumption explicit
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('hover: hover'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
    const resource = {
      ...getSpaceMock(),
      type: 'file',
      isFolder: false,
      size: 200000,
      fileId: 'mp1',
      path: '/m.jpg',
      motionPhoto: { videoSize: 120000 }
    } as unknown as Resource

    const defaultMocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files' })
    })
    defaultMocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: new Blob([new Uint8Array(80)])
    })
    const wrapper = shallowMount(ResourceTile, {
      props: { resource, space: getSpaceMock() },
      global: {
        plugins: [
          ...defaultPlugins({ piniaOptions: { spacesState: { spaces: [getSpaceMock(false)] } } })
        ],
        renderStubDefaultSlot: true,
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
    const link = wrapper.find('resource-link-stub')

    expect(wrapper.find('.tile-motion-video').exists()).toBe(false)
    expect(wrapper.find('motion-photo-badge-stub').attributes('icon')).toBe('play-circle')

    // hover -> play, badge switches to the pause icon
    await link.trigger('mouseenter')
    await flushPromises()
    expect(wrapper.find('.tile-motion-video').exists()).toBe(true)
    expect(wrapper.find('motion-photo-badge-stub').attributes('icon')).toBe('pause-circle')

    // leave -> stop
    await link.trigger('mouseleave')
    expect(wrapper.find('.tile-motion-video').exists()).toBe(false)
  })

  function getWrapper(props = {}) {
    const defaultMocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files' })
    })

    return shallowMount(ResourceTile, {
      props,
      global: {
        plugins: [
          ...defaultPlugins({ piniaOptions: { spacesState: { spaces: [getSpaceMock(false)] } } })
        ],
        renderStubDefaultSlot: true,
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
  }
})
