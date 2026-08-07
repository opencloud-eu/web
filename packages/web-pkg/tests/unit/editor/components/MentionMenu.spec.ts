import { mount } from '@vue/test-utils'
import { createGettext } from 'vue3-gettext'
import { exitSuggestion } from '@tiptap/suggestion'
import { OcDrop } from '@opencloud-eu/design-system/components'
import MentionMenu from '../../../../src/editor/components/MentionMenu.vue'
import type { MentionItem } from '../../../../src/editor/types'

vi.mock('@tiptap/suggestion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tiptap/suggestion')>()),
  exitSuggestion: vi.fn()
}))

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

function mountMenu({
  items = [],
  command = vi.fn<(item: MentionItem) => void>(),
  editor = { isDestroyed: false, view: {} } as any,
  loading = false
}: {
  items?: MentionItem[]
  command?: (item: MentionItem) => void
  editor?: any
  loading?: boolean
} = {}) {
  return mount(MentionMenu, {
    props: {
      items,
      command,
      editor,
      loading,
      range: { from: 0, to: 0 },
      query: '',
      text: '@',
      decorationNode: null,
      clientRect: defaultClientRect,
      placement: 'bottom-start',
      offset: { mainAxis: 4, crossAxis: 0 },
      flip: true,
      floatingUi: {} as any,
      mount: () => () => undefined
    },
    global: {
      plugins: [createGettext({ translations: {}, silent: true })],
      renderStubDefaultSlot: true,
      stubs: {
        OcDrop: true,
        UserAvatar: true,
        'oc-button': { template: '<button v-bind="$attrs"><slot /></button>' },
        'oc-spinner': true
      }
    }
  })
}

function keyEvent(key: string): KeyboardEvent {
  return { key, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as KeyboardEvent
}

describe('MentionMenu', () => {
  const items = [
    { id: 'alice', label: 'Alice' },
    { id: 'bob', label: 'Bob' }
  ]

  it('renders mentionable users', () => {
    const wrapper = mountMenu({ items })

    expect(
      wrapper.findAll('.text-editor-mention-menu__item-label').map((item) => item.text())
    ).toEqual(['Alice', 'Bob'])
  })

  it('renders loading and empty states', async () => {
    const wrapper = mountMenu({ loading: true })
    expect(wrapper.find('oc-spinner-stub').exists()).toBe(true)

    await wrapper.setProps({ loading: false })
    expect(wrapper.find('.text-editor-mention-menu__status').text()).toBe('No matching people')
  })

  it('selects a user by click', async () => {
    const command = vi.fn()
    const wrapper = mountMenu({ items, command })

    await wrapper.findAll('.text-editor-mention-menu__item')[1].trigger('click')

    expect(command).toHaveBeenCalledWith(items[1])
  })

  it('supports keyboard navigation and selection', () => {
    const command = vi.fn()
    const wrapper = mountMenu({ items, command })

    expect(wrapper.vm.onKeyDown(keyEvent('ArrowDown'))).toBe(true)
    expect(wrapper.vm.onKeyDown(keyEvent('Enter'))).toBe(true)
    expect(command).toHaveBeenCalledWith(items[1])
  })

  it('exits only the mention suggestion when the drop closes', () => {
    const editor = { isDestroyed: false, view: {} } as any
    const wrapper = mountMenu({ items, editor })

    wrapper.findComponent<typeof OcDrop>('oc-drop-stub').vm.$emit('hideDrop')

    expect(exitSuggestion).toHaveBeenCalledWith(editor.view, expect.anything())
  })
})
