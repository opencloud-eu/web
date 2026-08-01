import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, shallowRef } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextEditorLinkBubbleMenu from '../../../../src/editor/components/TextEditorLinkBubbleMenu.vue'
import type { TextEditorInstance, TextEditorLinkPanelRequest } from '../../../../src/editor/types'
import { createLinkExtension } from '../../../../src/editor/extensions/link'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: {
    template: '<div class="mock-bubble-menu"><slot /></div>',
    props: ['editor', 'shouldShow', 'updateDelay']
  }
}))

describe('TextEditorLinkBubbleMenu', () => {
  let tiptapEditor: Editor
  let textEditor: TextEditorInstance

  beforeEach(() => {
    tiptapEditor = new Editor({
      extensions: [StarterKit.configure({ link: false }), createLinkExtension()],
      content: '<p><a href="https://opencloud.eu">OpenCloud</a></p>'
    })

    textEditor = {
      editor: shallowRef(tiptapEditor),
      state: {
        sourceMode: ref(false),
        linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
        editorZoom: ref(100)
      },
      contentType: ref('html'),
      readonly: ref(false)
    } as unknown as TextEditorInstance

    // Select the link
    tiptapEditor.commands.setTextSelection({ from: 2, to: 12 })
  })

  afterEach(() => {
    tiptapEditor.destroy()
  })

  function mountBubbleMenu() {
    return mount(TextEditorLinkBubbleMenu, {
      global: {
        plugins: [...defaultPlugins()],
        provide: { textEditor }
      }
    })
  }

  it('renders three action buttons', () => {
    const wrapper = mountBubbleMenu()
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(3)
    expect(buttons[0].attributes('aria-label')).toBe('Edit Link')
    expect(buttons[1].attributes('aria-label')).toBe('Open link in a new tab')
    expect(buttons[2].attributes('aria-label')).toBe('Unlink')
  })

  it('calls requestLinkPanel when Edit Link is clicked', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountBubbleMenu()
    const editButton = wrapper.find('button[aria-label="Edit Link"]')

    await editButton.trigger('click')

    expect(textEditor.state.linkPanel.value).toBeDefined()
    expect(textEditor.state.linkPanel.value?.href).toBe('https://opencloud.eu')
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('opens link in new tab when Open is clicked', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountBubbleMenu()
    const openButton = wrapper.find('button[aria-label="Open link in a new tab"]')

    await openButton.trigger('click')

    expect(open).toHaveBeenCalledWith('https://opencloud.eu/', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })

  it('disables Open button for unsafe URLs', () => {
    tiptapEditor.commands.setContent('<p><a href="javascript:alert(1)">Bad</a></p>')
    tiptapEditor.commands.setTextSelection({ from: 2, to: 5 })
    const wrapper = mountBubbleMenu()
    const openButton = wrapper.find('button[aria-label="Open link in a new tab"]')

    expect(openButton.attributes('disabled')).toBeDefined()
  })

  it('removes link when Unlink is clicked', async () => {
    const wrapper = mountBubbleMenu()
    const unlinkButton = wrapper.find('button[aria-label="Unlink"]')

    await unlinkButton.trigger('click')

    // Link should be removed, text should remain
    expect(tiptapEditor.isActive('link')).toBe(false)
    expect(tiptapEditor.state.doc.textContent).toBe('OpenCloud')
  })

  it('normalizes URLs correctly', () => {
    tiptapEditor.commands.setContent('<p><a href="opencloud.eu">OpenCloud</a></p>')
    tiptapEditor.commands.setTextSelection({ from: 2, to: 12 })
    const wrapper = mountBubbleMenu()
    const openButton = wrapper.find('button[aria-label="Open link in a new tab"]')

    expect(openButton.attributes('disabled')).toBeUndefined()
  })
})
