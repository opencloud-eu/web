import { mount } from '@vue/test-utils'
import { nextTick, shallowRef } from 'vue'
import type { TableOfContentData } from '@tiptap/extension-table-of-contents'
import type { TextEditorInstance } from '../../../../src/editor/types'
import TextEditorTableOfContents from '../../../../src/editor/components/TextEditorTableOfContents.vue'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

function createItem({ id, textContent, level, top }: Record<string, any>) {
  const dom = document.createElement('h1')
  document.body.appendChild(dom)
  dom.scrollIntoView = vi.fn()
  dom.getBoundingClientRect = () => ({ top }) as DOMRect
  return { id, textContent, level, dom } as unknown as TableOfContentData[number]
}

async function getWrapper({ items = [] as TableOfContentData, expanded = true } = {}) {
  const tableOfContents = shallowRef<TableOfContentData>(items)
  const scrollContainer = document.createElement('div')
  scrollContainer.getBoundingClientRect = () => ({ top: 0 }) as DOMRect

  const editor = {
    state: { tableOfContents }
  } as unknown as TextEditorInstance

  const wrapper = mount(TextEditorTableOfContents, {
    props: { editor, scrollContainer },
    global: { plugins: [...defaultPlugins()] }
  })

  if (expanded) {
    await wrapper.find('.text-editor-table-of-contents-toggle').trigger('click')
  }

  return { wrapper, tableOfContents, scrollContainer }
}

const headings = () => [
  createItem({ id: 'a', textContent: 'Title', level: 1, top: 0 }),
  createItem({ id: 'b', textContent: 'Section', level: 2, top: 500 }),
  createItem({ id: 'c', textContent: 'Other', level: 2, top: 1000 })
]

describe('TextEditorTableOfContents', () => {
  it('shows a hint instead of an outline without headings', async () => {
    const { wrapper } = await getWrapper()

    expect(wrapper.find('nav').exists()).toBe(true)
    expect(wrapper.find('.text-editor-table-of-contents-empty').text()).toBe(
      'Start editing your document to see the outline.'
    )
    expect(wrapper.find('.text-editor-table-of-contents-item').exists()).toBe(false)
  })

  it('replaces the hint once headings appear', async () => {
    const { wrapper, tableOfContents } = await getWrapper()

    tableOfContents.value = headings()
    await nextTick()

    expect(wrapper.find('.text-editor-table-of-contents-empty').exists()).toBe(false)
    expect(wrapper.findAll('.text-editor-table-of-contents-item')).toHaveLength(3)
  })

  it('lists the headings, indented by level', async () => {
    const { wrapper } = await getWrapper({
      items: [...headings(), createItem({ id: 'd', textContent: 'Deep', level: 3, top: 1500 })]
    })
    const entries = wrapper.findAll('.text-editor-table-of-contents-item')

    expect(entries.map((entry) => entry.text())).toEqual(['Title', 'Section', 'Other', 'Deep'])
    expect(entries[0].attributes('style')).toContain('padding-left: 0.5rem')
    expect(entries[1].attributes('style')).toContain('padding-left: 1.25rem')
    expect(entries[3].attributes('style')).toContain('padding-left: 2rem')
  })

  it('follows changes to the headings', async () => {
    const { wrapper, tableOfContents } = await getWrapper({ items: headings() })

    tableOfContents.value = [createItem({ id: 'd', textContent: 'New', level: 1, top: 0 })]
    await nextTick()

    expect(wrapper.findAll('.text-editor-table-of-contents-item').map((e) => e.text())).toEqual([
      'New'
    ])
  })

  it('starts collapsed and expands and collapses on toggle', async () => {
    const { wrapper } = await getWrapper({ items: headings(), expanded: false })
    const toggle = wrapper.find('.text-editor-table-of-contents-toggle')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.text-editor-table-of-contents-item').exists()).toBe(false)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('.text-editor-table-of-contents-item')).toHaveLength(3)

    await toggle.trigger('click')
    expect(wrapper.find('.text-editor-table-of-contents-item').exists()).toBe(false)
  })

  it('scrolls to a heading on click and marks it active', async () => {
    const items = headings()
    const { wrapper } = await getWrapper({ items })

    await wrapper.findAll('.text-editor-table-of-contents-item')[2].trigger('click')

    expect(items[2].dom.scrollIntoView).toHaveBeenCalled()
    expect(
      wrapper.findAll('.text-editor-table-of-contents-item')[2].attributes('aria-current')
    ).toBe('location')
  })

  it('marks the last heading scrolled past as active', async () => {
    const items = headings()
    const { wrapper, scrollContainer } = await getWrapper({ items })
    const active = () => wrapper.find('[aria-current="location"]').text()

    expect(active()).toBe('Title')

    items[0].dom.getBoundingClientRect = () => ({ top: -600 }) as DOMRect
    items[1].dom.getBoundingClientRect = () => ({ top: -100 }) as DOMRect
    items[2].dom.getBoundingClientRect = () => ({ top: 400 }) as DOMRect
    scrollContainer.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(active()).toBe('Section')
  })
})
