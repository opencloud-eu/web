import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TextEditorTableSizeSelector from '../../../../src/editor/components/TextEditorTableSizeSelector.vue'

describe('TextEditorTableSizeSelector', () => {
  function createEditor() {
    return new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader
      ]
    })
  }

  it('renders a 10x10 grid', () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const grid = wrapper.find('.grid')
    expect(grid.exists()).toBe(true)
  })

  it('shows empty label initially', () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const label = wrapper.find('.text-role-on-surface-variant')
    expect(label.text()).toBe('')
  })

  it('updates label on hover', async () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const cells = wrapper.findAll('.grid > div')
    // Hover over first cell
    await cells[0].trigger('mouseenter')
    const label = wrapper.find('.text-role-on-surface-variant')
    expect(label.text()).toMatch(/\d+ × \d+/)
  })

  it('highlights cells on hover', async () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const cells = wrapper.findAll('.grid > div')
    await cells[11].trigger('mouseenter')

    const highlightedCells = wrapper.findAll('.border-role-primary')
    expect(highlightedCells.length).toBeGreaterThan(0)
  })

  it('resets highlight on mouse leave', async () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const grid = wrapper.find('.grid')
    const cells = wrapper.findAll('.grid > div')

    // First hover
    await cells[11].trigger('mouseenter')
    expect(wrapper.findAll('.border-role-primary').length).toBeGreaterThan(0)

    // Mouse leave
    await grid.trigger('mouseleave')
    expect(wrapper.findAll('.border-role-primary').length).toBe(0)
  })

  it('inserts table and closes menu on click after hover', async () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const cells = wrapper.findAll('.grid > div')
    // Hover and click
    await cells[23].trigger('mouseenter')
    await cells[23].trigger('click')

    expect(closeMenu).toHaveBeenCalled()
  })

  it('does not insert table when clicking without hover', async () => {
    const editor = createEditor()
    const closeMenu = vi.fn()
    const wrapper = mount(TextEditorTableSizeSelector, {
      props: { editor, closeMenu }
    })

    const cells = wrapper.findAll('.grid > div')
    await cells[0].trigger('click')

    expect(closeMenu).not.toHaveBeenCalled()
  })
})
