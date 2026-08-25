import { mount } from '@vue/test-utils'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'
import { defineComponent } from 'vue'
import { vi } from 'vitest'
import CodeBlockComponent from '../../../../src/editor/components/CodeBlockComponent.vue'

vi.mock('@tiptap/vue-3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/vue-3')>()

  return {
    ...actual,
    NodeViewContent: defineComponent({
      name: 'NodeViewContent',
      template: '<div class="mock-node-view-content" />'
    }),
    NodeViewWrapper: defineComponent({
      name: 'NodeViewWrapper',
      template: '<div class="mock-node-view-wrapper"><slot /></div>'
    }),
    nodeViewProps: {
      editor: { type: Object, required: true },
      node: { type: Object, required: true },
      extension: { type: Object, required: true },
      updateAttributes: { type: Function, required: true }
    }
  }
})

function mountCodeBlock(isEditable: boolean) {
  const updateAttributes = vi.fn()

  const wrapper = mount(CodeBlockComponent, {
    props: {
      view: {} as any,
      selected: false,
      editor: { isEditable } as any,
      node: { attrs: { language: null } } as any,
      decorations: [],
      innerDecorations: {} as any,
      extension: {
        options: {
          lowlight: {
            listLanguages: () => ['javascript', 'typescript']
          }
        }
      } as any,
      getPos: () => 0,
      deleteNode: vi.fn(),
      updateAttributes,
      HTMLAttributes: {}
    },
    global: {
      plugins: [...defaultPlugins()]
    }
  })

  return { wrapper, updateAttributes }
}

describe('CodeBlockComponent', () => {
  it('disables language select in readonly mode', () => {
    const { wrapper } = mountCodeBlock(false)
    const select = wrapper.find('.text-editor-code-block-select')

    expect(select.attributes('disabled')).toBeDefined()
  })

  it('updates language when editor is editable', async () => {
    const { wrapper, updateAttributes } = mountCodeBlock(true)
    const select = wrapper.find('.text-editor-code-block-select')

    await select.setValue('typescript')

    expect(updateAttributes).toHaveBeenCalledWith({ language: 'typescript' })
  })
})
