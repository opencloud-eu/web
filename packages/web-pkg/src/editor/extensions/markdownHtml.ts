import { Mark, Node, mergeAttributes } from '@tiptap/core'
import type { JSONContent, MarkdownToken } from '@tiptap/core'
import { Tokenizer } from 'marked'
import type { Marked, TokenizerObject, Tokens } from 'marked'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import HtmlBlockComponent from '../components/HtmlBlockComponent.vue'

const htmlBlockTokenType = 'htmlBlock'
const htmlInlineTokenType = 'htmlInline'

/**
 * The resized image the editor writes itself, see the markdown strategy. Anything
 * beyond these attributes would be lost by the image node, so it stays raw. So do
 * `"` and entity references, which the editor writes escaped, see
 * `escapeImageHtmlAttribute`. A bare `&`, e.g. in a query string, is what the
 * editor writes itself.
 */
const editorImageTag =
  '<img(?:\\s+(?:src|alt|title|width|height)="(?:[^"&]|&(?!#|[a-zA-Z][a-zA-Z0-9]*;))*")*\\s*\\/?>'
const editorImagePattern = new RegExp(`^${editorImageTag}$`, 'i')
const leadingEditorImagePattern = new RegExp(`^${editorImageTag}`, 'i')
// the editor writes unsized images as markdown
const sizedImagePattern = /\s(?:width|height)="/i

/**
 * Escapes an attribute value of the resized image the editor writes. Only escapes
 * what `editorImagePattern` rejects, so an image without such characters is read
 * back as an image node and one with them stays raw html.
 */
export function escapeImageHtmlAttribute(value: string): string {
  return value.replace(/"|&(?=#|[a-zA-Z][a-zA-Z0-9]*;)/g, (char) =>
    char === '"' ? '&quot;' : '&amp;'
  )
}

// every `<br>` goes to tiptap as a hard break, the editor writes those into table cells
const lineBreakPattern = /^<br\s*\/?>$/i

// tiptap decodes these and numeric references itself, decoding them here too would decode twice
const tiptapEntities = new Set(['amp', 'lt', 'gt', 'quot'])
// other spellings like `&AMP;` go to tiptap in its form, so `&AMP;lt;` stays `&lt;`
const tiptapEntityByChar: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}
const namedEntityPattern = /&([a-zA-Z][a-zA-Z0-9]*);/g

let entityDecoder: HTMLTextAreaElement | null = null

/**
 * Tiptap only decodes a handful of entities, every other named one stays literal
 * text and gets escaped again on save. The browser knows the full HTML entity
 * list, a textarea decodes entities without parsing tags.
 */
function decodeNamedHtmlEntities(text: string): string {
  if (typeof document === 'undefined' || !text.includes('&')) {
    return text
  }

  return text.replace(namedEntityPattern, (entity, name: string) => {
    if (tiptapEntities.has(name)) {
      return entity
    }

    entityDecoder ??= document.createElement('textarea')
    entityDecoder.innerHTML = entity
    const decoded = entityDecoder.value

    // the browser decodes a known prefix of unknown names (`&noti;` to `¬i;`), markdown keeps them
    if (decoded.endsWith(';') && name !== 'semi') {
      return entity
    }

    return tiptapEntityByChar[decoded] ?? decoded
  })
}

function startsWithResizedEditorImage(line: string): boolean {
  const tag = line.match(leadingEditorImagePattern)?.[0]
  return !!tag && sizedImagePattern.test(tag)
}

/**
 * A resized image followed by more lines, e.g. after a hard break, is how the
 * editor writes a paragraph starting with one. CommonMark reads it as an html
 * block. Other tags on the following lines mean hand-written html, that stays a block.
 */
function isParagraphStartingWithImage(raw: string): boolean {
  const [first, ...rest] = raw
    .trimEnd()
    .split('\n')
    .map((line) => line.trim())

  return (
    rest.length > 0 &&
    startsWithResizedEditorImage(first) &&
    rest.every((line) => !line.startsWith('<') || startsWithResizedEditorImage(line))
  )
}

/**
 * Decodes named entities and, with `keepSource`, hands raw HTML to the nodes
 * below instead of tiptap. Tiptap runs it through the editor schema and keeps
 * only what that knows: unknown tags lose everything but their text, comments
 * vanish.
 *
 * Takes the instance as an argument for the same reason as the frontmatter
 * tokenizer, the marked singleton would grow with every editor.
 */
