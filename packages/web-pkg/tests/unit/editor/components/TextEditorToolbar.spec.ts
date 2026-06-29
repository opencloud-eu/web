import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { vi } from 'vitest'
import TextEditorToolbar from '../../../../src/editor/components/TextEditorToolbar.vue'
import type { TextEditorInstance } from '../../../../src/editor/types'

function mountToolbar(sourceMode = false, contentType: 'markdown' | 'html' = 'markdown') {
  const textEditor = {
    editor: ref({}),
    contentType: ref<'markdown' | 'html'>(contentType),
    readonly: ref(false),
    state: { sourceMode: ref(sourceMode) },
    actionGroups: () => [
      {
        id: 'view-options',
        title: 'View options',
        actions: [
          {
            id: 'source-mode',
            title: 'Show source',
            icon: 'code-s-slash',
            toolbarAction: vi.fn()
          },
          {
            id: 'bold',
            title: 'Bold',
            icon: 'bold',
            toolbarAction: vi.fn()
          }
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

  const wrapper = mount(TextEditorToolbar, {
    global: {
      provide: { textEditor },
      directives: { 'oc-tooltip': () => {}, ocTooltip: () => {} },
      stubs: {
        'oc-drop': { template: '<div><slot /></div>' },
        'oc-button': defineComponent({
          inheritAttrs: false,
          template: '<button v-bind="$attrs"><slot /></button>'
        }),
        'oc-icon': true
      }
    }
  })

  return { wrapper, textEditor }
}

describe('TextEditorToolbar', () => {
  it('keeps regular actions enabled outside source mode', () => {
    const { wrapper } = mountToolbar(false)
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
  })

  it('disables all toolbar actions except source toggle in source mode', () => {
    const { wrapper } = mountToolbar(true)
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })

  it('disables all toolbar actions except source toggle in html source mode', () => {
    const { wrapper } = mountToolbar(true, 'html')
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })
})
