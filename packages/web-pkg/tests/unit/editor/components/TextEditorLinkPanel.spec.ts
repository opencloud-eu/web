/* eslint-disable vue/one-component-per-file */
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createGettext } from 'vue3-gettext'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextEditorLinkPanel from '../../../../src/editor/components/TextEditorLinkPanel.vue'
import { createLinkExtension } from '../../../../src/editor/extensions/link'
import { requestLinkPanel } from '../../../../src/editor/composables/useEditorLink'
import type {
  TextEditorInstance,
  TextEditorLinkPanelRequest,
  TextEditorState
} from '../../../../src/editor/types'

const DropStub = defineComponent({
  name: 'OcDrop',
  inheritAttrs: false,
  props: {
    paddingSize: { type: String, default: '' }
  },
  emits: ['hideDrop'],
  setup(props, { attrs, emit, expose, slots }) {
    const visible = ref(false)
    const show = vi.fn(() => {
      visible.value = true
    })
    const hide = vi.fn(() => {
      visible.value = false
      emit('hideDrop')
    })
    const update = vi.fn()
    expose({ show, hide, update })
    return () =>
      visible.value
        ? h(
            'div',
            { class: ['drop-stub', attrs.class], 'data-padding-size': props.paddingSize },
            slots.default?.()
          )
        : null
  }
})

const TextInputStub = defineComponent({
  name: 'OcTextInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
    errorMessage: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, expose, slots }) {
    const input = ref<HTMLInputElement>()
    expose({ focus: () => input.value?.focus() })
    return () => {
      const { class: className, ...inputAttrs } = attrs
      return h('div', { class: className }, [
        slots.label?.(),
        h('input', {
          ...inputAttrs,
          ref: input,
          'aria-invalid': Boolean(props.errorMessage).toString(),
          value: props.modelValue,
          onInput: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLInputElement).value)
        })
      ])
    }
  }
})

const ButtonStub = defineComponent({
  name: 'OcButton',
  inheritAttrs: false,
  props: {
    ariaLabel: { type: String, default: '' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['click'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          ...attrs,
          'aria-label': props.ariaLabel,
          disabled: props.disabled,
          onClick: (event: MouseEvent) => emit('click', event)
        },
        slots.default?.()
      )
  }
})

const IconStub = defineComponent({
  name: 'OcIcon',
  inheritAttrs: false,
  props: {
    name: { type: String, required: true },
    fillType: { type: String, default: '' },
    size: { type: String, default: '' }
  },
  setup(props, { attrs }) {
    return () =>
      h('span', {
        ...attrs,
        'data-icon': props.name,
        'data-fill-type': props.fillType,
        'data-size': props.size
      })
  }
})

function createEditor(content: string): Editor {
  const editor = new Editor({
    extensions: [StarterKit.configure({ link: false }), createLinkExtension()],
    content
  })
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({
    left: 10,
    right: 20,
    top: 10,
    bottom: 20
  })
  return editor
}

function mountPanel(content: string) {
  const tiptapEditor = createEditor(content)
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null)
  }
  const textEditor = {
    state,
    editor: shallowRef(tiptapEditor),
    contentType: ref('html'),
    readonly: ref(false)
  } as unknown as TextEditorInstance
  const wrapper = mount(TextEditorLinkPanel, {
    props: { editor: textEditor },
    global: {
      plugins: [createGettext({ translations: {}, silent: true })],
      directives: { 'oc-tooltip': () => {} },
      stubs: {
        OcDrop: DropStub,
        OcTextInput: TextInputStub,
        OcButton: ButtonStub,
        OcIcon: IconStub
      }
    }
  })

  return { wrapper, tiptapEditor, state }
}

async function openPanel(
  context: ReturnType<typeof mountPanel>,
  selection: number | { from: number; to: number },
  view: 'actions' | 'edit' = 'edit'
) {
  context.tiptapEditor.commands.setTextSelection(selection)
  requestLinkPanel(context.tiptapEditor, context.state, { view })
  await nextTick()
  await flushPromises()
}

