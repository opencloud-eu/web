import type { Extension } from '@tiptap/core'
import type { EditorActionGroup } from '../useEditorActions'
import type { Editor } from '@tiptap/vue-3'

export interface ContentTypeStrategy {
  editorContentType?(): string
  serialize(editor: Editor): string
  deserialize(content: string): Record<string, unknown> | string
  extensions(): Extension[]
  editorActionGroups(): EditorActionGroup[]
}
