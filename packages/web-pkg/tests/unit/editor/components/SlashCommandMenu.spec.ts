import { mount } from '@vue/test-utils'
import SlashCommandMenu from '../../../../src/editor/components/SlashCommandMenu.vue'
import type { FlatSlashCommandItem } from '../../../../src/editor/extensions'

const makeItem = (
  id: string,
  groupId: string,
  groupTitle: string,
  extras: Partial<FlatSlashCommandItem> = {}
): FlatSlashCommandItem => ({
  id,
  title: `Item ${id}`,
  groupId,
  groupTitle,
  command: vi.fn(),
  ...extras
})

const defaultClientRect = () =>
  ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({})
  }) as DOMRect

function mountMenu(items: FlatSlashCommandItem[], command = vi.fn()) {
  return mount(SlashCommandMenu, {
    props: {
      items,
      command,
      editor: {} as any,
      range: { from: 0, to: 0 },
      query: '',
      text: '/',
      decorationNode: null,
      clientRect: defaultClientRect
    },
    global: {
      stubs: {
        'oc-drop': { template: '<div><slot /></div>' },
        'oc-icon': true
      }
    }
  })
}

describe('SlashCommandMenu', () => {
  it('renders grouped items', () => {
    const items = [
      makeItem('a', 'basic', 'Basic'),
      makeItem('b', 'basic', 'Basic'),
      makeItem('c', 'lists', 'Lists')
    ]
    const wrapper = mountMenu(items)
    const groupTitles = wrapper
      .findAll('.text-editor-slash-menu__group-title')
      .map((el) => el.text())
    expect(groupTitles).toEqual(['Basic', 'Lists'])
    const itemTitles = wrapper.findAll('.text-editor-slash-menu__item-title').map((el) => el.text())
    expect(itemTitles).toEqual(['Item a', 'Item b', 'Item c'])
  })

  it('renders the empty state when there are no items', () => {
    const wrapper = mountMenu([])
    expect(wrapper.find('.text-editor-slash-menu__empty').exists()).toBe(true)
  })

  it('executes command when an item is clicked', async () => {
    const command = vi.fn()
    const items = [makeItem('a', 'g', 'G')]
    const wrapper = mountMenu(items, command)
    await wrapper.find('.text-editor-slash-menu__item').trigger('click')
    expect(command).toHaveBeenCalledWith(items[0])
  })

  it('ArrowDown moves selection forward with wrap-around', async () => {
    const items = [makeItem('a', 'g', 'G'), makeItem('b', 'g', 'G')]
    const wrapper = mountMenu(items)
    expect(wrapper.vm.onKeyDown({ event: { key: 'ArrowDown' } as KeyboardEvent } as any)).toBe(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.text-editor-slash-menu__item')[1].classes()).toContain('is-selected')
    wrapper.vm.onKeyDown({ event: { key: 'ArrowDown' } as KeyboardEvent } as any)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.text-editor-slash-menu__item')[0].classes()).toContain('is-selected')
  })

  it('ArrowUp moves selection backward with wrap-around', async () => {
    const items = [makeItem('a', 'g', 'G'), makeItem('b', 'g', 'G')]
    const wrapper = mountMenu(items)
    wrapper.vm.onKeyDown({ event: { key: 'ArrowUp' } as KeyboardEvent } as any)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.text-editor-slash-menu__item')[1].classes()).toContain('is-selected')
  })

  it('Enter executes the selected item and returns true', () => {
    const command = vi.fn()
    const items = [makeItem('a', 'g', 'G'), makeItem('b', 'g', 'G')]
    const wrapper = mountMenu(items, command)
    wrapper.vm.onKeyDown({ event: { key: 'ArrowDown' } as KeyboardEvent } as any)
    const handled = wrapper.vm.onKeyDown({ event: { key: 'Enter' } as KeyboardEvent } as any)
    expect(handled).toBe(true)
    expect(command).toHaveBeenCalledWith(items[1])
  })

  it('Tab executes the selected item', () => {
    const command = vi.fn()
    const items = [makeItem('a', 'g', 'G')]
    const wrapper = mountMenu(items, command)
    wrapper.vm.onKeyDown({ event: { key: 'Tab' } as KeyboardEvent } as any)
    expect(command).toHaveBeenCalledWith(items[0])
  })

  it('Escape is not handled so the suggestion plugin can close itself', () => {
    const items = [makeItem('a', 'g', 'G')]
    const wrapper = mountMenu(items)
    const handled = wrapper.vm.onKeyDown({ event: { key: 'Escape' } as KeyboardEvent } as any)
    expect(handled).toBe(false)
  })

  it('Enter on an empty list returns false and does not call command', () => {
    const command = vi.fn()
    const wrapper = mountMenu([], command)
    const handled = wrapper.vm.onKeyDown({ event: { key: 'Enter' } as KeyboardEvent } as any)
    expect(handled).toBe(false)
    expect(command).not.toHaveBeenCalled()
  })
})
