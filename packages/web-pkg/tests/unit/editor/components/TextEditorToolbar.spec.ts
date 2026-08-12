import { mount } from '@vue/test-utils'
import { computed, defineComponent, ref } from 'vue'
import { vi } from 'vitest'
import TextEditorToolbar from '../../../../src/editor/components/TextEditorToolbar.vue'
import type { TextEditorInstance } from '../../../../src/editor/types'
import type { EditorAction } from '../../../../src/editor/composables'

function mountToolbar(
  sourceMode = false,
  contentType: 'markdown' | 'html' = 'markdown',
  includeSearchAction = false
) {
  const showSpy = vi.fn()

  const actions: EditorAction[] = [
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

  if (includeSearchAction) {
    actions.push({
      id: 'menu-search-and-replace',
      title: 'Search and replace',
      icon: 'seo',
      menuComponent: defineComponent({ template: '<div>search</div>' })
    })
  }

  const isFocusedRef = ref(true)
  const textEditor = {
    editor: ref({}),
    contentType: ref<'markdown' | 'html'>(contentType),
    readonly: ref(false),
    state: { sourceMode: ref(sourceMode), editorZoom: ref(100) },
    isFocused: computed(() => isFocusedRef.value),
    actionGroups: () => [
      {
        id: 'view-options',
        title: 'View options',
        actions
      }
    ],
    getContent: vi.fn(() => ''),
    isEmpty: ref(false),
    focus: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn()
  } as unknown as TextEditorInstance

  const wrapper = mount(TextEditorToolbar, {
    attachTo: document.body,
    global: {
      provide: { textEditor },
      directives: { 'oc-tooltip': () => {}, ocTooltip: () => {} },
      stubs: {
        'oc-drop': defineComponent({
          setup(_, { expose }) {
            expose({ show: showSpy, hide: vi.fn() })
            return {}
          },
          template: '<div><slot /></div>'
        }),
        'oc-button': defineComponent({
          inheritAttrs: false,
          template: '<button v-bind="$attrs"><slot /></button>'
        }),
        'oc-icon': true
      }
    }
  })

  return { wrapper, textEditor, isFocusedRef, showSpy }
}

describe('TextEditorToolbar', () => {
  it('keeps regular actions enabled outside source mode', () => {
    const { wrapper } = mountToolbar(false)
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('disables all toolbar actions except source toggle in source mode', () => {
    const { wrapper } = mountToolbar(true)
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('disables all toolbar actions except source toggle in html source mode', () => {
    const { wrapper } = mountToolbar(true, 'html')
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('opens search menu on Ctrl+F when editor is focused', async () => {
    const { wrapper, showSpy, isFocusedRef } = mountToolbar(false, 'markdown', true)
    isFocusedRef.value = true

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(showSpy).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('opens search menu on Cmd+F when editor is focused', async () => {
    const { wrapper, showSpy, isFocusedRef } = mountToolbar(false, 'markdown', true)
    isFocusedRef.value = true

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(showSpy).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('does not open search menu on Ctrl+F when editor is not focused', async () => {
    const { wrapper, showSpy, isFocusedRef } = mountToolbar(false, 'markdown', true)
    isFocusedRef.value = false

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    await wrapper.vm.$nextTick()
    expect(showSpy).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
