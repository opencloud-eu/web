import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { computed } from 'vue'
import { Editor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import TextEditorTableSizeSelector from '../../../../src/editor/components/TextEditorTableSizeSelector.vue'
import TextEditorTableSizeSelectorMobile from '../../../../src/editor/components/TextEditorTableSizeSelectorMobile.vue'

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useIsMobile: vi.fn()
}))

const selectors = {
  grid: '.table-size-selector-grid',
  cells: '.table-size-selector-grid > div',
  highlightedCells: '.table-size-selector-grid > .border-role-primary',
  label: '.table-size-selector-desktop .text-role-on-surface-variant'
}

describe('TextEditorTableSizeSelector', () => {
  let wrapper: VueWrapper
  let editor: Editor

  afterEach(() => {
    wrapper?.unmount()
    editor?.destroy()
  })

  function mountSelector({ isMobile = false } = {}) {
    vi.mocked(useIsMobile).mockReturnValue({
      isMobile: computed(() => isMobile),
      isTablet: computed(() => false)
    })

    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader
      ]
    })
    const closeMenu = vi.fn()
    wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu },
      global: {
        stubs: { 'text-editor-table-size-selector-mobile': true }
      }
    })

    return { wrapper, editor, closeMenu }
  }

  function getTable(editor: Editor): JSONContent | undefined {
    return editor.getJSON().content?.find(({ type }) => type === 'table')
  }

  it('renders a 9x9 hover grid on non-mobile viewports', () => {
    const { wrapper } = mountSelector()

    expect(wrapper.findAll(selectors.cells)).toHaveLength(81)
    expect(wrapper.findComponent(TextEditorTableSizeSelectorMobile).exists()).toBe(false)
  })

  it('renders the mobile picker instead of the hover grid on mobile viewports', () => {
    const { wrapper } = mountSelector({ isMobile: true })

    expect(wrapper.find(selectors.grid).exists()).toBe(false)
    expect(wrapper.findComponent(TextEditorTableSizeSelectorMobile).exists()).toBe(true)
  })

  it('inserts the size the mobile picker asks for', async () => {
    const { wrapper, editor, closeMenu } = mountSelector({ isMobile: true })

    await wrapper.findComponent(TextEditorTableSizeSelectorMobile).vm.$emit('insertTable', 4, 5)

    expect(closeMenu).toHaveBeenCalled()
    expect(getTable(editor)?.content).toHaveLength(4)
    expect(getTable(editor)?.content?.[0].content).toHaveLength(5)
  })

  it('shows empty label initially', () => {
    const { wrapper } = mountSelector()

    expect(wrapper.find(selectors.label).text()).toBe('')
  })

  it('updates label on hover', async () => {
    const { wrapper } = mountSelector()

    await wrapper.findAll(selectors.cells)[0].trigger('mouseenter')

    expect(wrapper.find(selectors.label).text()).toMatch(/\d+ × \d+/)
  })

  it('highlights cells on hover', async () => {
    const { wrapper } = mountSelector()

    await wrapper.findAll(selectors.cells)[11].trigger('mouseenter')

    expect(wrapper.findAll(selectors.highlightedCells).length).toBeGreaterThan(0)
  })

  it('resets highlight on mouse leave', async () => {
    const { wrapper } = mountSelector()

    await wrapper.findAll(selectors.cells)[11].trigger('mouseenter')
    expect(wrapper.findAll(selectors.highlightedCells).length).toBeGreaterThan(0)

    await wrapper.find(selectors.grid).trigger('mouseleave')
    expect(wrapper.findAll(selectors.highlightedCells)).toHaveLength(0)
  })

  it('inserts table and closes menu on click after hover', async () => {
    const { wrapper, editor, closeMenu } = mountSelector()

    const cells = wrapper.findAll(selectors.cells)
    await cells[23].trigger('mouseenter')
    await cells[23].trigger('click')

    expect(closeMenu).toHaveBeenCalled()
    expect(getTable(editor)?.content).toHaveLength(3)
    expect(getTable(editor)?.content?.[0].content).toHaveLength(6)
  })

  it('does not insert table when clicking without hover', async () => {
    const { wrapper, editor, closeMenu } = mountSelector()

    await wrapper.findAll(selectors.cells)[0].trigger('click')

    expect(closeMenu).not.toHaveBeenCalled()
    expect(getTable(editor)).toBeUndefined()
  })
})
