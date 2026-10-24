import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { vi } from 'vitest'
import TextEditorSearchAndReplacePanel from '../../../../src/editor/components/TextEditorSearchAndReplacePanel.vue'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

const announceMock = vi.fn()
// exposes a spy as the announce method, so the tests can check what gets announced
const OcHiddenAnnouncerStub = defineComponent({
  setup(_, { expose }) {
    expose({ announce: announceMock })
    return () => h('span')
  }
})

function createEditorMock() {
  const storage = {
    findAndReplace: {
      searchTerm: '',
      replaceTerm: '',
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
      results: [] as Array<{ from: number; to: number }>,
      currentIndex: null as number | null
    }
  }

  let transactionListener: (() => void) | null = null
  const editor = {
    storage,
    commands: {
      setSearchTerm: vi.fn(() => true),
      setReplaceTerm: vi.fn(() => true),
      setCaseSensitive: vi.fn(() => true),
      setUseRegex: vi.fn(() => true),
      setWholeWord: vi.fn(() => true),
      replace: vi.fn(() => true),
      replaceAll: vi.fn(() => true),
      clearSearch: vi.fn(() => true),
      goToNextResult: vi.fn(() => true),
      goToPreviousResult: vi.fn(() => true)
    },
    on: vi.fn((event: string, callback: () => void) => {
      if (event === 'transaction') {
        transactionListener = callback
      }
    }),
    off: vi.fn()
  }

  const triggerTransaction = () => {
    transactionListener?.()
  }

  return { editor: editor as any, triggerTransaction }
}

function createSearchProps() {
  return {
    searchSearchTerm: '',
    searchReplaceTerm: '',
    searchCaseSensitive: false,
    searchWholeWord: false
  }
}

