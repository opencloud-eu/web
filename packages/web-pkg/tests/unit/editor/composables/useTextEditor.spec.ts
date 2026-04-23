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

    it('does not register the extension for plain-text with no override', () => {
      const { result } = createEditor({
        contentType: 'plain-text',
        modelValue: 'hi',
        slashCommands: true
      })
      const pluginNames = result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
      expect(pluginNames).not.toContain('slashCommands')
    })

    it('registers the extension for plain-text when slashCommandItems is provided', () => {
      const { result } = createEditor({
        contentType: 'plain-text',
        modelValue: 'hi',
        slashCommands: true,
        slashCommandItems: [
          {
            id: 'custom',
            title: 'Custom',
            items: [{ id: 'greet', title: 'Greet', command: () => {} }]
          }
        ]
      })
      const pluginNames = result.editor.value?.extensionManager.extensions.map((e) => e.name) ?? []
      expect(pluginNames).toContain('slashCommands')
    })
  })
})
