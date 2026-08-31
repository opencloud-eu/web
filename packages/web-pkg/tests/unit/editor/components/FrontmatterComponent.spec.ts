import { mount } from '@vue/test-utils'
import { createGettext } from 'vue3-gettext'
import FrontmatterComponent from '../../../../src/editor/components/FrontmatterComponent.vue'

// The component renders no prop values, but VueNodeViewRenderer requires the
// full node view prop contract, so satisfy it here to keep the mount warning free.
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
  return mount(FrontmatterComponent, {
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

describe('FrontmatterComponent', () => {
  it('hosts the editable node content', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.text-editor-frontmatter-content .node-view-content').exists()).toBe(true)
  })

  it('labels the block as frontmatter', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.text-editor-frontmatter-label').text()).toBe('Frontmatter')
  })

  it('keeps the label out of the editable text', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.text-editor-frontmatter-label').attributes('contenteditable')).toBe(
      'false'
    )
  })
})