describe('TextEditorSearchAndReplacePanel', () => {
  it('updates search and replace commands on input', async () => {
    const { editor } = createEditorMock()
    const wrapper = mount(TextEditorSearchAndReplacePanel, {
      props: {
        editor,
        closeMenu: vi.fn(),
        ...createSearchProps()
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcIcon: true }
      }
    })

    // Clear calls from onMounted
    editor.commands.setSearchTerm.mockClear()
    editor.commands.setReplaceTerm.mockClear()

    await wrapper.setProps({ searchSearchTerm: 'needle' })
    await wrapper.setProps({ searchReplaceTerm: 'replacement' })

    expect(editor.commands.setSearchTerm).toHaveBeenCalledWith('needle')
    expect(editor.commands.setReplaceTerm).toHaveBeenCalledWith('replacement')
  })

  it('calls navigation and replace commands', async () => {
    const { editor, triggerTransaction } = createEditorMock()
    const wrapper = mount(TextEditorSearchAndReplacePanel, {
      props: {
        editor,
        closeMenu: vi.fn(),
        ...createSearchProps(),
        searchSearchTerm: 'needle'
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcIcon: true }
      }
    })

    editor.storage.findAndReplace.searchTerm = 'needle'
    editor.storage.findAndReplace.results = [{ from: 1, to: 3 }]
    editor.storage.findAndReplace.currentIndex = 0
    triggerTransaction()
    await nextTick()

    await wrapper.find('[data-testid="editor-search-prev"]').trigger('click')
    await wrapper.find('[data-testid="editor-search-next"]').trigger('click')
    await wrapper.find('[data-testid="editor-search-replace"]').trigger('click')
    await wrapper.find('[data-testid="editor-search-replace-all"]').trigger('click')

    expect(editor.commands.goToPreviousResult).toHaveBeenCalled()
    expect(editor.commands.goToNextResult).toHaveBeenCalled()
    expect(editor.commands.replace).toHaveBeenCalled()
    expect(editor.commands.replaceAll).toHaveBeenCalled()
  })

  it('clears active search when closed via close button', async () => {
    const { editor } = createEditorMock()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorSearchAndReplacePanel, {
      props: {
        editor,
        closeMenu,
        ...createSearchProps()
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcIcon: true }
      }
    })

    const closeButton = wrapper.findAll('button')[2]
    await closeButton.trigger('click')

    expect(editor.commands.clearSearch).toHaveBeenCalled()
    expect(closeMenu).toHaveBeenCalled()
  })

  it('renders the current result position from editor storage updates', async () => {
    const { editor, triggerTransaction } = createEditorMock()
    const wrapper = mount(TextEditorSearchAndReplacePanel, {
      props: {
        editor,
        closeMenu: vi.fn(),
        ...createSearchProps(),
        searchSearchTerm: 'needle'
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcIcon: true }
      }
    })

    editor.storage.findAndReplace.results = [
      { from: 1, to: 3 },
      { from: 10, to: 12 }
    ]
    editor.storage.findAndReplace.currentIndex = 1
    triggerTransaction()
    await nextTick()

    expect(wrapper.find('[data-testid="editor-search-result-counter"]').text()).toBe('2 / 2')
  })

  describe('result announcement', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
      announceMock.mockReset()
    })

    function getWrapper(searchSearchTerm = 'needle') {
      const { editor, triggerTransaction } = createEditorMock()
      const wrapper = mount(TextEditorSearchAndReplacePanel, {
        props: {
          editor,
          closeMenu: vi.fn(),
          ...createSearchProps(),
          searchSearchTerm
        },
        global: {
          plugins: [...defaultPlugins()],
          stubs: { OcIcon: true, OcHiddenAnnouncer: OcHiddenAnnouncerStub }
        }
      })
      function setResults(results: Array<{ from: number; to: number }>, currentIndex = 0) {
        editor.storage.findAndReplace.results = results
        editor.storage.findAndReplace.currentIndex = results.length ? currentIndex : null
        triggerTransaction()
      }
      return { wrapper, editor, setResults }
    }

    const twoResults = [
      { from: 1, to: 3 },
      { from: 10, to: 12 }
    ]

    it('announces the current result once the search has settled', async () => {
      const { setResults } = getWrapper()
      setResults(twoResults)
      await nextTick()
      expect(announceMock).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenCalledTimes(1)
      expect(announceMock).toHaveBeenLastCalledWith('Result 1 of 2')
    })

    it('announces "No results" if the search term has no matches', async () => {
      const { setResults } = getWrapper('nothing')
      setResults([])
      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenLastCalledWith('No results')
    })

    it('only announces the latest result while typing', async () => {
      const { wrapper, setResults } = getWrapper('n')
      setResults(twoResults)
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.setProps({ searchSearchTerm: 'ne' })
      setResults([twoResults[0]])
      await vi.advanceTimersByTimeAsync(300)
      expect(announceMock).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenCalledTimes(1)
      expect(announceMock).toHaveBeenLastCalledWith('Result 1 of 1')
    })

    const navigationCommands: Record<string, string> = {
      next: 'goToNextResult',
      prev: 'goToPreviousResult'
    }

    it.each(['next', 'prev'])(
      'announces the current result after navigating to the %s result',
      async (button) => {
        const { wrapper, editor, setResults } = getWrapper()
        setResults(twoResults)
        await vi.runAllTimersAsync()
        expect(announceMock).toHaveBeenLastCalledWith('Result 1 of 2')

        editor.commands[navigationCommands[button]].mockImplementation(() => {
          setResults(twoResults, 1)
          return true
        })
        await wrapper.find(`[data-testid="editor-search-${button}"]`).trigger('click')
        await vi.runAllTimersAsync()
        expect(announceMock).toHaveBeenCalledTimes(2)
        expect(announceMock).toHaveBeenLastCalledWith('Result 2 of 2')
      }
    )

    it('announces the result again when navigating with a single match', async () => {
      const { wrapper, setResults } = getWrapper()
      setResults([twoResults[0]])
      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenCalledTimes(1)

      await wrapper.find('[data-testid="editor-search-next"]').trigger('click')
      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenCalledTimes(2)
      expect(announceMock).toHaveBeenLastCalledWith('Result 1 of 1')
    })

    it('announces nothing for an empty search term', async () => {
      const { setResults } = getWrapper('')
      setResults([])
      await vi.runAllTimersAsync()
      expect(announceMock).not.toHaveBeenCalledWith(expect.stringMatching(/.+/))
    })

    it('clears the announcement when the search term gets cleared', async () => {
      const { wrapper, setResults } = getWrapper()
      setResults(twoResults)
      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenLastCalledWith('Result 1 of 2')

      await wrapper.setProps({ searchSearchTerm: '' })
      await vi.runAllTimersAsync()
      expect(announceMock).toHaveBeenLastCalledWith('')
    })
  })
})
