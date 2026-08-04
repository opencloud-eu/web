import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { vi } from 'vitest'
import TextEditorSearchAndReplacePanel from '../../../../src/editor/components/TextEditorSearchAndReplacePanel.vue'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

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
})
