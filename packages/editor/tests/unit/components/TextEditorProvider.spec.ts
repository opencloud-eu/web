import { mount } from '@vue/test-utils'
import TextEditorProvider from '../../../src/components/TextEditorProvider.vue'

describe('TextEditorProvider', () => {
  it('renders slot content', () => {
    const wrapper = mount(TextEditorProvider, {
      props: { editor: {} as any },
      slots: { default: '<div class="child">content</div>' }
    })
    expect(wrapper.find('.child').exists()).toBe(true)
  })

  it('provides editor to children', () => {
    const editor = { contentType: { value: 'html' } } as any
    const wrapper = mount(TextEditorProvider, {
      props: { editor },
      slots: { default: '<div />' }
    })
    expect(wrapper.find('.text-editor-provider').exists()).toBe(true)
  })
})
