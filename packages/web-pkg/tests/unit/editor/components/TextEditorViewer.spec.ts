import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, unref } from 'vue'
import type { Ref } from 'vue'
import TextEditorViewer from '../../../../src/editor/components/TextEditorViewer.vue'
import { useTextEditor } from '../../../../src/editor/composables'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

vi.mock('../../../../src/editor/composables', () => ({
  useTextEditor: vi.fn(() => ({ editor: { value: null } }))
}))

vi.mock('../../../../src/editor/components/TextEditorContent.vue', () => ({
  default: defineComponent({
    name: 'TextEditorContent',
    props: { editor: { type: Object, required: false } },
    template: '<div class="mock-editor-content" />'
  })
}))

describe('TextEditorViewer', () => {
  it('creates a read-only editor without slash commands', () => {
    mount(TextEditorViewer, {
      props: { content: '# Details', ariaLabel: 'Details' },
      global: { plugins: [...defaultPlugins()] }
    })

    expect(vi.mocked(useTextEditor)).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'markdown',
        readonly: true,
        slashCommands: false,
        ariaLabel: 'Details'
      })
    )
  })

  it('tracks the content prop', async () => {
    const wrapper = mount(TextEditorViewer, {
      props: { content: 'initial' },
      global: { plugins: [...defaultPlugins()] }
    })

    const { modelValue } = vi.mocked(useTextEditor).mock.calls.at(-1)[0] as {
      modelValue: Ref<string>
    }
    expect(unref(modelValue)).toEqual('initial')

    await wrapper.setProps({ content: 'updated' })
    await nextTick()
    expect(unref(modelValue)).toEqual('updated')
  })
})
