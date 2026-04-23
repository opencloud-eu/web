import type { Editor } from '@tiptap/vue-3'
import { RichTextStrategy } from './richText'

export class HtmlStrategy extends RichTextStrategy {
  serialize(editor: Editor): string {
    return editor.getHTML()
  }

  deserialize(content: string): string {
    return content
  }
}
