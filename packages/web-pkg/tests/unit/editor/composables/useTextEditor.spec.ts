import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTextEditor } from '../../../../src/editor/composables/useTextEditor'
import { withSetup } from './helpers'

function createEditor(options = {}) {
  const defaults = { contentType: 'html' as const, modelValue: '<p>hello</p>' }
  return withSetup(() => useTextEditor({ ...defaults, ...options }))
}

describe('useTextEditor', () => {
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
    const { result } = createEditor({ contentType: 'html', modelValue: '<p>test</p>' })
    const content = result.getContent()
    expect(content).toContain('test')
  })

  it('setContent deserializes via strategy', () => {
    const { result } = createEditor({ contentType: 'html' })
    result.setContent('<p>new content</p>')
    expect(result.getContent()).toContain('new content')
  })

  it('isEmpty returns true for empty editor', () => {
    const { result } = createEditor({ modelValue: '' })
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

    it('does not register the extension for plain-text (no action groups)', () => {
      const { result } = createEditor({
        contentType: 'plain-text',
        modelValue: 'hi',
        slashCommands: true
      })
      const pluginNames = result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
      expect(pluginNames).not.toContain('slashCommands')
    })
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
  })
})
