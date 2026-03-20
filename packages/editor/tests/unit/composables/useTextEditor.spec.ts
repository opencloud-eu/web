import { useTextEditor } from '../../../src/composables/useTextEditor'
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
})
