import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { vi } from 'vitest'
import type { TextEditorInstance } from '../../../../src/editor/types'

vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: {
    template: '<div data-testid="bubble-menu"><slot /></div>'
  }
}))

import TextEditorTableBubbleMenu from '../../../../src/editor/components/TextEditorTableBubbleMenu.vue'

function createAction(id: string, title: string) {
  return {
    id,
    title,
    icon: id,
    toolbarAction: vi.fn()
  }
}

function mountTableBubbleMenu() {
  const textEditor = {
    editor: ref({}),
    readonly: ref(false),
    contentType: ref<'markdown' | 'html'>('markdown'),
    state: { sourceMode: ref(false), editorZoom: ref(100) },
    actionGroups: () => [
      {
        id: 'insert',
        title: 'Insert',
        actions: [
          createAction('add-row-before', 'Add row above'),
          createAction('add-row-after', 'Add row below'),
          createAction('delete-row', 'Delete row'),
          createAction('add-column-before', 'Add column left'),
          createAction('add-column-after', 'Add column right'),
          createAction('delete-column', 'Delete column'),
          createAction('delete-table', 'Delete table')
        ]
      }
    ],
    getContent: vi.fn(() => ''),
    isEmpty: ref(false),
    isFocused: ref(false),
    focus: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn()
  } as unknown as TextEditorInstance

  return mount(TextEditorTableBubbleMenu, {
    global: {
      provide: { textEditor },
      directives: { 'oc-tooltip': () => {}, ocTooltip: () => {} },
      stubs: {
        'oc-button': {
          template: '<button v-bind="$attrs"><slot /></button>'
        },
        'oc-icon': true
      }
    }
  })
}

describe('TextEditorTableBubbleMenu', () => {
  it('renders row, column and table-delete action groups', () => {
    const wrapper = mountTableBubbleMenu()
    const groups = wrapper.findAll('[data-testid="bubble-menu"] > div > div')

    expect(groups).toHaveLength(3)
    expect(groups[0].classes()).not.toContain('border-l')
    expect(groups[1].classes()).toContain('border-l')
    expect(groups[2].classes()).toContain('border-l')
  })

  it('renders delete table as the right-most standalone group action', () => {
    const wrapper = mountTableBubbleMenu()
    const groups = wrapper.findAll('[data-testid="bubble-menu"] > div > div')
    const rightMostButtons = groups[2].findAll('button')

    expect(rightMostButtons).toHaveLength(1)
    expect(rightMostButtons[0].attributes('aria-label')).toBe('Delete table')
  })
})
