import type { Editor } from '@tiptap/vue-3'
import { RichTextStrategy } from './richText'

export class TiptapJsonStrategy extends RichTextStrategy {
  serialize(editor: Editor): string {
    return JSON.stringify(editor.getJSON())
  }

  deserialize(content: string): Record<string, unknown> {
    return JSON.parse(content)
  }
}
