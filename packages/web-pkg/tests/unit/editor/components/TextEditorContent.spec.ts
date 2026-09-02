import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { TextEditorInstance, TextEditorLinkPanelRequest } from '../../../../src/editor/types'
import TextEditorContent from '../../../../src/editor/components/TextEditorContent.vue'
import { EditorActionGroup } from '../../../../src/editor/composables'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

vi.mock('@tiptap/vue-3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/vue-3')>()

  return {
    ...actual,
    EditorContent: defineComponent({
      name: 'EditorContent',
      props: { editor: { type: Object, required: false } },
      template: '<div class="mock-editor-content" />'
    })
  }
})

vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: {
    template: '<div class="mock-bubble-menu"><slot /></div>'
  }
}))

vi.mock('@tiptap/extension-drag-handle-vue-3', () => ({
  DragHandle: defineComponent({
    name: 'DragHandle',
    props: { editor: { type: Object, required: false } },
    emits: ['node-change'],
    template: '<div class="mock-drag-handle"><slot /></div>'
  })
}))

function mountEditorContent({
  contentType = 'markdown',
  sourceMode = false,
  content = '# Initial',
  hasSlashCommands = false
}: {
  contentType?: 'markdown' | 'html'
  sourceMode?: boolean
  content?: string
  hasSlashCommands?: boolean
} = {}) {
  const setContent = vi.fn()
  const insertContent = vi.fn()
  const registerPlugin = vi.fn()
  const unregisterPlugin = vi.fn()
  const run = vi.fn()

  const chain = vi.fn(() => ({
    focus: vi.fn(() => ({
      insertContentAt: vi.fn(() => ({
        setTextSelection: vi.fn(() => ({
          insertContent: vi.fn(() => ({ run }))
        }))
      })),
      setTextSelection: vi.fn(() => ({
        insertContent: vi.fn(() => ({ run }))
      }))
    }))
  }))

  const textEditor = {
    editor: ref({
      commands: { setContent, insertContent },
      registerPlugin,
      unregisterPlugin,
      getAttributes: vi.fn(() => ({})),
      isActive: vi.fn(() => false),
      chain,
      state: {
        doc: {
          nodeAt: vi.fn((pos: number) => ({
            content: { size: pos > 0 ? 10 : 0 },
            nodeSize: 10
          }))
        }
      },
      extensionManager: {
        extensions: hasSlashCommands ? [{ name: 'slashCommands' }] : []
      }
    }),
    contentType: ref(contentType),
    readonly: ref(false),
    state: {
      sourceMode: ref(sourceMode),
      linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
      editorZoom: ref(100)
    },
    actionGroups: (): EditorActionGroup[] => [],
    actions: vi.fn(() => ({})),
    getContent: vi.fn(() => content),
    isEmpty: ref(false),
    isFocused: ref(false),
    focus: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn()
  } as unknown as TextEditorInstance

  const wrapper = mount(TextEditorContent, {
    global: {
      plugins: [...defaultPlugins()],
      provide: { textEditor }
    }
  })

  return { wrapper, textEditor, setContent, chain, run }
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

  it('shows plus button only when slash commands extension is available', () => {
    const { wrapper } = mountEditorContent({ hasSlashCommands: true })
    expect(wrapper.find('.drag-handle-plus-button').exists()).toBe(true)

    const { wrapper: wrapperWithout } = mountEditorContent({ hasSlashCommands: false })
    expect(wrapperWithout.find('.drag-handle-plus-button').exists()).toBe(false)
  })

  it('hides the drag handle controls on the frontmatter block', async () => {
    const { wrapper } = mountEditorContent({ hasSlashCommands: true })
    const dragHandle = wrapper.findComponent({ name: 'DragHandle' })
    const controlsStyle = () => wrapper.find('.drag-handle-controls').attributes('style') ?? ''

    dragHandle.vm.$emit('node-change', { pos: 0, node: { type: { name: 'paragraph' } } })
    await nextTick()
    expect(controlsStyle()).not.toContain('display: none')

    dragHandle.vm.$emit('node-change', { pos: 0, node: { type: { name: 'frontmatter' } } })
    await nextTick()
    expect(controlsStyle()).toContain('display: none')

    dragHandle.vm.$emit('node-change', { pos: 0, node: null })
    await nextTick()
    expect(controlsStyle()).not.toContain('display: none')
  })

  it('opens slash menu when plus button is clicked', async () => {
    const { wrapper, chain, run } = mountEditorContent({ hasSlashCommands: true })

    // Simulate the drag handle node change event that sets the current position
    const dragHandle = wrapper.findComponent({ name: 'DragHandle' })
    dragHandle.vm.$emit('node-change', { pos: 0 })
    await nextTick()

    const plusButton = wrapper.find('.drag-handle-plus-button')
    expect(plusButton.exists()).toBe(true)

    await plusButton.trigger('click')

    expect(chain).toHaveBeenCalled()
    expect(run).toHaveBeenCalled()
  })
})