export function registerMarkdownHtmlTokenizer(
  instance: Marked,
  { keepSource }: { keepSource: boolean }
): void {
  const inlineText: TokenizerObject['inlineText'] = function (src) {
    const token = Tokenizer.prototype.inlineText.call(this, src) as Tokens.Text | undefined
    if (!token) {
      return false
    }

    return { ...token, text: decodeNamedHtmlEntities(token.text) }
  }

  const html: TokenizerObject['html'] = function (src) {
    const token = Tokenizer.prototype.html.call(this, src) as Tokens.HTML | undefined
    if (!token) {
      return false
    }

    // `undefined` makes marked skip the html rule, `false` falls back to the original tokenizer
    if (isParagraphStartingWithImage(token.raw)) {
      return undefined
    }

    if (!keepSource || editorImagePattern.test(token.raw.trim())) {
      return token
    }

    return { ...token, type: htmlBlockTokenType } as unknown as Tokens.HTML
  }

  if (!keepSource) {
    instance.use({ tokenizer: { inlineText, html } })
    return
  }

  instance.use({
    tokenizer: {
      inlineText,
      html,
      tag(src) {
        const token = Tokenizer.prototype.tag.call(this, src) as Tokens.Tag | undefined
        if (!token) {
          return false
        }

        // The editor writes resized images on one line, e.g. next to text. In link
        // text the image node would drop the link, so it stays raw. An unsized one
        // would be saved as markdown, which breaks e.g. on a space in its source.
        const isEditorImage =
          !this.lexer.state.inLink &&
          !token.raw.includes('\n') &&
          editorImagePattern.test(token.raw) &&
          sizedImagePattern.test(token.raw)
        if (lineBreakPattern.test(token.raw) || isEditorImage) {
          return token
        }

        return { ...token, type: htmlInlineTokenType } as unknown as Tokens.Tag
      }
    }
  })
}

/**
 * A block of raw HTML, kept as the plain source text and written back unchanged.
 */
export const HtmlBlock = Node.create({
  name: 'htmlBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'pre[data-html-block]', preserveWhitespace: 'full' as const }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes(HTMLAttributes, { 'data-html-block': '' }), ['code', 0]]
  },

  addNodeView() {
    return VueNodeViewRenderer(HtmlBlockComponent)
  },

  addKeyboardShortcuts() {
    // Match code block behaviour: on the third Enter at the end of the block,
    // drop the two typed blank lines and move to a regular text block.
    // Shift+Enter exits via the hard break's `exitCode`.
    const exitOnTripleEnter = () => {
      const { empty, $from } = this.editor.state.selection

      if (!empty || $from.parent.type !== this.type) {
        return false
      }

      const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2
      const endsWithDoubleNewline = $from.parent.textContent.endsWith('\n\n')

      if (!isAtEnd || !endsWithDoubleNewline) {
        return false
      }

      return this.editor
        .chain()
        .command(({ tr }) => {
          tr.delete($from.pos - 2, $from.pos)
          return true
        })
        .exitCode()
        .run()
    }

    return { Enter: exitOnTripleEnter }
  },

  markdownTokenName: htmlBlockTokenType,

  parseMarkdown: (token: MarkdownToken) => {
    // marked keeps the line breaks up to the next block in the token
    const text = (token.raw ?? '').replace(/(?:\r?\n)+$/, '')

    return { type: 'htmlBlock', content: text ? [{ type: 'text', text }] : [] }
  },

  renderMarkdown: (node: JSONContent) => {
    return (node.content ?? []).map((child) => child.text ?? '').join('')
  }
})

/**
 * Raw HTML inside a paragraph, e.g. a `<kbd>` tag or a comment. A mark rather than
 * a node, so formatting around it applies to it too and stays in one piece.
 * Code marks are written without escaping, so the source goes back unchanged.
 */
export const HtmlInline = Mark.create({
  name: 'htmlInline',
  code: true,
  inclusive: false,

  parseHTML() {
    return [{ tag: 'span[data-html-inline]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-html-inline': '',
        class: 'text-editor-html-inline font-mono'
      }),
      0
    ]
  },

  markdownTokenName: htmlInlineTokenType,

  parseMarkdown: (token: MarkdownToken, helpers) => {
    return helpers.applyMark('htmlInline', [{ type: 'text', text: token.raw ?? '' }])
  },

  renderMarkdown: (node: JSONContent, helpers) => {
    return helpers.renderChildren(node)
  }
})
