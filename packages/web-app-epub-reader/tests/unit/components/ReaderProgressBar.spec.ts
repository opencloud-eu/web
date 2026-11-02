import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ReaderProgressBar from '../../../src/components/ReaderProgressBar.vue'

const progressSliderSelector = '.epub-reader-progress-slider input[type="range"]'

function getWrapper({
  enabled = true,
  loading = !enabled
}: { enabled?: boolean; loading?: boolean } = {}) {
  return mount(ReaderProgressBar, {
    props: {
      readingProgressPercent: 12.3,
      enabled,
      loading
    },
    global: {
      plugins: [...defaultPlugins()]
    }
  })
}

describe('ReaderProgressBar component', () => {
  it('throttles seek on input (live dragging)', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>(progressSliderSelector)

    slider.element.value = '42.4'
    await slider.trigger('input')

    // Throttled with leading: true, so emits immediately on first input
    expect(wrapper.emitted('seek')).toEqual([[42.4]])
    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12.3%')
  })

  it('emits seek on slider value change', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>(progressSliderSelector)

    await slider.setValue('35')

    expect(wrapper.emitted('seek')).toBeTruthy()
    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12.3%')
  })

  it('updates slider value when parent progress updates', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>(progressSliderSelector)

    expect(slider.element.value).toBe('12.3')

    await wrapper.setProps({ readingProgressPercent: 36 })

    expect(slider.element.value).toBe('36')
  })

  it('keeps the dragged slider position while the parent reports live seek results', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>(progressSliderSelector)

    slider.element.value = '80'
    await slider.trigger('input')

    // Live seeking makes the parent report the position it already rendered. The thumb has to
    // stay where the pointer left it instead of snapping back.
    await wrapper.setProps({ readingProgressPercent: 42.4 })

    expect(slider.element.value).toBe('80')
  })

  it('hands the slider position back to the parent after the drag ended', async () => {
    const wrapper = getWrapper()
    const slider = wrapper.find<HTMLInputElement>(progressSliderSelector)

    slider.element.value = '80'
    await slider.trigger('input')
    await slider.trigger('change')

    expect(slider.element.value).toBe('80')

    await wrapper.setProps({ readingProgressPercent: 79.8 })

    expect(slider.element.value).toBe('79.8')
  })

  it('keeps the same height while loading and when loaded', () => {
    // The book container shrinks when the bar grows, which triggers a full relayout of the book.
    function getRowHeightClasses(enabled: boolean) {
      const row = (getWrapper({ enabled }).element as HTMLElement).firstElementChild
      return Array.from(row.classList).filter((className) => /^h-/.test(className))
    }

    const loadedRowHeightClasses = getRowHeightClasses(true)
    expect(loadedRowHeightClasses).toHaveLength(1)
    expect(getRowHeightClasses(false)).toEqual(loadedRowHeightClasses)
  })

  it('shows nothing but keeps its height when the book has no locations', () => {
    const wrapper = getWrapper({ enabled: false, loading: false })

    expect(wrapper.find(progressSliderSelector).exists()).toBe(false)
    expect(wrapper.find('.epub-reader-progress-shimmer').exists()).toBe(false)
    expect(wrapper.element.firstElementChild.classList.contains('h-4')).toBe(true)
  })

  it('omits trailing decimal zeros in the displayed label', () => {
    const wrapper = mount(ReaderProgressBar, {
      props: {
        readingProgressPercent: 12,
        enabled: true,
        loading: false
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })

    expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12%')
  })
})
