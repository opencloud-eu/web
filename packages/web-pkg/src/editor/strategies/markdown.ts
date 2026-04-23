import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from '@tiptap/markdown'
import { ContentTypeStrategy } from './types'
import * as items from '../actions/toolbar/items'
import { richTextSlashCommandGroups, ToolbarGroup, SlashCommandGroup } from '../actions'

export class MarkdownStrategy implements ContentTypeStrategy {
  constructor(private onRequestLinkUrl?: (editor: any, currentUrl?: string) => void) {}

  extensions(): Extension[] {
    return [
      StarterKit.configure({ link: false }),
      Markdown,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true })
    ]
  }

  toolbarItems(): ToolbarGroup[] {
    const linkCallback =
      this.onRequestLinkUrl ??
      ((editor: any, currentUrl?: string) => {
        const url = window.prompt('URL', currentUrl)
        if (url === null) return
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
          return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      })

    return [
      [items.bold('Bold'), items.italic('Italic'), items.strikethrough('Strikethrough')],
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
      // [items.link('Link', linkCallback)],
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

  editorContentType(): string {
    return 'markdown'
  }

  serialize(editor: Editor): string {
    return (editor as any).getMarkdown()
  }

  deserialize(content: string): string {
    return content
  }
}
