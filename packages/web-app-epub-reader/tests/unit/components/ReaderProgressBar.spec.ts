import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ReaderProgressBar from '../../../src/components/ReaderProgressBar.vue'

function getWrapper() {
  return mount(ReaderProgressBar, {
    props: {
      readingProgressPercent: 12.3,
      enabled: true
    },
    global: {
      plugins: [...defaultPlugins()]
    }
  })
}

describe('ReaderProgressBar component', () => {
  it('throttles seek on input (live dragging)', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>('.epub-reader-progress-slider')

    slider.element.value = '42.4'
    await slider.trigger('input')

    // Throttled with leading: true, so emits immediately on first input
    expect(wrapper.emitted('seek')).toEqual([[42.4]])
    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12.3%')
  })

  it('emits seek on slider value change', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>('.epub-reader-progress-slider')

    await slider.setValue('35')

    expect(wrapper.emitted('seek')).toBeTruthy()
    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12.3%')
  })

  it('updates slider value when parent progress updates', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>('.epub-reader-progress-slider')

    expect(slider.element.value).toBe('12.3')

    await wrapper.setProps({ readingProgressPercent: 36 })

    expect(slider.element.value).toBe('36')
  })

  it('omits trailing decimal zeros in the displayed label', async () => {
    const wrapper = mount(ReaderProgressBar, {
      props: {
        readingProgressPercent: 12,
        enabled: true
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })

    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12%')
  })
})
