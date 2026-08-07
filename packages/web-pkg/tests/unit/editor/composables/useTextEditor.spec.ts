import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTextEditor } from '../../../../src/editor/composables/useTextEditor'
import { withSetup } from './helpers'
import { toRef } from 'vue'
import * as Y from 'yjs'
import { createMockStore, createTestingPinia } from '@opencloud-eu/web-test-helpers'

function createEditor(options = {}) {
  const defaults = { contentType: 'html' as const, modelValue: toRef('<p>hello</p>') }
  return withSetup(() => useTextEditor({ ...defaults, ...options }))
}

describe('useTextEditor', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('creates an editor instance', () => {
    const { result } = createEditor()
    expect(result.editor.value).not.toBeNull()
  })

  it('exposes contentType as ref', () => {
    const { result } = createEditor({ contentType: 'markdown' })
    expect(result.contentType.value).toBe('markdown')
  })

  it('exposes readonly as ref', () => {
    const { result } = createEditor({ readonly: true })
    expect(result.readonly.value).toBe(true)
  })

  it('getContent serializes via strategy', () => {
    const { result } = createEditor({ contentType: 'html', modelValue: toRef('<p>test</p>') })
    const content = result.getContent()
    expect(content).toContain('test')
  })

  it('isEmpty returns true for empty editor', () => {
    const { result } = createEditor({ modelValue: toRef('') })
    expect(result.isEmpty.value).toBe(true)
  })

  it('destroy cleans up editor', () => {
    const { result } = createEditor()
    result.destroy()
    expect(result.editor.value).toBeNull()
  })

  describe('slash commands', () => {
    it('does not register the slash commands extension when slashCommands is false', () => {
      const { result } = createEditor({ slashCommands: false })
      const pluginNames = result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
      expect(pluginNames).not.toContain('slashCommands')
    })

    it('registers the slash commands extension when slashCommands is true', () => {
      const { result } = createEditor({ slashCommands: true })
      const pluginNames = result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
      expect(pluginNames).toContain('slashCommands')
    })

    it('does not register the extension for plain-text when all actions are hidden in slash commands', () => {
      const { result } = createEditor({
        contentType: 'plain-text',
        modelValue: toRef('hi'),
        slashCommands: true
      })
      const pluginNames = result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
      expect(pluginNames).not.toContain('slashCommands')
    })
  })

  describe('find and replace', () => {
    it.each(['plain-text', 'markdown', 'html', 'tiptap-json'] as const)(
      'registers the findAndReplace extension for %s',
      (contentType) => {
        const modelValue =
          contentType === 'tiptap-json'
            ? JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
            : ''
        const { result } = createEditor({ contentType, modelValue: toRef(modelValue) })
        const pluginNames =
          result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
        expect(pluginNames).toContain('findAndReplace')
      }
    )
  })

  describe('links', () => {
    it('prevents auxiliary clicks from opening a link', () => {
      const { result } = createEditor({
        modelValue: toRef('<p><a href="https://opencloud.eu">OpenCloud</a></p>')
      })
      const editor = result.editor.value!
      const anchor = editor.view.dom.querySelector('a')!
      const event = new PointerEvent('auxclick', { button: 1, cancelable: true })
      Object.defineProperty(event, 'target', { value: anchor })

      const handled = editor.options.editorProps.handleDOMEvents!.auxclick!(editor.view, event)

      expect(handled).toBe(true)
      expect(event.defaultPrevented).toBe(true)
    })

    it('allows native auxiliary link navigation when readonly', () => {
      const { result } = createEditor({
        modelValue: toRef('<p><a href="https://opencloud.eu">OpenCloud</a></p>'),
        readonly: true
      })
      const editor = result.editor.value!
      const anchor = editor.view.dom.querySelector('a')!
      const event = new PointerEvent('auxclick', { button: 1, cancelable: true })
      Object.defineProperty(event, 'target', { value: anchor })

      const handled = editor.options.editorProps.handleDOMEvents!.auxclick!(editor.view, event)

      expect(handled).toBe(false)
      expect(event.defaultPrevented).toBe(false)
      expect(result.state.linkPanel.value).toBeNull()
    })

    it.each(['markdown', 'html', 'tiptap-json'] as const)(
      'autolinks pasted URLs for the %s strategy',
      (contentType) => {
        const modelValue =
          contentType === 'tiptap-json'
            ? JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
            : ''
        const { result } = createEditor({ contentType, modelValue: toRef(modelValue) })
        const editor = result.editor.value!

        editor.view.pasteText('https://opencloud.eu ')

        const textNode = editor.state.doc.firstChild?.firstChild
        expect(editor.state.doc.textContent).toBe('https://opencloud.eu ')
        expect(textNode?.text).toBe('https://opencloud.eu')
        expect(textNode?.marks.find(({ type }) => type.name === 'link')?.attrs.href).toBe(
          'https://opencloud.eu'
        )
      }
    )

    it.each(['markdown', 'html', 'tiptap-json'] as const)(
      'links selected text when a URL is pasted for the %s strategy',
      (contentType) => {
        const modelValue =
          contentType === 'tiptap-json'
            ? JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
            : ''
        const { result } = createEditor({ contentType, modelValue: toRef(modelValue) })
        const editor = result.editor.value!
        editor.commands.insertContent('OpenCloud')
        editor.commands.setTextSelection({ from: 1, to: 10 })

        editor.view.pasteText('https://opencloud.eu')

        const textNode = editor.state.doc.firstChild?.firstChild
        expect(textNode?.text).toBe('OpenCloud')
        expect(textNode?.marks.find(({ type }) => type.name === 'link')?.attrs.href).toBe(
          'https://opencloud.eu'
        )
      }
    )
  })

  describe('onUpdate debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('calls onUpdate after 250ms debounce', () => {
      const onUpdate = vi.fn()
      const { result } = createEditor({ onUpdate })

      result.editor.value!.commands.insertContent('x')
      expect(onUpdate).not.toHaveBeenCalled()

      vi.advanceTimersByTime(250)
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })

    it('batches rapid updates — only fires once with latest content', () => {
      const onUpdate = vi.fn()
      const { result } = createEditor({ onUpdate })

      result.editor.value!.commands.insertContent('a')
      result.editor.value!.commands.insertContent('b')
      result.editor.value!.commands.insertContent('c')

      vi.advanceTimersByTime(250)
      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(onUpdate.mock.calls[0][0]).toContain('c')
    })
  })

  describe('destroy flush', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('flushes pending debounce on destroy', () => {
      const onUpdate = vi.fn()
      const { result } = createEditor({ onUpdate })

      result.editor.value!.commands.insertContent('pending')
      expect(onUpdate).not.toHaveBeenCalled()

      result.destroy()
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })

    it('does not call onUpdate on destroy when no pending debounce', () => {
      const onUpdate = vi.fn()
      const { result } = createEditor({ onUpdate })

      result.destroy()
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('does not call onUpdate on destroy after the debounce already fired', () => {
      const onUpdate = vi.fn()
      const { result } = createEditor({ onUpdate })

      result.editor.value!.commands.insertContent('x')
      vi.advanceTimersByTime(250)
      expect(onUpdate).toHaveBeenCalledTimes(1)

      result.destroy()
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('excludeActions', () => {
    const collectIds = (groups: { actions: { id: string; childActions?: any[] }[] }[]) => {
      const ids: string[] = []
      const walk = (actions: { id: string; childActions?: any[] }[]) => {
        for (const action of actions) {
          ids.push(action.id)
          if (action.childActions) {
            walk(action.childActions)
          }
        }
      }
      groups.forEach((group) => walk(group.actions))
      return ids
    }

    it('keeps image actions by default', () => {
      const { result } = createEditor({ contentType: 'markdown' })
      expect(collectIds(result.actionGroups())).toContain('image')
    })

    it('removes excluded actions including nested dropdown children', () => {
      const { result } = createEditor({
        contentType: 'markdown',
        excludeActions: ['image', 'image-upload', 'image-url']
      })
      const ids = collectIds(result.actionGroups())
      expect(ids).not.toContain('image')
      expect(ids).not.toContain('image-upload')
      expect(ids).not.toContain('image-url')
    })

    it('removes the source mode action when a realtime session is active', () => {
      createMockStore({ configState: { options: { yjsServerUrl: 'wss://example.test/realtime' } } })
      const { result } = createEditor({ contentType: 'markdown', ydoc: new Y.Doc() })
      expect(collectIds(result.actionGroups())).not.toContain('source-mode')
    })

    it('keeps the source mode action without a realtime server', () => {
      const { result } = createEditor({ contentType: 'markdown', ydoc: new Y.Doc() })
      expect(collectIds(result.actionGroups())).toContain('source-mode')
    })

    it('keeps the source mode action for non-collaborative editors', () => {
      createMockStore({ configState: { options: { yjsServerUrl: 'wss://example.test/realtime' } } })
      const { result } = createEditor({ contentType: 'markdown' })
      expect(collectIds(result.actionGroups())).toContain('source-mode')
    })
  })

  describe('ariaLabel', () => {
    it('sets an aria-label on the editor textbox element', () => {
      const { result } = createEditor({ ariaLabel: 'Info text' })
      const attributes = (result.editor.value?.options.editorProps as any)?.attributes
      expect(attributes?.['aria-label']).toBe('Info text')
      expect(attributes?.role).toBe('textbox')
      expect(attributes?.['aria-multiline']).toBe('true')
    })

    it('does not add aria attributes when no aria-label or placeholder is given', () => {
      const { result } = createEditor()
      const attributes = (result.editor.value?.options.editorProps as any)?.attributes
      expect(attributes?.['aria-label']).toBeUndefined()
      expect(attributes?.role).toBeUndefined()
    })
  })
})
