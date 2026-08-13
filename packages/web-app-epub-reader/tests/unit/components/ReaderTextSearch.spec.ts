import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import { vi } from 'vitest'
import ReaderTextSearch from '../../../src/components/ReaderTextSearch.vue'

function getWrapper() {
  return mount(ReaderTextSearch, {
    props: {
      toggle: '#epub_reader_text_search_toggle',
      searching: false,
      resultCount: 3,
      hasMoreResults: false,
      currentResultIndex: 1,
      canNavigateThroughResults: true
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

describe('ReaderTextSearch component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('shows empty status when query is empty', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.epub-reader-search-result-count').text()).toBe('')
  })

  it('emits search term updates', async () => {
    const wrapper = getWrapper()
    await wrapper.find('.oc-search-input').setValue('whale')
    await vi.advanceTimersByTimeAsync(250)

    expect(wrapper.emitted('searchTermChanged')).toEqual([['whale']])
  })

  it('renders search result status and emits next/previous events', async () => {
    const wrapper = getWrapper()
    await wrapper.find('.oc-search-input').setValue('whale')

    expect(wrapper.find('.epub-reader-search-result-count').text()).toBe('2/3')

    await wrapper.find('.epub-reader-search-previous-result').trigger('click')
    await wrapper.find('.epub-reader-search-next-result').trigger('click')

    expect(wrapper.emitted('goToPreviousResult')).toHaveLength(1)
    expect(wrapper.emitted('goToNextResult')).toHaveLength(1)
  })

  it('shows 0/0 when query has no matches', async () => {
    const wrapper = mount(ReaderTextSearch, {
      props: {
        toggle: '#epub_reader_text_search_toggle',
        searching: false,
        resultCount: 0,
        hasMoreResults: false,
        currentResultIndex: -1,
        canNavigateThroughResults: false
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          'oc-drop': true
        },
        renderStubDefaultSlot: true
      }
    })

    await wrapper.find('.oc-search-input').setValue('not-found')

    expect(wrapper.find('.epub-reader-search-result-count').text()).toBe('0/0')
  })

  it('clears search and emits close event', async () => {
    const wrapper = getWrapper()

    await wrapper.find('.oc-search-input').setValue('whale')
    await wrapper.find('.epub-reader-search-close').trigger('click')

    expect(wrapper.emitted('searchTermChanged')?.at(-1)).toEqual([''])
    expect(wrapper.emitted('closeSearch')).toHaveLength(1)
  })

  it('emits next-result on enter key press', async () => {
    const wrapper = getWrapper()
    await wrapper.find('.oc-search-input').setValue('whale')
    await wrapper.find('.oc-search-input').trigger('keydown.enter')

    expect(wrapper.emitted('goToNextResult')).toHaveLength(1)
  })

  it('focuses the search input when the drop is opened', async () => {
    const wrapper = mount(ReaderTextSearch, {
      attachTo: document.body,
      props: {
        toggle: '#epub_reader_text_search_toggle',
        searching: false,
        resultCount: 3,
        hasMoreResults: false,
        currentResultIndex: 1,
        canNavigateThroughResults: true
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          'oc-drop': true
        },
        renderStubDefaultSlot: true
      }
    })
    const searchInput = wrapper.find('.oc-search-input').element as HTMLInputElement

    await wrapper.find('oc-drop-stub').trigger('show-drop')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(searchInput)
    wrapper.unmount()
  })

  it('shows a plus when there are more results than displayed', async () => {
    const wrapper = mount(ReaderTextSearch, {
      props: {
        toggle: '#epub_reader_text_search_toggle',
        searching: false,
        resultCount: 300,
        hasMoreResults: true,
        currentResultIndex: 0,
        canNavigateThroughResults: true
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          'oc-drop': true
        },
        renderStubDefaultSlot: true
      }
    })

    await wrapper.find('.oc-search-input').setValue('whale')
    await vi.advanceTimersByTimeAsync(250)

    expect(wrapper.find('.epub-reader-search-result-count').text()).toBe('1/300+')
  })
})
