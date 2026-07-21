import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useStrategyHtml } from '../../../../src/editor/composables/strategies/html'
import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import { useStrategyTiptapJson } from '../../../../src/editor/composables/strategies/tiptapJson'
import type {
  ContentType,
  TextEditorLinkPanelRequest,
  TextEditorState
} from '../../../../src/editor/types'
import type { ContentTypeStrategy } from '../../../../src/editor/composables/strategies/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy(contentType: ContentType): ContentTypeStrategy {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  switch (contentType) {
    case 'markdown':
      return useStrategyMarkdown(state)
    case 'html':
      return useStrategyHtml(state)
    case 'tiptap-json':
      return useStrategyTiptapJson(state)
    default:
      throw new Error(`Unsupported strategy: ${contentType}`)
  }
}

function createEditor(strategy: ContentTypeStrategy, content?: string): Editor {
  return new Editor({
    extensions: strategy.extensions(),
    content: content === undefined ? '' : strategy.deserialize(content),
    contentType: strategy.editorContentType?.() as 'html' | 'markdown' | 'json' | undefined
  })
}

function getLink(editor: Editor) {
  const textNode = editor.state.doc.firstChild?.firstChild
  return {
    text: textNode?.text,
    mark: textNode?.marks.find(({ type }) => type.name === 'link')
  }
}

describe.each(['markdown', 'html', 'tiptap-json'] as const)('%s link roundtrip', (contentType) => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('creates, reloads, edits and unlinks without losing text', () => {
    const strategy = createStrategy(contentType)
    const original = createEditor(strategy)
    original.commands.insertContent({
      type: 'text',
      text: 'OpenCloud',
      marks: [{ type: 'link', attrs: { href: 'https://opencloud.eu' } }]
    })

    const serialized = strategy.serialize(original)
    if (contentType === 'markdown') {
      expect(serialized).toContain('[OpenCloud](https://opencloud.eu)')
    } else if (contentType === 'html') {
      expect(serialized).toContain('href="https://opencloud.eu"')
      expect(serialized).toContain('target="_blank"')
      expect(serialized).toContain('rel="noopener noreferrer"')
    } else {
      expect(JSON.parse(serialized)).toMatchObject({
        content: [{ content: [{ marks: [{ attrs: { href: 'https://opencloud.eu' } }] }] }]
      })
    }
    const reloaded = createEditor(createStrategy(contentType), serialized)
    expect(getLink(reloaded)).toMatchObject({
      text: 'OpenCloud',
      mark: { attrs: { href: 'https://opencloud.eu' } }
    })

    reloaded.commands.setTextSelection({ from: 1, to: 10 })
    reloaded.commands.insertContent({
      type: 'text',
      text: 'Cloud',
      marks: [{ type: 'link', attrs: { href: 'https://example.com/docs' } }]
    })
    const edited = strategy.serialize(reloaded)
    const editedReloaded = createEditor(createStrategy(contentType), edited)
    expect(getLink(editedReloaded)).toMatchObject({
      text: 'Cloud',
      mark: { attrs: { href: 'https://example.com/docs' } }
    })

    editedReloaded.commands.setTextSelection({ from: 1, to: 6 })
    editedReloaded.commands.unsetLink()
    expect(editedReloaded.getText()).toBe('Cloud')
    expect(getLink(editedReloaded).mark).toBeUndefined()
    const unlinked = strategy.serialize(editedReloaded)
    const unlinkedReloaded = createEditor(createStrategy(contentType), unlinked)
    expect(unlinkedReloaded.getText()).toBe('Cloud')
    expect(getLink(unlinkedReloaded).mark).toBeUndefined()

    original.destroy()
    reloaded.destroy()
    editedReloaded.destroy()
    unlinkedReloaded.destroy()
  })
})
