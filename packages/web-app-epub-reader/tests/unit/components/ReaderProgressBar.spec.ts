import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ReaderProgressBar from '../../../src/components/ReaderProgressBar.vue'

function getWrapper() {
  return mount(ReaderProgressBar, {
    props: {
      readingProgressPercent: 12.3,
      readingProgressLabel: '12.3%',
      enabled: true
    },
    global: {
      plugins: [...defaultPlugins()]
    }
  })
}

describe('ReaderProgressBar component', () => {
  it('shows dragged percent in a bubble while the slider is being moved', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>('.epub-reader-progress-slider')

    slider.element.value = '42.4'
    await slider.trigger('input')

    expect(wrapper.find('.epub-reader-progress-preview').text()).toBe('42.4%')
    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12.3%')
    expect(wrapper.emitted('seek')).toBeUndefined()
  })

  it('emits seek on change and hides the bubble afterwards', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>('.epub-reader-progress-slider')

    await slider.setValue('35')

    expect(wrapper.emitted('seek')).toEqual([[35]])
    expect(wrapper.find('.epub-reader-progress-preview').exists()).toBe(false)
    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12.3%')
  })
})
