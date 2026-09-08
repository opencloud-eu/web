import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import ResourceTile from '../../../../src/components/FilesList/ResourceTile.vue'
import { mock } from 'vitest-mock-extended'
import { RouteLocation } from 'vue-router'
import { defineComponent, h } from 'vue'
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
    const resource = getSpaceMock()
    const wrapper = getWrapper({ resource }, { selectedIds: [resource.id] })
    expect(wrapper.find('.oc-tile-card-selected').exists()).toBeTruthy()
  })
  it.each(['size-12, size-22, size-42'])(
    'renders resource icon size correctly',
    (resourceIconSize) => {
      const wrapper = getWrapper({ resource: getSpaceMock(), resourceIconSize })
      expect(wrapper.find('resource-icon-stub').attributes('sizeclass')).toEqual(resourceIconSize)
    }
  )
  it('shows a loading spinner if isLoading is set to true', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(), isLoading: true })
    expect(wrapper.find('.oc-tile-card-loading-spinner').exists()).toBeTruthy()
  })
  it('mounts the motion photo player only for resources with a motionPhoto facet', () => {
    const resource = {
      ...getSpaceMock(),
      motionPhoto: { version: 1, presentationTimestampUs: 500000, videoSize: 1234567 }
    } as unknown as Resource
    expect(getWrapper({ resource }).find('motion-photo-player-stub').exists()).toBeTruthy()
    expect(
      getWrapper({ resource: getSpaceMock() }).find('motion-photo-player-stub').exists()
    ).toBeFalsy()
  })

  it('keeps the player outside the media link and drives it from the media area hover', async () => {
    const hoverPlay = vi.fn()
    const stop = vi.fn()
    const resource = {
      ...getSpaceMock(),
      motionPhoto: { videoSize: 120000 }
    } as unknown as Resource
    const wrapper = getWrapper(
      { resource },
      {},
      {
        MotionPhotoPlayer: defineComponent({
          setup(_, { expose }) {
            expose({ hoverPlay, stop })
            return () => h('div', { class: 'player-stub' })
          }
        })
      }
    )
    // a sibling of the link, never nested inside it (its badge is a button)
    expect(wrapper.find('resource-link-stub .player-stub').exists()).toBe(false)
    const player = wrapper.find('.player-stub')
    expect(player.exists()).toBe(true)

    const mediaArea = wrapper
      .findAll('div')
      .find((div) => div.element === player.element.parentElement)
    await mediaArea.trigger('mouseenter')
    expect(hoverPlay).toHaveBeenCalled()
    await mediaArea.trigger('mouseleave')
    expect(stop).toHaveBeenCalled()
  })

  function getWrapper(
    props: PartialComponentProps<typeof ResourceTile> & { resource: Resource },
    resourcesStore = {},
    stubs: Record<string, unknown> = {}
  ) {
    const defaultMocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files' })
    })

    return shallowMount(ResourceTile, {
      props,
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { spacesState: { spaces: [getSpaceMock(false)] }, resourcesStore }
          })
        ],
        renderStubDefaultSlot: true,
        stubs,
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
  }
})
