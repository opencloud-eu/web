# `@opencloud-eu/editor` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone, content-type-aware rich text editor package built on Tiptap v3 that replaces the mail app's `MailBodyEditor` and the text editor app's `md-editor-v3` usage.

**Architecture:** A strategy pattern maps each content type (plain-text, markdown, HTML, tiptap-json) to its own set of tiptap extensions, toolbar items, and serializer. A `useTextEditor` composable creates the editor instance. Three Vue components — `TextEditorProvider`, `TextEditorContent`, `TextEditorToolbar` — let consumers place the editor UI however they want via provide/inject.

**Tech Stack:** Vue 3, TypeScript, Tiptap v3, `@tiptap/markdown`, ProseMirror, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-tiptap-text-editor-design.md`

---

## File Structure

```
packages/editor/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── composables/
│   │   └── useTextEditor.ts
│   ├── components/
│   │   ├── TextEditorProvider.vue
│   │   ├── TextEditorContent.vue
│   │   └── TextEditorToolbar.vue
│   ├── strategies/
│   │   ├── types.ts
│   │   ├── resolveStrategy.ts
│   │   ├── plainText.ts
│   │   ├── richText.ts          # shared base for html + tiptap-json
│   │   ├── markdown.ts
│   │   ├── html.ts
│   │   └── tiptapJson.ts
│   └── toolbar/
│       ├── types.ts
│       └── items.ts
└── tests/
    └── unit/
        ├── composables/
        │   └── useTextEditor.spec.ts
        ├── strategies/
        │   ├── plainText.spec.ts
        │   ├── markdown.spec.ts
        │   ├── html.spec.ts
        │   └── tiptapJson.spec.ts
        └── components/
            ├── TextEditorProvider.spec.ts
            ├── TextEditorContent.spec.ts
            └── TextEditorToolbar.spec.ts
