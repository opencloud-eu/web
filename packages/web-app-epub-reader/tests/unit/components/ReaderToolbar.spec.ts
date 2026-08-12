import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import ReaderToolbar from '../../../src/components/ReaderToolbar.vue'
import { NavItem } from 'epubjs'

const chapters: NavItem[] = [
  { id: '1', label: 'Chapter 1', href: 'c1' } as NavItem,
  { id: '2', label: 'Chapter 2', href: 'c2' } as NavItem
]

function getWrapper() {
  return mount(ReaderToolbar, {
    props: {
      chapters,
      selectedChapter: chapters[0],
      chapterLabel: 'Chapter',
      previousPageLabel: 'Navigate to previous page',
      nextPageLabel: 'Navigate to next page',
      decreaseFontSizeLabel: 'Decrease font size',
      resetFontSizeLabel: 'Reset font size',
      increaseFontSizeLabel: 'Increase font size',
      currentFontSizePercentage: 100,
      fontSizeStep: 10,
      navigateLeftDisabled: false,
      navigateRightDisabled: false,
      decreaseFontSizeDisabled: false,
      increaseFontSizeDisabled: false,
      readingProgressLabel: '16.7%',
      fullscreenLabel: 'Enter fullscreen',
      isFullScreenModeActivated: false
    },
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        'oc-drop': true
      },
      renderStubDefaultSlot: true
    }
  })
}

describe('ReaderToolbar component', () => {
  it('emits navigation and font-size events on click', async () => {
    const wrapper = getWrapper()

    await wrapper.find('.epub-reader-controls-navigate-left').trigger('click')
    await wrapper.find('.epub-reader-controls-navigate-right').trigger('click')
    await wrapper.find('.epub-reader-controls-font-size-decrease').trigger('click')
    await wrapper.find('.epub-reader-controls-font-size-reset').trigger('click')
    await wrapper.find('.epub-reader-controls-font-size-increase').trigger('click')
    await wrapper.find('.epub-reader-controls-fullscreen').trigger('click')

    expect(wrapper.emitted('navigateLeft')).toHaveLength(1)
    expect(wrapper.emitted('navigateRight')).toHaveLength(1)
    expect(wrapper.emitted('decreaseFontSize')).toHaveLength(1)
    expect(wrapper.emitted('resetFontSize')).toHaveLength(1)
    expect(wrapper.emitted('increaseFontSize')).toHaveLength(1)
    expect(wrapper.emitted('toggleFullscreen')).toHaveLength(1)
  })

  it('forwards chapter updates from mobile chapter select', () => {
    const wrapper = getWrapper()

    wrapper
      .findComponent({ name: 'MobileChapterSelect' })
      .vm.$emit('update:selectedChapter', chapters[1])

    expect(wrapper.emitted('update:selectedChapter')).toEqual([[chapters[1]]])
  })

  it('renders current font size', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.epub-reader-controls-font-size-reset').text()).toBe('100%')
  })

  it('renders page indicator when page data is available', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.epub-reader-controls-page-indicator').text()).toBe('16.7%')
    expect(wrapper.find('.epub-reader-controls-page-indicator').attributes('aria-label')).toBe(
      'Reading progress: 16.7%'
    )
  })

  it('renders disabled states for control buttons', () => {
    const wrapper = mount(ReaderToolbar, {
      props: {
        chapters,
        selectedChapter: chapters[0],
        chapterLabel: 'Chapter',
        previousPageLabel: 'Navigate to previous page',
        nextPageLabel: 'Navigate to next page',
        decreaseFontSizeLabel: 'Decrease font size',
        resetFontSizeLabel: 'Reset font size',
        increaseFontSizeLabel: 'Increase font size',
        currentFontSizePercentage: 150,
        fontSizeStep: 10,
        navigateLeftDisabled: true,
        navigateRightDisabled: true,
        decreaseFontSizeDisabled: false,
        increaseFontSizeDisabled: true,
        readingProgressLabel: null,
        fullscreenLabel: 'Enter fullscreen',
        isFullScreenModeActivated: false
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          'oc-drop': true
        },
        renderStubDefaultSlot: true
      }
    })

    expect(
      wrapper.find<HTMLButtonElement>('.epub-reader-controls-navigate-left').element.disabled
    ).toBe(true)
    expect(
      wrapper.find<HTMLButtonElement>('.epub-reader-controls-navigate-right').element.disabled
    ).toBe(true)
    expect(
      wrapper.find<HTMLButtonElement>('.epub-reader-controls-font-size-increase').element.disabled
    ).toBe(true)
  })
})