describe('TextEditorLinkPanel', () => {
  it('renders only two contained, placeholder-based fields in edit view', async () => {
    const context = mountPanel('<p>OpenCloud</p>')
    await openPanel(context, { from: 1, to: 10 })

    const inputs = context.wrapper.findAll('input')
    expect(inputs).toHaveLength(2)
    expect(inputs[0].attributes('placeholder')).toBe('Paste link')
    expect(inputs[1].attributes('placeholder')).toBe('Text to display')
    expect(inputs[0].element.value).toBe('')
    expect(inputs[1].element.value).toBe('OpenCloud')
    const labels = context.wrapper.findAll('label')
    expect(labels).toHaveLength(2)
    expect(labels.map((label) => label.text())).toEqual(['URL', 'Text to display'])
    labels.forEach((label, index) => {
      expect(label.classes()).toContain('sr-only')
      expect(label.attributes('for')).toBe(inputs[index].attributes('id'))
    })
    expect(context.wrapper.find('h1, h2, h3, p').exists()).toBe(false)
    expect(context.wrapper.find('.text-editor-link-panel').classes()).toEqual(
      expect.arrayContaining(['overflow-hidden!', 'box-border'])
    )
    expect(context.wrapper.get('form').classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'max-w-full', 'gap-1', 'overflow-hidden'])
    )
    const inputRows = context.wrapper.findAll('.text-editor-link-panel-input-row')
    expect(inputRows).toHaveLength(2)
    inputRows.forEach((row) => {
      expect(row.classes()).toEqual(
        expect.arrayContaining(['flex', 'items-center', 'gap-2', 'overflow-hidden'])
      )
      expect(row.element.children[0].hasAttribute('data-icon')).toBe(true)
      expect(row.element.children[1].classList).toContain('text-editor-link-panel-input')
    })
    const inputWrappers = context.wrapper.findAll('.text-editor-link-panel-input')
    expect(inputWrappers).toHaveLength(2)
    inputWrappers.forEach((inputWrapper) => {
      expect(inputWrapper.classes()).toEqual(
        expect.arrayContaining(['min-w-0', 'flex-1', 'overflow-hidden'])
      )
    })
    const icons = context.wrapper.findAll('[data-icon]')
    expect(icons.map((icon) => icon.attributes('data-icon'))).toEqual(['link', 'text'])
    expect(icons[1].attributes('data-fill-type')).toBe('none')
    context.tiptapEditor.destroy()
  })

  it('renders neutral link actions with a visible Edit Link label', async () => {
    const context = mountPanel('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    await openPanel(context, 2, 'actions')

    expect(context.wrapper.findAll('input')).toHaveLength(0)
    expect(context.wrapper.find('h1, h2, h3, p').exists()).toBe(false)
    const panel = context.wrapper.get('.text-editor-link-panel')
    expect(panel.classes()).toEqual(
      expect.arrayContaining(['w-auto!', 'overflow-hidden!', 'rounded-md!'])
    )
    expect(panel.classes()).not.toContain('overflow-auto')
    expect(panel.classes()).not.toContain('overflow-scroll')
    expect(panel.attributes('data-padding-size')).toBe('xsmall')

    const actionRow = context.wrapper.get('.text-editor-link-panel-actions')
    expect(actionRow.classes()).toEqual(
      expect.arrayContaining(['inline-flex', 'flex-nowrap', 'items-center'])
    )
    expect(actionRow.classes()).not.toContain('w-full')
    expect(actionRow.classes()).not.toContain('overflow-auto')
    expect(actionRow.classes()).not.toContain('overflow-scroll')
    expect(actionRow.attributes('tabindex')).toBe('-1')
    expect(focus.mock.instances.at(-1)).toBe(actionRow.element)
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
    focus.mockRestore()

    const buttons = context.wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    buttons.forEach((button) => {
      expect(button.attributes('appearance')).toBe('raw')
      expect(button.attributes('aria-pressed')).toBeUndefined()
      expect(button.classes()).toEqual(
        expect.arrayContaining(['h-8', 'shrink-0', 'justify-center'])
      )
      expect(button.classes()).not.toContain('min-w-[42px]')
      expect(button.classes()).not.toContain('active')
      expect(button.classes()).not.toContain('bg-role-secondary-container')
    })
    expect(buttons[0].text()).toBe('Edit Link')
    expect(buttons[0].attributes('aria-label')).toBe('Edit Link')
    expect(buttons[0].classes()).toEqual(expect.arrayContaining(['px-2', 'py-0']))
    expect(buttons[1].text()).toBe('')
    expect(buttons[1].classes()).toEqual(expect.arrayContaining(['w-8', 'p-0']))
    expect(buttons[1].attributes('aria-label')).toBe('Open link in a new tab')
    expect(buttons[2].text()).toBe('')
    expect(buttons[2].classes()).toEqual(expect.arrayContaining(['w-8', 'p-0']))
    expect(buttons[2].attributes('aria-label')).toBe('Unlink')

    const icons = context.wrapper.findAll('[data-icon]')
    expect(icons.map((icon) => icon.attributes('data-icon'))).toEqual([
      'edit-2',
      'external-link',
      'link-unlink'
    ])
    expect(icons[2].attributes('data-fill-type')).toBe('none')

    const separators = context.wrapper.findAll('[role="separator"]')
    expect(separators).toHaveLength(2)
    separators.forEach((separator) => {
      expect(separator.attributes('aria-orientation')).toBe('vertical')
      expect(separator.attributes('tabindex')).toBeUndefined()
      expect(separator.classes()).toEqual(
        expect.arrayContaining(['h-5', 'w-px', 'shrink-0', 'bg-role-outline-variant'])
      )
    })

    await buttons[0].trigger('click')
    await flushPromises()

    const inputs = context.wrapper.findAll('input')
    expect(inputs).toHaveLength(2)
    expect(inputs[0].element.value).toBe('https://opencloud.eu')
    expect(inputs[1].element.value).toBe('OpenCloud')
    const labels = context.wrapper.findAll('label')
    expect(labels).toHaveLength(2)
    labels.forEach((label, index) => {
      expect(label.classes()).toContain('sr-only')
      expect(label.attributes('for')).toBe(inputs[index].attributes('id'))
    })
    expect(context.wrapper.findAll('.text-editor-link-panel-input-row')).toHaveLength(2)
    expect(context.wrapper.findAll('.text-editor-link-panel-input')).toHaveLength(2)
    const editIcons = context.wrapper.findAll('[data-icon]')
    expect(editIcons.map((icon) => icon.attributes('data-icon'))).toEqual(['link', 'text'])
    expect(editIcons[1].attributes('data-fill-type')).toBe('none')
    expect(context.state.linkPanel.value).toMatchObject({
      range: { from: 1, to: 10 },
      view: 'edit'
    })
    expect(panel.classes()).toContain('w-[min(20rem,calc(100vw-10px))]!')
    expect(panel.classes()).not.toContain('w-auto!')
    expect(panel.attributes('data-padding-size')).toBe('small')

    await inputs[0].trigger('keydown', { key: 'Escape' })
    await openPanel(context, 2, 'actions')
    expect(context.wrapper.findAll('input')).toHaveLength(0)
    expect(context.wrapper.findAll('button')).toHaveLength(3)
    context.tiptapEditor.destroy()
  })

  it('updates both URL and displayed text on Enter', async () => {
    const context = mountPanel('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
    await openPanel(context, 2)
    const inputs = context.wrapper.findAll('input')

    await inputs[0].setValue('example.com/docs')
    await inputs[1].setValue('Documentation')
    await inputs[1].trigger('keydown', { key: 'Enter' })

    expect(context.tiptapEditor.getHTML()).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://example.com/docs">Documentation</a>'
    )
    expect(context.state.linkPanel.value).toBeNull()
    context.tiptapEditor.destroy()
  })

  it('inserts the displayed text as plain text, never as HTML', async () => {
    const context = mountPanel('<p>OpenCloud</p>')
    await openPanel(context, { from: 1, to: 10 })
    const inputs = context.wrapper.findAll('input')

    await inputs[0].setValue('opencloud.eu')
    await inputs[1].setValue('<b>bold</b>')
    await inputs[1].trigger('keydown', { key: 'Enter' })

    const html = context.tiptapEditor.getHTML()
    expect(html).not.toContain('<b>')
    expect(context.tiptapEditor.getText()).toBe('<b>bold</b>')
    expect(html).toContain('href="https://opencloud.eu/"')
    context.tiptapEditor.destroy()
  })

  it('creates a link without a prior text selection', async () => {
    const context = mountPanel('<p></p>')
    await openPanel(context, 1)
    const inputs = context.wrapper.findAll('input')

    await inputs[0].setValue('opencloud.eu')
    await inputs[1].setValue('OpenCloud')
    await inputs[1].trigger('keydown', { key: 'Enter' })

    expect(context.tiptapEditor.getHTML()).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://opencloud.eu/">OpenCloud</a>'
    )
    context.tiptapEditor.destroy()
  })

  it('links the complete selection across multiple paragraphs', async () => {
    const context = mountPanel('<p>Alpha</p><p>Beta</p>')
    await openPanel(context, { from: 1, to: 12 })
    const inputs = context.wrapper.findAll('input')

    await inputs[0].setValue('opencloud.eu')
    await inputs[0].trigger('keydown', { key: 'Enter' })

    const html = context.tiptapEditor.getHTML()
    expect(html).toContain('href="https://opencloud.eu/">Alpha</a>')
    expect(html).toContain('href="https://opencloud.eu/">Beta</a>')
    context.tiptapEditor.destroy()
  })

  it('removes only the link mark and preserves its text', async () => {
    const context = mountPanel('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
    await openPanel(context, 2, 'actions')

    await context.wrapper.get('button[aria-label="Unlink"]').trigger('click')

    expect(context.tiptapEditor.getHTML()).toBe('<p>OpenCloud</p>')
    expect(context.state.linkPanel.value).toBeNull()
    context.tiptapEditor.destroy()
  })

  it('opens only normalized, safe URLs', async () => {
    const context = mountPanel('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    await openPanel(context, 2, 'actions')

    context.state.linkPanel.value!.href = 'javascript:alert(1)'
    await nextTick()
    expect(
      context.wrapper.get('button[aria-label="Open link in a new tab"]').attributes('disabled')
    ).toBeDefined()
    await context.wrapper.get('button[aria-label="Open link in a new tab"]').trigger('click')
    expect(open).not.toHaveBeenCalled()

    context.state.linkPanel.value!.href = 'opencloud.eu'
    await nextTick()
    await context.wrapper.get('button[aria-label="Open link in a new tab"]').trigger('click')
    expect(open).toHaveBeenCalledWith('https://opencloud.eu/', '_blank', 'noopener,noreferrer')
    context.tiptapEditor.destroy()
  })

  it('discards edits on Escape and exposes accessible field names', async () => {
    const context = mountPanel('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
    await openPanel(context, 2)

    const inputs = context.wrapper.findAll('input')
    const labels = context.wrapper.findAll('label')
    expect(labels.map((label) => label.text())).toEqual(['URL', 'Text to display'])
    labels.forEach((label, index) => {
      expect(label.classes()).toContain('sr-only')
      expect(label.attributes('for')).toBe(inputs[index].attributes('id'))
    })
    expect(context.wrapper.findAll('button')).toHaveLength(0)

    const urlInput = inputs[0]
    await urlInput.setValue('example.com')
    await urlInput.trigger('keydown', { key: 'Escape' })

    expect(context.tiptapEditor.getHTML()).toContain('href="https://opencloud.eu"')
    expect(context.state.linkPanel.value).toBeNull()

    context.tiptapEditor.destroy()
  })

  it('closes action view on Escape without changing the link', async () => {
    const context = mountPanel('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
    await openPanel(context, 2, 'actions')

    await context.wrapper.get('.text-editor-link-panel-actions').trigger('keydown', {
      key: 'Escape'
    })

    expect(context.tiptapEditor.getHTML()).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://opencloud.eu">OpenCloud</a>'
    )
    expect(context.state.linkPanel.value).toBeNull()
    context.tiptapEditor.destroy()
  })
})
