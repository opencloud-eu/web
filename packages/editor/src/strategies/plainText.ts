import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarGroup, SlashCommandGroup } from '../actions'
import type { ContentTypeStrategy } from './types'

export class PlainTextStrategy implements ContentTypeStrategy {
  extensions(): Extension[] {
    return [Document, Paragraph, Text, HardBreak]
  }

  toolbarItems(): ToolbarGroup[] {
    return []
  }

  defaultSlashCommandGroups(): SlashCommandGroup[] {
    return []
  }

  serialize(editor: Editor): string {
    return editor.getText()
  }

  deserialize(content: string): Record<string, unknown> {
    if (!content) {
      return { type: 'doc', content: [{ type: 'paragraph' }] }
    }

    const lines = content.split('\n')
    return {
      type: 'doc',
      content: lines.map((line) => {
        if (!line) return { type: 'paragraph' }
        return { type: 'paragraph', content: [{ type: 'text', text: line }] }
      })
    }
  }
}
