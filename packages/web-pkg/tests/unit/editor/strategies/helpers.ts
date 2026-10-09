import { expect } from 'vitest'
import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/core'
import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'
import type { ContentTypeStrategy } from '../../../../src/editor/composables/strategies/types'

export function createStrategy(): ContentTypeStrategy {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  return useStrategyMarkdown(state)
}

const editors: Editor[] = []

export function createEditor(strategy: ContentTypeStrategy, content: string): Editor {
  const editor = new Editor({
    extensions: strategy.extensions(),
    content: strategy.deserialize(content),
    contentType: 'markdown'
  })
  editors.push(editor)
  return editor
}

export function destroyEditors(): void {
  editors.splice(0).forEach((editor) => editor.destroy())
}

export function toJSON(editor: Editor): JSONContent {
  return editor.getJSON() as JSONContent
}

export interface LoadedMarkdown {
  editor: Editor
  serialized: string
}

export function load(markdown: string): LoadedMarkdown {
  const strategy = createStrategy()
  const editor = createEditor(strategy, markdown)
  return { editor, serialized: strategy.serialize(editor.state.doc) }
}

export function expectStableRoundtrip(markdown: string): LoadedMarkdown {
  const { editor, serialized } = load(markdown)
  expect(() => editor.state.doc.check()).not.toThrow()

  const reloaded = load(serialized)
  expect(() => reloaded.editor.state.doc.check()).not.toThrow()
  expect(toJSON(reloaded.editor)).toEqual(toJSON(editor))

  return { editor, serialized }
}
