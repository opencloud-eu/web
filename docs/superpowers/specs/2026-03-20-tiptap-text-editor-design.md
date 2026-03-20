# `@opencloud-eu/editor` — Tiptap-based TextEditor Component

## Overview

A standalone package providing a generic, content-type-aware rich text editor built on Tiptap v3. The editor adapts its toolbar and serialization based on the content type: plain text, markdown, HTML, or tiptap JSON.

## Goals

- Single reusable editor package that replaces both the mail app's `MailBodyEditor` and the text editor app's `md-editor-v3` usage
- Content-type-aware toolbar that only shows relevant formatting tools
- Read-only rendering mode (no editor UI, just rendered content)
- Tiptap internals fully encapsulated — consumers never touch tiptap APIs
- Styling inherits from the design system's Tailwind tokens

## Package Structure

```
packages/editor/
├── package.json              # @opencloud-eu/editor
├── tsconfig.json
├── src/
│   ├── index.ts              # public exports
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
│   │   ├── markdown.ts
│   │   ├── html.ts
│   │   └── tiptapJson.ts
│   └── toolbar/
│       ├── types.ts
│       └── items.ts
```

## Public API

### Types

```ts
type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

interface TextEditorOptions {
  contentType: ContentType
  modelValue?: string
  readonly?: boolean
  onUpdate?: (content: string) => void  // serialized in source format, debounced internally
}

interface TextEditorInstance {
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

### Composable

```ts
function useTextEditor(options: TextEditorOptions): TextEditorInstance
```

### Components

- **`TextEditorProvider`** — props: `{ editor: TextEditorInstance }`. Provides editor to children via Vue's provide/inject.
- **`TextEditorContent`** — no props. Injects editor, renders ProseMirror view.
- **`TextEditorToolbar`** — no props. Injects editor, renders toolbar items from the active strategy. Hidden when `readonly` is true or content type is `plain-text`.

### Usage

**Editing:**

```vue
const { editor } = useTextEditor({
  contentType: 'markdown',
  modelValue: props.content,
})

<TextEditorProvider :editor="editor">
  <TextEditorToolbar />
  <TextEditorContent />
</TextEditorProvider>
```

**Read-only rendering:**

```vue
const { editor } = useTextEditor({
  contentType: 'html',
  modelValue: props.content,
  readonly: true,
})

<TextEditorProvider :editor="editor">
  <TextEditorContent />
</TextEditorProvider>
```

**Update handling:** An explicit `onUpdate` callback in `TextEditorOptions` rather than v-model. The callback receives the serialized content string in the source format and is debounced internally to avoid serialization cost on every keystroke. Consumers can also pull content on demand via `getContent()`.

## Content Type Strategy Pattern

Each content type is a strategy implementing:

```ts
interface ContentTypeStrategy {
  extensions(): Extension[]
  toolbarItems(): ToolbarGroup[]
  serialize(editor: Editor): string
  deserialize(content: string): Content
}
```

### Plain Text

- **Extensions:** `Document`, `Paragraph`, `Text`, `HardBreak`
- **Toolbar:** none
- **Serialize:** `editor.getText()`
- **Deserialize:** wrap in paragraph nodes
- **Behavior:** strips formatting on paste

### Markdown

- **Extensions:** `StarterKit`, `Link`, `Table`, `TaskList`, `TaskItem`, `CodeBlock`, `HorizontalRule`
- **Toolbar:** bold, italic, strikethrough, heading (1-3), bullet list, ordered list, task list, blockquote, code inline, code block, link, horizontal rule, table
- **Serialize/deserialize:** `@tiptap/markdown` with custom node mappings
- **Note:** round-trip fidelity is best-effort — tiptap normalizes some markdown constructs

### HTML

- **Extensions:** everything markdown has + `Underline`, `Image`
- **Toolbar:** everything markdown has + underline, image
- **Serialize:** `editor.getHTML()`
- **Deserialize:** pass HTML directly (tiptap parses natively)

### Tiptap JSON

- **Extensions:** same as HTML
- **Toolbar:** same as HTML
- **Serialize:** `JSON.stringify(editor.getJSON())`
- **Deserialize:** `JSON.parse(content)` passed to tiptap directly
- **Note:** lossless round-trip (native format)

HTML and Tiptap JSON share the same extension set and toolbar — only serialization differs. They share a base strategy to avoid duplication.

## Toolbar Architecture

### Types

```ts
interface ToolbarItem {
  id: string
  label: string
  icon: string
  action: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
}

type ToolbarGroup = ToolbarItem[]
```

### Grouping

| Group | Items |
|---|---|
| Text formatting | Bold, Italic, Underline*, Strikethrough |
| Headings | H1, H2, H3 |
| Lists | Bullet list, Ordered list, Task list |
| Block | Blockquote, Code block, Horizontal rule |
| Insert | Link, Image*, Table |

*Underline and Image only present for HTML and Tiptap JSON content types.

### Rendering

- Flat row of icon buttons grouped with visual separators
- Each button shows active state via `isActive`
- Hidden entirely when `readonly` or `plain-text`
- No dropdowns or nested menus

## Integration Plan

### Mail app (`web-app-mail`)

- Remove `MailBodyEditor.vue` and `MailComposeFormattingToolbar.vue`
- Replace with `useTextEditor({ contentType: 'html' })`
- `TextEditorToolbar` placed at the bottom of compose form (preserving current layout)
- `TextEditorContent` in the compose body area
- Link sanitization (DOMPurify) moves into the HTML strategy's `Link` extension config
- Tiptap dependencies removed from `web-app-mail/package.json`

### Text editor app (`web-app-text-editor`)

- Replace `md-editor-v3` usage with the new editor
- Content type resolved from file extension: `.md`/`.markdown` → `markdown`, everything else → `plain-text`
- Read-only mode uses same component with `readonly: true`
- `md-editor-v3` and `@codemirror` dependencies removed from `web-pkg`
- The existing `TextEditor` component in `web-pkg/src/components/TextEditor/` replaced by imports from `@opencloud-eu/editor`

### Notes app (external, `web-extensions`)

- Consumes `@opencloud-eu/editor` as a dependency
- Picks whichever content type fits its storage format

### Dependency flow

```
@opencloud-eu/editor (owns all tiptap deps)
  ↑
  ├── web-app-mail
  ├── web-app-text-editor
  └── web-extensions/notes (external)
```

Tiptap dependencies live only in `@opencloud-eu/editor`. No other package imports tiptap directly.

## Styling

The editor does not ship its own base styles. All typography, spacing, and visual styling inherits from the design system's Tailwind tokens and CSS custom properties (`--oc-*`).
