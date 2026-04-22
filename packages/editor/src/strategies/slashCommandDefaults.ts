import type { SlashCommandGroup } from '../types'

export function richTextSlashCommandGroups(): SlashCommandGroup[] {
  return [
    {
      id: 'basic-blocks',
      title: 'Basic blocks',
      items: [
        {
          id: 'paragraph',
          title: 'Paragraph',
          description: 'Plain text block',
          icon: 'paragraph',
          keywords: ['text', 'body'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('paragraph').run()
          }
        },
        {
          id: 'heading-1',
          title: 'Heading 1',
          description: 'Large section heading',
          icon: 'h-1',
          keywords: ['h1', 'title'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
          }
        },
        {
          id: 'heading-2',
          title: 'Heading 2',
          description: 'Medium section heading',
          icon: 'h-2',
          keywords: ['h2', 'subtitle'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
          }
        },
        {
          id: 'heading-3',
          title: 'Heading 3',
          description: 'Small section heading',
          icon: 'h-3',
          keywords: ['h3'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
          }
        }
      ]
    },
    {
      id: 'lists',
      title: 'Lists',
      items: [
        {
          id: 'bullet-list',
          title: 'Bullet list',
          description: 'Unordered list of items',
          icon: 'list-unordered',
          keywords: ['ul', 'unordered'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run()
          }
        },
        {
          id: 'ordered-list',
          title: 'Ordered list',
          description: 'Numbered list of items',
          icon: 'list-ordered-2',
          keywords: ['ol', 'numbered'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run()
          }
        },
        {
          id: 'task-list',
          title: 'Task list',
          description: 'List with checkable items',
          icon: 'list-check-3',
          keywords: ['todo', 'checklist'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run()
          }
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced',
      items: [
        {
          id: 'blockquote',
          title: 'Blockquote',
          description: 'Quote block',
          icon: 'chat-quote-line',
          keywords: ['quote'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run()
          }
        },
        {
          id: 'code-block',
          title: 'Code block',
          description: 'Preformatted code block',
          icon: 'code-box-line',
          keywords: ['code', 'pre'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
          }
        },
        {
          id: 'horizontal-rule',
          title: 'Horizontal rule',
          description: 'Divider line',
          icon: 'separator',
          keywords: ['hr', 'divider'],
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run()
          }
        },
        {
          id: 'table',
          title: 'Table',
          description: '3×3 table with header row',
          icon: 'table-line',
          keywords: ['grid'],
          command: ({ editor, range }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        }
      ]
    }
  ]
}
