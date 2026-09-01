import { commands as coreCommands, Node, mergeAttributes } from '@tiptap/core'
import type { CommandProps, JSONContent, MarkdownToken } from '@tiptap/core'
import type { marked } from 'marked'
import { TextSelection } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FrontmatterComponent from '../components/FrontmatterComponent.vue'
import { frontmatterHighlightPlugin } from './frontmatterHighlight'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    frontmatter: {
      /** Add an empty frontmatter block at the top of the document. */
      setFrontmatter: () => ReturnType
      /** Drop the fences, keeping the metadata as ordinary content. */
      unsetFrontmatter: () => ReturnType
    }
  }
}

/**
 * Matches a frontmatter block: `---`, the raw metadata, and a closing `---`.
 * The metadata is captured verbatim, we never interpret it as YAML.
 */
const frontmatterPattern = /^---[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?---[ \t]*(?:\r?\n|$)/

/**
 * Registers the frontmatter tokenizer on a marked instance.
 *
 * Registered with marked directly rather than through the node's
 * `markdownTokenizer` hook, because that hook drops the lexer before calling us
 * and the lexer carries the one signal that matters here.
 *
 * Marked lexes the inside of a blockquote with a fresh token array, so "nothing
 * tokenized yet" is true in there too. A frontmatter node inside a container is
 * invalid under the document schema, and since `Node.fromJSON` does not
 * validate, it survives until a path that does (the DOM parser, y-prosemirror)
 * prunes it, taking the surrounding content with it.
 *
 * Only the top level pass is handed the lexer's own token list, so comparing the
 * two tells us where we are. `state.top` looks like the right flag but is not:
 * marked sets it to true for blockquote contents as well.
 *
 * Takes the instance as an argument instead of reaching for marked's singleton:
 * every `MarkdownManager` appends its tokenizers to whichever instance it is
 * given and never removes them, so the singleton would grow for as long as the
 * tab is open and hold on to every manager it ever saw.
 */
export function registerFrontmatterTokenizer(instance: typeof marked): void {
  instance.use({
    extensions: [
      {
        name: 'frontmatter',
        level: 'block',
        start: (src: string) => (src.startsWith('---') ? 0 : -1),
        tokenizer(src, tokens) {
          // Frontmatter opens the document, nothing else.
          if (tokens !== this.lexer.tokens || tokens.length) {
            return undefined
          }

          const match = frontmatterPattern.exec(src)
          if (!match) {
            return undefined
          }

          return { type: 'frontmatter', raw: match[0], text: match[1], tokens: [] }
        }
      }
    ]
  })
}

/**
 * Frontmatter is metadata, not prose. Marked has no rule for it, so without
 * this node the opening `---` lexes as a thematic break and the metadata turns
 * into paragraphs and headings, which destroys it on the next save.
 *
 * The node keeps the metadata as plain, unformatted text and hands it back
 * between its fences untouched. It behaves like a code block: editable, but
 * nothing the editor does to it can change more than the characters the user
 * typed.
 */
export const Frontmatter = Node.create({
  name: 'frontmatter',
  // Deliberately not in the `block` group: the document content expression names
  // this type explicitly in its single leading slot, so staying out of `block`
  // is what makes a second block anywhere else impossible.
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'pre[data-frontmatter]', preserveWhitespace: 'full' as const }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes(HTMLAttributes, { 'data-frontmatter': '' }), ['code', 0]]
  },

  addNodeView() {
    return VueNodeViewRenderer(FrontmatterComponent)
  },

  addProseMirrorPlugins() {
    return [frontmatterHighlightPlugin(this.name)]
  },

  addCommands() {
    // Toolbar and slash entries are gated by the strategy, but extensions bind
    // their shortcuts straight into ProseMirror keymaps, so those keys stay live
    // and would turn the metadata into a heading or a list. Every block
    // conversion funnels through these few primitives, so guarding them covers
    // all of the shortcuts at once, including extensions added later.
    const refuseInside = <Args extends unknown[]>(
      command: (...args: Args) => (props: CommandProps) => boolean
    ) => {
      return (...args: Args) =>
        (props: CommandProps): boolean => {
          if (props.editor.isActive(this.name)) {
            return false
          }

          return command(...args)(props)
        }
    }

    return {
      setNode: refuseInside(coreCommands.setNode),
      toggleNode: refuseInside(coreCommands.toggleNode),
      toggleList: refuseInside(coreCommands.toggleList),
      wrapIn: refuseInside(coreCommands.wrapIn),
      toggleWrap: refuseInside(coreCommands.toggleWrap),

      setFrontmatter:
        () =>
        ({ state, tr, dispatch }) => {
          // The schema has room for exactly one block, at the top, so bail out
          // cleanly and let `can()` report the toggle state.
          if (state.doc.firstChild?.type === this.type) {
            return false
          }

          if (dispatch) {
            tr.insert(0, this.type.create())
            tr.setSelection(TextSelection.create(tr.doc, 1)).scrollIntoView()
          }

          return true
        },

      unsetFrontmatter:
        () =>
        ({ state, tr, dispatch }) => {
          const firstChild = state.doc.firstChild

          if (firstChild?.type !== this.type) {
            return false
          }

          if (dispatch) {
            // Drop the fences and keep the metadata as content. Without them it
            // is ordinary markdown, so hand it back through the parser: what the
            // editor shows now is what a reload would show.
            const parsed = this.editor.markdown.parse(firstChild.textContent)
            const content = (parsed.content ?? []).map((node) => state.schema.nodeFromJSON(node))

            tr.replaceWith(
              0,
              firstChild.nodeSize,
              // An empty block carries nothing to unwrap, but the document still
              // needs a block to be valid when it held nothing else.
              content.length || state.doc.childCount > 1
                ? content
                : state.schema.nodes.paragraph.create()
            )
          }

          return true
        }
    }
  },

  addKeyboardShortcuts() {
    // The fences cannot be dissolved into prose, so this boundary can never be
    // joined. Leaving the keys unhandled hands them to the browser, which
    // deletes across the node view natively and takes the whole block with it.
    // Handling them moves the caret across the boundary instead.
    const frontmatterEndPos = (): number | null => {
      const firstChild = this.editor.state.doc.firstChild

      return firstChild?.type === this.type ? firstChild.nodeSize - 1 : null
    }

    const moveCaretTo = (pos: number) => {
      return this.editor.commands.setTextSelection(pos)
    }

    const stepBackIntoFrontmatter = () => {
      const end = frontmatterEndPos()
      const { empty, $from } = this.editor.state.selection

      if (end === null || !empty || $from.depth !== 1 || $from.parentOffset !== 0) {
        return false
      }

      // Anything nested (a list item, a table cell) still has its own block to
      // collapse first, so only a top level block sits right at the boundary.
      return $from.before(1) === end + 1 && moveCaretTo(end)
    }

    // A gap cursor in front of the block is the one spot where deleting forward
    // would select the whole node instead of a character, so step inside.
    const stepIntoFrontmatterStart = () => {
      const { empty, $from } = this.editor.state.selection

      if (!empty || $from.pos !== 0 || this.editor.state.doc.firstChild?.type !== this.type) {
        return false
      }

      return moveCaretTo(1)
    }

    const stepForwardIntoBody = () => {
      const end = frontmatterEndPos()
      const { empty, $from } = this.editor.state.selection

      if (end === null || !empty || $from.pos !== end) {
        return false
      }

      const startOfBody = end + 2

      return startOfBody <= this.editor.state.doc.content.size && moveCaretTo(startOfBody)
    }

    const stepForwardAcrossBoundary = () => {
      return stepIntoFrontmatterStart() || stepForwardIntoBody()
    }

    return {
      Backspace: stepBackIntoFrontmatter,
      'Mod-Backspace': stepBackIntoFrontmatter,
      Delete: stepForwardAcrossBoundary,
      'Mod-Delete': stepForwardAcrossBoundary
    }
  },

  parseMarkdown: (token: MarkdownToken) => {
    const text = (token as { text?: string }).text ?? ''

    return { type: 'frontmatter', content: text ? [{ type: 'text', text }] : [] }
  },

  renderMarkdown: (node: JSONContent) => {
    const text = (node.content ?? []).map((child) => child.text ?? '').join('')
    // The markdown manager adds the block separator itself, adding trailing
    // newlines here would grow a run of blank lines on every save.
    return text ? `---\n${text}\n---` : '---\n---'
  }
})
