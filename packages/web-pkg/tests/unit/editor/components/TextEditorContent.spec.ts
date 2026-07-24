import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { TextEditorInstance } from '../../../../src/editor/types'
import TextEditorContent from '../../../../src/editor/components/TextEditorContent.vue'
import { EditorActionGroup } from '../../../../src/editor/composables'

vi.mock('@tiptap/vue-3', () => ({
  EditorContent: defineComponent({
    name: 'EditorContent',
    props: { editor: { type: Object, required: false } },
    template: '<div class="mock-editor-content" />'
  })
}))

vi.mock('@tiptap/extension-drag-handle-vue-3', () => ({
  DragHandle: defineComponent({
    name: 'DragHandle',
    props: { editor: { type: Object, required: false } },
    template: '<div class="mock-drag-handle"><slot /></div>'
  })
}))

function mountEditorContent({
  contentType = 'markdown',
  sourceMode = false,
  content = '# Initial'
}: {
  contentType?: 'markdown' | 'html'
  sourceMode?: boolean
  content?: string
} = {}) {
  const setContent = vi.fn()
  const textEditor = {
    editor: ref({
      commands: { setContent }
    }),
    contentType: ref(contentType),
    readonly: ref(false),
    state: {
      sourceMode: ref(sourceMode)
    },
    actionGroups: (): EditorActionGroup[] => [],
    getContent: vi.fn(() => content),
    isEmpty: ref(false),
    isFocused: ref(false),
    focus: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn()
  } as unknown as TextEditorInstance

  const wrapper = mount(TextEditorContent, {
    global: {
      provide: { textEditor }
    }
  })

  return { wrapper, textEditor, setContent }
}

describe('TextEditorContent', () => {
  it('shows raw markdown in source mode and updates editor content while typing', async () => {
    const { wrapper, textEditor, setContent } = mountEditorContent()

    textEditor.state.sourceMode.value = true
    await nextTick()

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('# Initial')

    await textarea.setValue('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(setContent).toHaveBeenCalledWith('| a | b |\n|---|---|\n| 1 | 2 |', {
      contentType: 'markdown',
      emitUpdate: true
    })

    textEditor.state.sourceMode.value = false
    await nextTick()

    expect(setContent).toHaveBeenCalledWith('| a | b |\n|---|---|\n| 1 | 2 |', {
      contentType: 'markdown',
      emitUpdate: true
    })
  })

  it('does not show source textarea for non-markdown content', async () => {
    const { wrapper, textEditor } = mountEditorContent({ contentType: 'html' })

    textEditor.state.sourceMode.value = true
    await nextTick()

    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('updates editor content as html in source mode', async () => {
    const { wrapper, textEditor, setContent } = mountEditorContent({
      contentType: 'html',
      content: '<p>Initial</p>'
    })

    textEditor.state.sourceMode.value = true
    await nextTick()

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('<p>Initial</p>')

    await textarea.setValue('<h1>Hello</h1><p>World</p>')
    expect(setContent).toHaveBeenCalledWith('<h1>Hello</h1><p>World</p>', {
      contentType: 'html',
      emitUpdate: true
    })
  })
})