```

---

## Task 1: Package scaffold

**Files:**
- Create: `packages/editor/package.json`
- Create: `packages/editor/tsconfig.json`
- Create: `packages/editor/src/index.ts`
- Create: `packages/editor/src/types.ts`

- [ ] **Step 1: Create `packages/editor/package.json`**

```json
{
  "name": "@opencloud-eu/editor",
  "version": "0.0.0",
  "private": true,
  "description": "Content-type-aware rich text editor built on Tiptap",
  "license": "AGPL-3.0",
  "dependencies": {
    "@tiptap/core": "^3.20.4",
    "@tiptap/extension-image": "^3.20.4",
    "@tiptap/extension-link": "^3.20.4",
    "@tiptap/extension-table": "^3.20.4",
    "@tiptap/extension-table-cell": "^3.20.4",
    "@tiptap/extension-table-header": "^3.20.4",
    "@tiptap/extension-table-row": "^3.20.4",
    "@tiptap/extension-task-item": "^3.20.4",
    "@tiptap/extension-task-list": "^3.20.4",
    "@tiptap/extension-underline": "^3.20.4",
    "@tiptap/markdown": "^3.20.4",
    "@tiptap/pm": "^3.20.4",
    "@tiptap/starter-kit": "^3.20.4",
    "@tiptap/vue-3": "^3.20.4"
  },
  "peerDependencies": {
    "@opencloud-eu/design-system": "workspace:^",
    "vue": "^3.5.0",
    "vue3-gettext": "^4.0.0-beta.1"
  },
  "devDependencies": {
    "@opencloud-eu/web-test-helpers": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/editor/tsconfig.json`**

```json
{
  "extends": "@opencloud-eu/tsconfig"
}
```

- [ ] **Step 3: Create `packages/editor/src/types.ts`**

```ts
import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: string
  readonly?: boolean
  onUpdate?: (content: string) => void
}

export interface TextEditorInstance {
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  readonly: Ref<boolean>
  getContent(): string
  setContent(value: string): void
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
```

- [ ] **Step 4: Create `packages/editor/src/index.ts`** (empty shell, will be filled as we build)

```ts
export type { ContentType, TextEditorOptions, TextEditorInstance } from './types'
```

- [ ] **Step 5: Install dependencies**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm install`
Expected: lockfile updates, all deps resolve

- [ ] **Step 6: Commit**

```bash
git add packages/editor/package.json packages/editor/tsconfig.json packages/editor/src/types.ts packages/editor/src/index.ts pnpm-lock.yaml
git commit -m "feat(editor): scaffold @opencloud-eu/editor package"
```

---

## Task 2: Toolbar types and item definitions

**Files:**
- Create: `packages/editor/src/toolbar/types.ts`
- Create: `packages/editor/src/toolbar/items.ts`

- [ ] **Step 1: Create `packages/editor/src/toolbar/types.ts`**

```ts
import type { Editor } from '@tiptap/vue-3'

export interface ToolbarItem {
  id: string
  label: string
  icon: string
  action: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
}

export type ToolbarGroup = ToolbarItem[]
```

- [ ] **Step 2: Create `packages/editor/src/toolbar/items.ts`**

Define all toolbar items. Each is a factory so labels can be translated at call time.

```ts
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarItem } from './types'

const item = (
  id: string,
  label: string,
  icon: string,
  action: (editor: Editor) => void,
  isActive: (editor: Editor) => boolean
): ToolbarItem => ({ id, label, icon, action, isActive })

// --- Text formatting ---
export const bold = (label: string): ToolbarItem =>
  item('bold', label, 'bold', (e) => e.chain().focus().toggleBold().run(), (e) => e.isActive('bold'))

export const italic = (label: string): ToolbarItem =>
  item('italic', label, 'italic', (e) => e.chain().focus().toggleItalic().run(), (e) => e.isActive('italic'))

export const underline = (label: string): ToolbarItem =>
  item('underline', label, 'underline', (e) => e.chain().focus().toggleUnderline().run(), (e) => e.isActive('underline'))

export const strikethrough = (label: string): ToolbarItem =>
  item('strikethrough', label, 'strikethrough', (e) => e.chain().focus().toggleStrike().run(), (e) => e.isActive('strike'))

// --- Headings ---
export const heading1 = (label: string): ToolbarItem =>
  item('heading-1', label, 'h-1', (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), (e) => e.isActive('heading', { level: 1 }))

export const heading2 = (label: string): ToolbarItem =>
  item('heading-2', label, 'h-2', (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), (e) => e.isActive('heading', { level: 2 }))

export const heading3 = (label: string): ToolbarItem =>
  item('heading-3', label, 'h-3', (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), (e) => e.isActive('heading', { level: 3 }))

// --- Lists ---
export const bulletList = (label: string): ToolbarItem =>
  item('bullet-list', label, 'list-unordered', (e) => e.chain().focus().toggleBulletList().run(), (e) => e.isActive('bulletList'))

export const orderedList = (label: string): ToolbarItem =>
  item('ordered-list', label, 'list-ordered-2', (e) => e.chain().focus().toggleOrderedList().run(), (e) => e.isActive('orderedList'))

export const taskList = (label: string): ToolbarItem =>
  item('task-list', label, 'list-check-3', (e) => e.chain().focus().toggleTaskList().run(), (e) => e.isActive('taskList'))

// --- Block ---
export const blockquote = (label: string): ToolbarItem =>
  item('blockquote', label, 'chat-quote-line', (e) => e.chain().focus().toggleBlockquote().run(), (e) => e.isActive('blockquote'))

export const codeInline = (label: string): ToolbarItem =>
  item('code-inline', label, 'code-line', (e) => e.chain().focus().toggleCode().run(), (e) => e.isActive('code'))

export const codeBlock = (label: string): ToolbarItem =>
  item('code-block', label, 'code-box-line', (e) => e.chain().focus().toggleCodeBlock().run(), (e) => e.isActive('codeBlock'))

export const horizontalRule = (label: string): ToolbarItem =>
  item('horizontal-rule', label, 'separator', (e) => e.chain().focus().setHorizontalRule().run(), () => false)

// --- Insert ---
// Link and image use callback-based actions so consumers can provide their own
// modal UI (e.g. design-system modals with DOMPurify sanitization).
// The callbacks are set via the strategy and wired up in useTextEditor.
export const link = (label: string, onRequestUrl: (editor: Editor, currentUrl?: string) => void): ToolbarItem =>
  item('link', label, 'link', (e) => {
    const previousUrl = e.getAttributes('link').href as string | undefined
    onRequestUrl(e, previousUrl)
  }, (e) => e.isActive('link'))

export const image = (label: string, onRequestUrl: (editor: Editor) => void): ToolbarItem =>
  item('image', label, 'image-line', (e) => {
    onRequestUrl(e)
  }, () => false)

export const table = (label: string): ToolbarItem =>
  item('table', label, 'table-line', (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), () => false)
```

- [ ] **Step 3: Export from index**

Add to `packages/editor/src/index.ts`:

```ts
export type { ToolbarItem, ToolbarGroup } from './toolbar/types'
```

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/toolbar/
git commit -m "feat(editor): add toolbar types and item definitions"
```

---

## Task 3: Strategy types and plain text strategy

**Files:**
- Create: `packages/editor/src/strategies/types.ts`
- Create: `packages/editor/src/strategies/plainText.ts`
- Create: `packages/editor/tests/unit/strategies/plainText.spec.ts`

- [ ] **Step 1: Create `packages/editor/src/strategies/types.ts`**

```ts
import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarGroup } from '../toolbar/types'

export interface ContentTypeStrategy {
  extensions(): Extension[]
  toolbarItems(): ToolbarGroup[]
  serialize(editor: Editor): string
  deserialize(content: string): Record<string, unknown> | string
}
```

- [ ] **Step 2: Write the failing test for plain text strategy**

Create `packages/editor/tests/unit/strategies/plainText.spec.ts`:

```ts
import { PlainTextStrategy } from '../../../src/strategies/plainText'

describe('PlainTextStrategy', () => {
  let strategy: PlainTextStrategy

  beforeEach(() => {
    strategy = new PlainTextStrategy()
  })

  describe('extensions', () => {
    it('returns base extensions only', () => {
      const extensions = strategy.extensions()
      const names = extensions.map((e) => e.name)
      expect(names).toContain('document')
      expect(names).toContain('paragraph')
      expect(names).toContain('text')
      expect(names).toContain('hardBreak')
      expect(names).not.toContain('bold')
      expect(names).not.toContain('italic')
    })
  })

  describe('toolbarItems', () => {
    it('returns empty array', () => {
      expect(strategy.toolbarItems()).toEqual([])
    })
  })

  describe('serialize', () => {
    it('calls getText on editor', () => {
      const mockEditor = { getText: vi.fn().mockReturnValue('hello') } as any
      expect(strategy.serialize(mockEditor)).toBe('hello')
      expect(mockEditor.getText).toHaveBeenCalled()
    })
  })

  describe('deserialize', () => {
    it('wraps text in paragraph nodes', () => {
      const result = strategy.deserialize('line1\nline2')
      expect(result).toEqual({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'line1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'line2' }] }
        ]
      })
    })

    it('handles empty string', () => {
      const result = strategy.deserialize('')
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      })
    })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/plainText.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `packages/editor/src/strategies/plainText.ts`**

```ts
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarGroup } from '../toolbar/types'
import type { ContentTypeStrategy } from './types'

export class PlainTextStrategy implements ContentTypeStrategy {
  extensions(): Extension[] {
    return [Document, Paragraph, Text, HardBreak]
  }

  toolbarItems(): ToolbarGroup[] {
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/plainText.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/strategies/types.ts packages/editor/src/strategies/plainText.ts packages/editor/tests/unit/strategies/plainText.spec.ts
git commit -m "feat(editor): add plain text strategy"
```

---

## Task 4: Rich text base strategy + HTML strategy

**Files:**
- Create: `packages/editor/src/strategies/richText.ts`
- Create: `packages/editor/src/strategies/html.ts`
- Create: `packages/editor/tests/unit/strategies/html.spec.ts`

- [ ] **Step 1: Write the failing test for HTML strategy**

Create `packages/editor/tests/unit/strategies/html.spec.ts`:

```ts
import { HtmlStrategy } from '../../../src/strategies/html'

describe('HtmlStrategy', () => {
  let strategy: HtmlStrategy

  beforeEach(() => {
    strategy = new HtmlStrategy()
  })

  describe('extensions', () => {
    it('includes rich text extensions', () => {
      const extensions = strategy.extensions()
      const names = extensions.map((e) => e.name)
      expect(names).toContain('underline')
      expect(names).toContain('image')
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
    })
  })

  describe('toolbarItems', () => {
    it('returns groups including underline and image', () => {
      const groups = strategy.toolbarItems()
      const allIds = groups.flat().map((item) => item.id)
      expect(allIds).toContain('underline')
      expect(allIds).toContain('image')
      expect(allIds).toContain('bold')
      expect(allIds).toContain('table')
    })
  })

  describe('serialize', () => {
    it('calls getHTML on editor', () => {
      const mockEditor = { getHTML: vi.fn().mockReturnValue('<p>hi</p>') } as any
      expect(strategy.serialize(mockEditor)).toBe('<p>hi</p>')
    })
  })

  describe('deserialize', () => {
    it('returns HTML string as-is', () => {
      expect(strategy.deserialize('<p>hello</p>')).toBe('<p>hello</p>')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/html.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/editor/src/strategies/richText.ts`** (shared base)

```ts
import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import type { ToolbarGroup } from '../toolbar/types'
import type { ContentTypeStrategy } from './types'
import * as items from '../toolbar/items'

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
    const linkCallback: LinkUrlCallback = this.onRequestLinkUrl ?? ((editor, currentUrl) => {
      const url = window.prompt('URL', currentUrl)
      if (url === null) return
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    })

    const imageCallback: ImageUrlCallback = this.onRequestImageUrl ?? ((editor) => {
      const url = window.prompt('Image URL')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    })

    return [
      [items.bold('Bold'), items.italic('Italic'), items.underline('Underline'), items.strikethrough('Strikethrough')],
      [items.heading1('Heading 1'), items.heading2('Heading 2'), items.heading3('Heading 3')],
      [items.bulletList('Bullet list'), items.orderedList('Ordered list'), items.taskList('Task list')],
      [items.blockquote('Blockquote'), items.codeInline('Inline code'), items.codeBlock('Code block'), items.horizontalRule('Horizontal rule')],
      [items.link('Link', linkCallback), items.image('Image', imageCallback), items.table('Table')]
    ]
  }

  abstract serialize(editor: Editor): string
  abstract deserialize(content: string): Record<string, unknown> | string
}
```

- [ ] **Step 4: Implement `packages/editor/src/strategies/html.ts`**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/html.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/strategies/richText.ts packages/editor/src/strategies/html.ts packages/editor/tests/unit/strategies/html.spec.ts
git commit -m "feat(editor): add rich text base and HTML strategy"
```

---

## Task 5: Tiptap JSON strategy

**Files:**
- Create: `packages/editor/src/strategies/tiptapJson.ts`
- Create: `packages/editor/tests/unit/strategies/tiptapJson.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/editor/tests/unit/strategies/tiptapJson.spec.ts`:

```ts
import { TiptapJsonStrategy } from '../../../src/strategies/tiptapJson'

describe('TiptapJsonStrategy', () => {
  let strategy: TiptapJsonStrategy

  beforeEach(() => {
    strategy = new TiptapJsonStrategy()
  })

  describe('extensions', () => {
    it('returns same extensions as HTML strategy', () => {
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('underline')
      expect(names).toContain('image')
    })
  })

  describe('serialize', () => {
    it('returns JSON string from editor', () => {
      const doc = { type: 'doc', content: [] }
      const mockEditor = { getJSON: vi.fn().mockReturnValue(doc) } as any
      expect(strategy.serialize(mockEditor)).toBe(JSON.stringify(doc))
    })
  })

  describe('deserialize', () => {
    it('parses JSON string to object', () => {
      const doc = { type: 'doc', content: [{ type: 'paragraph' }] }
      expect(strategy.deserialize(JSON.stringify(doc))).toEqual(doc)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/tiptapJson.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/editor/src/strategies/tiptapJson.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/tiptapJson.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/strategies/tiptapJson.ts packages/editor/tests/unit/strategies/tiptapJson.spec.ts
git commit -m "feat(editor): add tiptap JSON strategy"
```

---

## Task 6: Markdown strategy

**Files:**
- Create: `packages/editor/src/strategies/markdown.ts`
- Create: `packages/editor/tests/unit/strategies/markdown.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/editor/tests/unit/strategies/markdown.spec.ts`:

```ts
import { MarkdownStrategy } from '../../../src/strategies/markdown'

describe('MarkdownStrategy', () => {
  let strategy: MarkdownStrategy

  beforeEach(() => {
    strategy = new MarkdownStrategy()
  })

  describe('extensions', () => {
    it('includes markdown-relevant extensions but not underline or image', () => {
      const names = strategy.extensions().map((e) => e.name)
      expect(names).toContain('link')
      expect(names).toContain('table')
      expect(names).toContain('taskList')
      expect(names).not.toContain('underline')
      expect(names).not.toContain('image')
    })
  })

  describe('toolbarItems', () => {
    it('does not include underline or image', () => {
      const allIds = strategy.toolbarItems().flat().map((item) => item.id)
      expect(allIds).toContain('bold')
      expect(allIds).toContain('link')
      expect(allIds).not.toContain('underline')
      expect(allIds).not.toContain('image')
    })
  })

  describe('serialize', () => {
    it('calls getMarkdown on editor storage', () => {
      const mockEditor = {
        storage: { markdown: { getMarkdown: vi.fn().mockReturnValue('# Hello') } }
      } as any
      expect(strategy.serialize(mockEditor)).toBe('# Hello')
    })
  })

  describe('deserialize', () => {
    it('returns markdown string as-is (tiptap/markdown handles parsing)', () => {
      expect(strategy.deserialize('# Hello')).toBe('# Hello')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/markdown.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/editor/src/strategies/markdown.ts`**

```ts
import type { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Markdown from '@tiptap/markdown'
import type { ToolbarGroup } from '../toolbar/types'
import type { ContentTypeStrategy } from './types'
import * as items from '../toolbar/items'

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
    const linkCallback = this.onRequestLinkUrl ?? ((editor: any, currentUrl?: string) => {
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
      [items.bulletList('Bullet list'), items.orderedList('Ordered list'), items.taskList('Task list')],
      [items.blockquote('Blockquote'), items.codeInline('Inline code'), items.codeBlock('Code block'), items.horizontalRule('Horizontal rule')],
      [items.link('Link', linkCallback), items.table('Table')]
    ]
  }

  serialize(editor: Editor): string {
    return editor.storage.markdown.getMarkdown()
  }

  deserialize(content: string): string {
    return content
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/strategies/markdown.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/strategies/markdown.ts packages/editor/tests/unit/strategies/markdown.spec.ts
git commit -m "feat(editor): add markdown strategy"
```

---

## Task 7: Strategy resolver

**Files:**
- Create: `packages/editor/src/strategies/resolveStrategy.ts`

- [ ] **Step 1: Implement `packages/editor/src/strategies/resolveStrategy.ts`**

```ts
import type { ContentType, TextEditorOptions } from '../types'
import type { ContentTypeStrategy } from './types'
import type { LinkUrlCallback, ImageUrlCallback } from './richText'
import { PlainTextStrategy } from './plainText'
import { MarkdownStrategy } from './markdown'
import { HtmlStrategy } from './html'
import { TiptapJsonStrategy } from './tiptapJson'

export interface StrategyCallbacks {
  onRequestLinkUrl?: LinkUrlCallback
  onRequestImageUrl?: ImageUrlCallback
}

export function resolveStrategy(contentType: ContentType, callbacks: StrategyCallbacks = {}): ContentTypeStrategy {
  switch (contentType) {
    case 'plain-text':
      return new PlainTextStrategy()
    case 'markdown':
      return new MarkdownStrategy(callbacks.onRequestLinkUrl)
    case 'html':
      return new HtmlStrategy(callbacks.onRequestLinkUrl, callbacks.onRequestImageUrl)
    case 'tiptap-json':
      return new TiptapJsonStrategy(callbacks.onRequestLinkUrl, callbacks.onRequestImageUrl)
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/editor/src/strategies/resolveStrategy.ts
git commit -m "feat(editor): add strategy resolver"
```

---

## Task 8: `useTextEditor` composable

**Files:**
- Create: `packages/editor/src/composables/useTextEditor.ts`
- Create: `packages/editor/tests/unit/composables/useTextEditor.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/editor/tests/unit/composables/useTextEditor.spec.ts`:

```ts
import { useTextEditor } from '../../../src/composables/useTextEditor'
import { withSetup } from './helpers'

// Helper to run composable in a Vue component context
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
```

Create `packages/editor/tests/unit/composables/helpers.ts`:

```ts
import { createApp, defineComponent, h } from 'vue'

export function withSetup<T>(composable: () => T): { result: T } {
  let result!: T
  const app = createApp(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      }
    })
  )
  app.mount(document.createElement('div'))
  return { result }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/composables/useTextEditor.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/editor/src/composables/useTextEditor.ts`**

```ts
import { shallowRef, ref, computed, onBeforeUnmount, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import type { TextEditorOptions, TextEditorInstance } from '../types'
import { resolveStrategy } from '../strategies/resolveStrategy'

export function useTextEditor(options: TextEditorOptions): TextEditorInstance {
  const contentType = ref(options.contentType)
  const readonly = ref(options.readonly ?? false)
  const strategy = resolveStrategy(options.contentType, {
    onRequestLinkUrl: options.onRequestLinkUrl
      ? (editor, currentUrl) => {
          options.onRequestLinkUrl!(currentUrl).then((url) => {
            if (url === null) return
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              return
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          })
        }
      : undefined,
    onRequestImageUrl: options.onRequestImageUrl
      ? (editor) => {
          options.onRequestImageUrl!().then((url) => {
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
          })
        }
      : undefined
  })

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const editor = useEditor({
    extensions: strategy.extensions(),
    content: options.modelValue ? strategy.deserialize(options.modelValue) : '',
    editable: !readonly.value,
    onUpdate({ editor: e }) {
      if (!options.onUpdate) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        options.onUpdate!(strategy.serialize(e))
      }, 250)
    }
  })

  watch(readonly, (value) => {
    editor.value?.setEditable(!value)
  })

  const getContent = (): string => {
    if (!editor.value) return ''
    return strategy.serialize(editor.value)
  }

  const setContent = (value: string): void => {
    if (!editor.value) return
    const content = strategy.deserialize(value)
    editor.value.commands.setContent(content, { emitUpdate: false })
  }

  const isEmpty = computed(() => editor.value?.isEmpty ?? true)
  const isFocused = computed(() => editor.value?.isFocused ?? false)

  const focus = (): void => {
    editor.value?.commands.focus('end')
  }

  const blur = (): void => {
    editor.value?.commands.blur()
  }

  const destroy = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer)
    editor.value?.destroy()
    editor.value = null
  }

  onBeforeUnmount(() => {
    destroy()
  })

  return {
    editor: editor as TextEditorInstance['editor'],
    contentType,
    readonly,
    getContent,
    setContent,
    isEmpty,
    isFocused,
    focus,
    blur,
    destroy
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/unit/composables/useTextEditor.spec.ts`
Expected: PASS

- [ ] **Step 5: Export from index**

Update `packages/editor/src/index.ts`:

```ts
export type { ContentType, TextEditorOptions, TextEditorInstance } from './types'
export type { ToolbarItem, ToolbarGroup } from './toolbar/types'
export { useTextEditor } from './composables/useTextEditor'
```

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/composables/ packages/editor/tests/unit/composables/ packages/editor/src/index.ts
git commit -m "feat(editor): add useTextEditor composable"
```

---

## Task 9: Vue components — Provider, Content, Toolbar

**Files:**
- Create: `packages/editor/src/components/TextEditorProvider.vue`
- Create: `packages/editor/src/components/TextEditorContent.vue`
- Create: `packages/editor/src/components/TextEditorToolbar.vue`
- Create: `packages/editor/tests/unit/components/TextEditorProvider.spec.ts`
- Create: `packages/editor/tests/unit/components/TextEditorContent.spec.ts`
- Create: `packages/editor/tests/unit/components/TextEditorToolbar.spec.ts`

- [ ] **Step 1: Implement `TextEditorProvider.vue`**

```vue
<template>
  <div class="text-editor-provider">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { TextEditorInstance } from '../types'

const props = defineProps<{
  editor: TextEditorInstance
}>()

provide('textEditor', props.editor)
</script>
```

- [ ] **Step 2: Implement `TextEditorContent.vue`**

```vue
<template>
  <EditorContent v-if="textEditor.editor.value" :editor="textEditor.editor.value" />
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!
</script>
```

- [ ] **Step 3: Update `types.ts` to include `toolbarItems` on `TextEditorInstance`**

The toolbar component needs access to the strategy's toolbar items. Expose them on the instance so the toolbar can read them via inject.

Update `packages/editor/src/types.ts` — add `toolbarItems` to `TextEditorInstance`:

```ts
import type { ShallowRef, Ref, ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarGroup } from './toolbar/types'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: string
  readonly?: boolean
  onUpdate?: (content: string) => void
  onRequestLinkUrl?: (currentUrl?: string) => Promise<string | null>
  onRequestImageUrl?: () => Promise<string | null>
}

export interface TextEditorInstance {
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  readonly: Ref<boolean>
  toolbarItems: ToolbarGroup[]
  getContent(): string
  setContent(value: string): void
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
```

- [ ] **Step 4: Update `useTextEditor.ts` to return `toolbarItems`**

Add `toolbarItems: strategy.toolbarItems()` to the return object in `packages/editor/src/composables/useTextEditor.ts`:

```ts
  return {
    editor: editor as TextEditorInstance['editor'],
    contentType,
    readonly,
    toolbarItems: strategy.toolbarItems(),
    getContent,
    setContent,
    isEmpty,
    isFocused,
    focus,
    blur,
    destroy
  }
```

- [ ] **Step 5: Implement `TextEditorToolbar.vue`**

```vue
<template>
  <div v-if="visible" class="text-editor-toolbar inline-flex items-center gap-3">
    <div
      v-for="(group, groupIndex) in textEditor.toolbarItems"
      :key="groupIndex"
      class="text-editor-toolbar-group inline-flex items-stretch rounded-lg overflow-hidden bg-role-surface-variant"
    >
      <oc-button
        v-for="item in group"
        :key="item.id"
        type="button"
        appearance="raw"
        class="text-editor-toolbar-btn min-w-[42px] h-[35px] px-[11px] inline-flex items-center justify-center"
        :class="{ 'text-editor-toolbar-btn--active': item.isActive(textEditor.editor.value!) }"
        :aria-label="item.label"
        @click.stop="item.action(textEditor.editor.value!)"
      >
        <oc-icon :name="item.icon" fill-type="none" size="small" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!

const visible = computed(() => {
  if (textEditor.readonly.value) return false
  if (textEditor.contentType.value === 'plain-text') return false
  return !!textEditor.editor.value
})
</script>
```

- [ ] **Step 6: Write tests for components**

Create `packages/editor/tests/unit/components/TextEditorProvider.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import TextEditorProvider from '../../../src/components/TextEditorProvider.vue'

describe('TextEditorProvider', () => {
  it('renders slot content', () => {
    const wrapper = mount(TextEditorProvider, {
      props: { editor: {} as any },
      slots: { default: '<div class="child">content</div>' }
    })
    expect(wrapper.find('.child').exists()).toBe(true)
  })

  it('provides editor to children', () => {
    const editor = { contentType: { value: 'html' } } as any
    const wrapper = mount(TextEditorProvider, {
      props: { editor },
      slots: { default: '<div />' }
    })
    expect(wrapper.find('.text-editor-provider').exists()).toBe(true)
  })
})
```

- [ ] **Step 7: Update `packages/editor/src/index.ts`** with component exports

```ts
export type { ContentType, TextEditorOptions, TextEditorInstance } from './types'
export type { ToolbarItem, ToolbarGroup } from './toolbar/types'
export { useTextEditor } from './composables/useTextEditor'
export { default as TextEditorProvider } from './components/TextEditorProvider.vue'
export { default as TextEditorContent } from './components/TextEditorContent.vue'
export { default as TextEditorToolbar } from './components/TextEditorToolbar.vue'
```

- [ ] **Step 8: Run all tests**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run packages/editor/tests/`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/editor/src/components/ packages/editor/src/types.ts packages/editor/src/composables/useTextEditor.ts packages/editor/src/index.ts packages/editor/tests/unit/components/
git commit -m "feat(editor): add TextEditorProvider, TextEditorContent, TextEditorToolbar components"
```

---

## Task 10: Integrate into mail app

**Files:**
- Modify: `packages/web-app-mail/src/components/MailComposeForm.vue`
- Remove: `packages/web-app-mail/src/components/MailBodyEditor.vue`
- Remove: `packages/web-app-mail/src/components/MailComposeFormattingToolbar.vue`
- Modify: `packages/web-app-mail/package.json`

- [ ] **Step 1: Read `MailComposeForm.vue`** to understand how `MailBodyEditor` is used

Run: Read `packages/web-app-mail/src/components/MailComposeForm.vue` and identify the MailBodyEditor usage pattern.

- [ ] **Step 2: Update `MailComposeForm.vue`**

Replace `MailBodyEditor` import and usage with:

```ts
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/editor'
import DOMPurify from 'dompurify'
import { useModals } from '@opencloud-eu/web-pkg'

const { dispatchModal } = useModals()
```

Set up the editor with link sanitization via design-system modal (preserving `MailBodyEditor`'s existing behavior):

```ts
const textEditor = useTextEditor({
  contentType: 'html',
  modelValue: bodyContent.value,
  onUpdate: (content) => {
    // update body content reactive ref
  },
  onRequestLinkUrl: (currentUrl?: string) => {
    return new Promise((resolve) => {
      dispatchModal({
        title: $gettext('Add link'),
        confirmText: $gettext('Apply'),
        hasInput: true,
        inputType: 'text',
        inputLabel: $gettext('URL'),
        inputValue: currentUrl ?? '',
        onConfirm: (value: any) => {
          const raw = typeof value === 'string' ? value : (value ?? '').toString()
          const cleaned = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
          if (!cleaned) { resolve(null); return }
          let href = cleaned
          if (!/^[a-zA-Z][\w+.-]*:/.test(href)) href = `https://${href}`
          try {
            const url = new URL(href)
            if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) { resolve(null); return }
            resolve(url.href)
          } catch {
            resolve(null)
          }
        },
        onCancel: () => resolve(null)
      })
    })
  }
})
```

Replace the template `<MailBodyEditor>` with — preserving the wrapper-click-to-focus behavior:

```vue
<div class="mail-body-editor-wrapper" @click="onWrapperClick">
  <TextEditorProvider :editor="textEditor">
    <TextEditorContent />
    <TextEditorToolbar />  <!-- at bottom, preserving current layout -->
  </TextEditorProvider>
</div>
```

Add wrapper-click handler (preserves existing UX where clicking below content focuses the editor):

```ts
const onWrapperClick = (event: MouseEvent) => {
  if (!textEditor.editor.value) return
  const editorDom = textEditor.editor.value.view.dom as HTMLElement
  if (editorDom.contains(event.target as Node)) return
  textEditor.focus()
}
```

**Behaviors to preserve from `MailBodyEditor.vue`:**
- DOMPurify link sanitization (moved to `onRequestLinkUrl` callback above)
- Design-system modal for link URL entry (moved to `onRequestLinkUrl` callback above)
- Click-outside-to-focus on the editor wrapper
- `watch` on external `modelValue` changes calling `setContent` (use `watch` on the body content ref)

- [ ] **Step 3: Update `packages/web-app-mail/package.json`**

Remove tiptap dependencies from `dependencies`, add `@opencloud-eu/editor`:

```json
{
  "dependencies": {
    "@opencloud-eu/editor": "workspace:*",
    "ical.js": "^2.2.1"
  }
}
```

- [ ] **Step 4: Delete old files**

```bash
rm packages/web-app-mail/src/components/MailBodyEditor.vue
rm packages/web-app-mail/src/components/MailComposeFormattingToolbar.vue
```

- [ ] **Step 5: Run `pnpm install`** to update lockfile

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm install`

- [ ] **Step 6: Verify build**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm run build`
Expected: builds without errors

- [ ] **Step 7: Commit**

```bash
git add packages/web-app-mail/ pnpm-lock.yaml
git commit -m "refactor(mail): replace MailBodyEditor with @opencloud-eu/editor"
```

---

## Task 11: Integrate into text editor app

**Files:**
- Modify: `packages/web-app-text-editor/src/App.vue`
- Modify: `packages/web-app-text-editor/src/index.ts`
- Modify: `packages/web-app-text-editor/package.json`
- Remove: `packages/web-pkg/src/components/TextEditor/TextEditor.vue`
- Remove: `packages/web-pkg/src/components/TextEditor/index.ts`
- Remove: `packages/web-pkg/src/components/TextEditor/l18n.ts`

- [ ] **Step 1: Update `packages/web-app-text-editor/package.json`**

Add `@opencloud-eu/editor` dependency:

```json
{
  "peerDependencies": {
    "@opencloud-eu/editor": "workspace:*",
    "@opencloud-eu/design-system": "workspace:^",
    "@opencloud-eu/web-client": "workspace:*",
    "@opencloud-eu/web-pkg": "workspace:*",
    "vue-concurrency": "5.0.3",
    "vue3-gettext": "^4.0.0-beta.1"
  }
}
```

- [ ] **Step 2: Rewrite `packages/web-app-text-editor/src/App.vue`**

Replace `md-editor-v3` / `TextEditorComponent` usage with `@opencloud-eu/editor`:

```vue
<template>
  <div class="oc-text-editor size-full" :class="{ 'p-4 overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/editor'
import type { ContentType } from '@opencloud-eu/editor'
import type { Resource } from '@opencloud-eu/web-client'

const props = defineProps<{
  currentContent: string
  isReadOnly?: boolean
  resource: Resource
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const contentType = computed<ContentType>(() => {
  const ext = props.resource?.extension?.toLowerCase()
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  return 'plain-text'
})

// Note: contentType.value is a snapshot — the editor is created once per component mount.
// This is fine because the text-editor app remounts App.vue for each file.
const textEditor = useTextEditor({
  contentType: contentType.value,
  modelValue: props.currentContent,
  readonly: props.isReadOnly,
  onUpdate: (content) => emit('update:currentContent', content)
})
</script>
```

- [ ] **Step 3: Remove old TextEditor from web-pkg**

```bash
rm packages/web-pkg/src/components/TextEditor/TextEditor.vue
rm packages/web-pkg/src/components/TextEditor/index.ts
rm packages/web-pkg/src/components/TextEditor/l18n.ts
rmdir packages/web-pkg/src/components/TextEditor
```

- [ ] **Step 4: Update web-pkg exports**

Find and remove the `TextEditor` export from `packages/web-pkg/src/components/index.ts` (or wherever it's re-exported).

- [ ] **Step 5: Remove `md-editor-v3` and `@codemirror/view` from web-pkg dependencies**

Check `packages/web-pkg/package.json` and remove `md-editor-v3`, `cropperjs`, `@codemirror/view`, `screenfull` if they are only used by TextEditor.

- [ ] **Step 6: Run `pnpm install`**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm install`

- [ ] **Step 7: Verify build**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm run build`
Expected: builds without errors

- [ ] **Step 8: Commit**

```bash
git add packages/web-app-text-editor/ packages/web-pkg/ pnpm-lock.yaml
git commit -m "refactor(text-editor): replace md-editor-v3 with @opencloud-eu/editor"
```

---

## Task 12: ProseMirror content styles

The existing `MailBodyEditor.vue` has ~170 lines of CSS targeting `.ProseMirror` for content styling (paragraph margins, list styles, blockquote borders, code blocks, link colors, etc.). The design system does not provide these styles today. The editor package needs base ProseMirror content styles using design system tokens.

**Files:**
- Create: `packages/editor/src/styles/content.css`

- [ ] **Step 1: Extract ProseMirror styles from `MailBodyEditor.vue`**

Read the `<style>` section of `packages/web-app-mail/src/components/MailBodyEditor.vue` (lines 157-335). Create `packages/editor/src/styles/content.css` with these styles adapted to use the `.text-editor-content` class scope instead of `.mail-body-editor`, and use design system CSS custom properties (`--oc-color-role-*`, `--oc-font-family`, etc.) where the mail app uses hardcoded values.

Key styles to include:
- `.ProseMirror` outline/border removal, font-size, line-height
- `p` margin
- `ul`, `ol` list styles and padding
- `li` margin
- `strong`, `em`, `u` formatting
- `blockquote` border-left, padding, style
- `pre`, `code` font-family, background, border-radius
- `a` link color, text-decoration
- `table`, `td`, `th` borders and padding (new for tables)
- `ul[data-type="taskList"]` task list styles (new)

- [ ] **Step 2: Import styles in `TextEditorContent.vue`**

Add to `TextEditorContent.vue`:

```vue
<style>
@import '../styles/content.css';
</style>
```

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/styles/ packages/editor/src/components/TextEditorContent.vue
git commit -m "feat(editor): add ProseMirror content styles using design system tokens"
```

---

## Task 13: Run full test suite and fix breakage

**Files:**
- Potentially modify any files with broken imports

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm vitest run`
Expected: identify any import breakage from removing TextEditor from web-pkg

- [ ] **Step 2: Fix any broken imports**

Search for imports of `TextEditor` from `@opencloud-eu/web-pkg` and update them to `@opencloud-eu/editor`.

Run: `grep -r "TextEditor.*web-pkg\|web-pkg.*TextEditor" packages/ --include="*.ts" --include="*.vue" -l`

- [ ] **Step 3: Run type check**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm run check:types`
Expected: no type errors

- [ ] **Step 4: Run lint**

Run: `cd /Users/b.kulmann/Code/OpenCloud/web && pnpm run lint`
Expected: no lint errors (fix any that appear)

- [ ] **Step 5: Commit any fixes**

```bash
git add -u
git commit -m "fix: update TextEditor imports after migration to @opencloud-eu/editor"
```
