import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { SlashCommandGroup, ToolbarGroup, richTextSlashCommandGroups } from '../actions'
import type { ContentTypeStrategy } from './types'
import * as items from '../actions/toolbar/items'

export type LinkUrlCallback = (editor: Editor, currentUrl?: string) => void
export type ImageUrlCallback = (editor: Editor) => void

export abstract class RichTextStrategy implements ContentTypeStrategy {
  constructor(
    protected onRequestLinkUrl?: LinkUrlCallback,
    protected onRequestImageUrl?: ImageUrlCallback
  ) {}

  extensions(): Extension[] {
    return [
      StarterKit.configure({ link: false }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true })
    ]
  }

  toolbarItems(): ToolbarGroup[] {
    const linkCallback: LinkUrlCallback =
      this.onRequestLinkUrl ??
      ((editor, currentUrl) => {
        const url = window.prompt('URL', currentUrl)
        if (url === null) return
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
          return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      })

    const imageCallback: ImageUrlCallback =
      this.onRequestImageUrl ??
      ((editor) => {
        const url = window.prompt('Image URL')
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      })

    return [
      [
        items.bold('Bold'),
        items.italic('Italic'),
        items.underline('Underline'),
        items.strikethrough('Strikethrough')
      ],
      [items.heading1('Heading 1'), items.heading2('Heading 2'), items.heading3('Heading 3')],
      [
        items.bulletList('Bullet list'),
        items.orderedList('Ordered list'),
        items.taskList('Task list')
      ],
      [
        items.blockquote('Blockquote'),
        items.codeInline('Inline code'),
        items.codeBlock('Code block'),
        items.horizontalRule('Horizontal rule')
      ],
      [items.link('Link', linkCallback), items.image('Image', imageCallback)],
      [
        items.table('Table'),
        items.addRowBefore('Add row above'),
        items.addRowAfter('Add row below'),
        items.deleteRow('Delete row'),
        items.addColumnBefore('Add column left'),
        items.addColumnAfter('Add column right'),
        items.deleteColumn('Delete column')
      ]
    ]
  }

  defaultSlashCommandGroups(): SlashCommandGroup[] {
    return richTextSlashCommandGroups()
  }

  abstract serialize(editor: Editor): string
  abstract deserialize(content: string): Record<string, unknown> | string
}
