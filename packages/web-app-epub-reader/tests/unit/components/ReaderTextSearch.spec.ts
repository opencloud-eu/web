import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import ReaderTextSearch from '../../../src/components/ReaderTextSearch.vue'

function getWrapper() {
  return mount(ReaderTextSearch, {
    props: {
      toggle: '#epub_reader_text_search_toggle',
      searchLabel: 'Search in book',
      searchPlaceholder: 'Search in book',
      searching: false,
      searchingLabel: 'Searching...',
      resultCount: 3,
      currentResultIndex: 1,
      canGoToPreviousResult: true,
      canGoToNextResult: true,
      previousResultLabel: 'Navigate to previous search result',
      nextResultLabel: 'Navigate to next search result',
      closeSearchLabel: 'Close search'
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
  it('shows empty status when query is empty', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.epub-reader-search-result-count').text()).toBe('')
  })

  it('emits search term updates', async () => {
    const wrapper = getWrapper()
    await wrapper.find('.oc-search-input').setValue('whale')

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
        searchLabel: 'Search in book',
        searchPlaceholder: 'Search in book',
        searching: false,
        searchingLabel: 'Searching...',
        resultCount: 0,
        currentResultIndex: -1,
        canGoToPreviousResult: false,
        canGoToNextResult: false,
        previousResultLabel: 'Navigate to previous search result',
        nextResultLabel: 'Navigate to next search result',
        closeSearchLabel: 'Close search'
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
        searchLabel: 'Search in book',
        searchPlaceholder: 'Search in book',
        searching: false,
        searchingLabel: 'Searching...',
        resultCount: 3,
        currentResultIndex: 1,
        canGoToPreviousResult: true,
        canGoToNextResult: true,
        previousResultLabel: 'Navigate to previous search result',
        nextResultLabel: 'Navigate to next search result',
        closeSearchLabel: 'Close search'
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
})
