import SpaceImage from '../../../../src/components/Spaces/SpaceImage.vue'
import ResourceIcon from '../../../../src/components/FilesList/ResourceIcon.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { SpaceResource } from '@opencloud-eu/web-client'

describe('SpaceImage', () => {
  it('shows a spinner while the space image is loading', () => {
    const { wrapper } = getWrapper({
      space: { id: '1', thumbnail: 'blob:1' },
      imagesLoading: ['1']
    })
    expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    expect(wrapper.find('img').exists()).toBeFalsy()
  })
  it('shows the thumbnail of the space', () => {
    const { wrapper } = getWrapper({ space: { id: '1', thumbnail: 'blob:1' } })
    expect(wrapper.find('img').attributes('src')).toBe('blob:1')
    expect(wrapper.find('img').classes()).not.toContain('grayscale')
  })
  it('shows the thumbnail of a disabled space in grayscale', () => {
    const { wrapper } = getWrapper({ space: { id: '1', thumbnail: 'blob:1', disabled: true } })
    expect(wrapper.find('img').classes()).toContain('grayscale')
  })
  it('falls back to the space icon if the space has no image', () => {
    const space = { id: '1' } as SpaceResource
    const { wrapper } = getWrapper({ space })
    expect(wrapper.find('img').exists()).toBeFalsy()
    expect(wrapper.findComponent(ResourceIcon).props('resource')).toEqual(space)
  })
})

function getWrapper({
  space,
  imagesLoading = []
}: {
  space: Partial<SpaceResource>
  imagesLoading?: string[]
}) {
  return {
    wrapper: shallowMount(SpaceImage, {
      props: { space: space as SpaceResource },
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { spacesState: { imagesLoading } } })]
      }
    })
  }
}
