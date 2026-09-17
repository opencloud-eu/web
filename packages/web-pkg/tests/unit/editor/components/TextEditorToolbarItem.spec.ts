import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, markRaw, ref } from 'vue'
import TextEditorToolbarItem from '../../../../src/editor/components/TextEditorToolbarItem.vue'
import type { TextEditorInstance } from '../../../../src/editor/types'
import type { EditorAction } from '../../../../src/editor/composables'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (value: string) => value })
}))

const MenuComponentStub = markRaw(defineComponent({ template: '<div class="menu-component" />' }))

const OcDropStub = defineComponent({
  props: {
    dropId: { type: String, default: '' },
    title: { type: String, default: '' }
  },
  template: '<div class="oc-drop-stub" :data-drop-id="dropId" :data-title="title"><slot /></div>'
})

function mountItem(item: EditorAction) {
  const textEditor = {
    editor: ref({ isActive: () => false }),
    state: { sourceMode: ref(false) }
  } as unknown as TextEditorInstance

  return mount(TextEditorToolbarItem, {
    props: { item },
    global: {
      provide: { textEditor },
      directives: { 'oc-tooltip': () => {} },
      stubs: {
        'oc-drop': OcDropStub,
        'oc-button': defineComponent({
          inheritAttrs: false,
          template: '<button v-bind="$attrs"><slot /></button>'
        }),
        'oc-icon': true
      }
    }
  })
}

describe('TextEditorToolbarItem', () => {
  it('titles the drop of a menu action, so the mobile bottom drawer has a header', () => {
    const wrapper = mountItem({
      id: 'image',
      title: 'Insert image',
      icon: 'image-line',
      childActions: [{ id: 'image-url', title: 'Image from URL', icon: 'link' }]
    })

    expect(wrapper.find('[data-drop-id="toolbar-dropdown-image"]').attributes('data-title')).toBe(
      'Insert image'
    )
  })

  it('titles the nested drop of a child action', () => {
    const wrapper = mountItem({
      id: 'table',
      title: 'Create a table',
      icon: 'table-line',
      childActions: [
        {
          id: 'table-custom',
          title: 'Choose rows & columns',
          icon: 'grid',
          menuComponent: MenuComponentStub
        }
      ]
    })

    expect(
      wrapper.find('[data-drop-id="toolbar-dropdown-table-custom"]').attributes('data-title')
    ).toBe('Choose rows & columns')
  })
})
