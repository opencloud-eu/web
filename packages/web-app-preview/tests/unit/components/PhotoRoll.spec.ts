import PhotoRoll from '../../../src/components/PhotoRoll.vue'
import { defaultPlugins, PartialComponentProps, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { CachedFile } from '../../../src/helpers/types'

describe('PhotoRoll component', () => {
  it('renders all photos as buttons', () => {
    const photos = [mock<CachedFile>(), mock<CachedFile>()]
    const { wrapper } = getWrapper({ items: photos })
    expect(wrapper.findAll('oc-button-stub').length).toBe(photos.length)
  })
  it('emits a "select"-event on click and passes the index of the selected photo', async () => {
    const photos = [mock<CachedFile>(), mock<CachedFile>(), mock<CachedFile>()]
    const { wrapper } = getWrapper({ items: photos })
    const buttons = wrapper.findAll('oc-button-stub')

    await buttons[1].trigger('click')
    expect(wrapper.emitted('select')).toBeDefined()
    expect(wrapper.emitted('select')[0]).toEqual([1])
  })
})

function getWrapper(props: PartialComponentProps<typeof PhotoRoll> = {}) {
  return {
    wrapper: shallowMount(PhotoRoll, {
      props: {
        items: [mock<CachedFile>()],
        activeIndex: 0,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
