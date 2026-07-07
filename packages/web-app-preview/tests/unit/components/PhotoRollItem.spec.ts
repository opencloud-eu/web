import PhotoRollItem from '../../../src/components/PhotoRollItem.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { MotionPhotoOverlay } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { MediaFile } from '../../../src/helpers/types'

describe('PhotoRoll component', () => {
  it('emits a "select"-event on click', async () => {
    const { wrapper } = getWrapper()
    const button = wrapper.find('oc-button-stub')
    await button.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('wraps the thumbnail in a motion photo overlay for the resource', () => {
    const item = mock<MediaFile>({ isMotionPhoto: true })
    const { wrapper } = getWrapper({ item })
    const overlay = wrapper.findComponent(MotionPhotoOverlay)
    expect(overlay.exists()).toBe(true)
    expect(overlay.props('resource')).toBe(item.resource)
  })
})

function getWrapper(props: PartialComponentProps<typeof PhotoRollItem> = {}) {
  const defaultMocks = defaultComponentMocks()

  return {
    wrapper: shallowMount(PhotoRollItem, {
      props: {
        item: mock<MediaFile>(),
        isActive: true,
        ...props
      },
      global: {
        renderStubDefaultSlot: true,
        plugins: [...defaultPlugins()],
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
  }
}
