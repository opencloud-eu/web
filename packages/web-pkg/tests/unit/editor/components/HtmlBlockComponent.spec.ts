import { mount } from '@vue/test-utils'
import { createGettext } from 'vue3-gettext'
import HtmlBlockComponent from '../../../../src/editor/components/HtmlBlockComponent.vue'

// VueNodeViewRenderer requires the full node view prop contract
const nodeViewProps = {
  editor: {},
  node: {},
  decorations: [],
  selected: false,
  extension: {},
  getPos: () => 0,
  updateAttributes: (): void => undefined,
  deleteNode: (): void => undefined,
  view: {},
  innerDecorations: {},
  HTMLAttributes: {}
} as any

function mountComponent() {
  return mount(HtmlBlockComponent, {
    props: nodeViewProps,
    global: {
      plugins: [createGettext({ translations: {}, silent: true })],
      renderStubDefaultSlot: true,
      stubs: {
        NodeViewWrapper: { template: '<div v-bind="$attrs"><slot /></div>' },
        NodeViewContent: { template: '<div class="node-view-content" />' },
        'oc-icon': true
      }
    }
  })
}

describe('HtmlBlockComponent', () => {
  it('hosts the editable node content', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.text-editor-html-block-content .node-view-content').exists()).toBe(true)
  })

  it('labels the block as html outside the editable text', () => {
    const wrapper = mountComponent()
    const label = wrapper.find('.text-editor-html-block-label')
    expect(label.text()).toBe('HTML')
    expect(label.attributes('contenteditable')).toBe('false')
  })

  it('describes how to exit the block for screen readers', () => {
    const wrapper = mountComponent()
    const content = wrapper.find('.text-editor-html-block-content')
    const hint = wrapper.find(`#${content.attributes('aria-describedby')}`)
    expect(hint.text()).toContain('Shift+Enter')
  })
})
