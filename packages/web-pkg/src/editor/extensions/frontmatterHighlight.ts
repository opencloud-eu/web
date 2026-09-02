import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { lowlight } from './lowlight'

export const frontmatterHighlightKey = new PluginKey<DecorationSet>('frontmatterHighlight')

/**
 * Frontmatter delimited by `---` is yaml by universal convention, so there is
 * nothing to detect. Toml (`+++`) and json (`{}`) frontmatter never reach this
 * node, the tokenizer only matches `---`.
 */
const frontmatterLanguage = 'yaml'

/** A node of the hast tree lowlight returns. */
type HighlightNode = ReturnType<typeof lowlight.highlight>['children'][number]

type HighlightRun = { text: string; classes: string[] }

function classNamesOf(node: Extract<HighlightNode, { type: 'element' }>): string[] {
  const className = node.properties?.className

  return Array.isArray(className) ? className.map(String) : []
}

/** Flatten the highlight tree into the runs of text that share a class list. */
function toRuns(nodes: readonly HighlightNode[], inherited: string[] = []): HighlightRun[] {
  return nodes.flatMap((node) => {
    if (node.type === 'element') {
      return toRuns(node.children, [...inherited, ...classNamesOf(node)])
    }

    return node.type === 'text' ? [{ text: node.value, classes: inherited }] : []
  })
}

function buildDecorations(doc: ProseMirrorNode, nodeName: string): DecorationSet {
  const block = doc.firstChild

  if (block?.type.name !== nodeName) {
    return DecorationSet.empty
  }

  const decorations: Decoration[] = []
  // The block is always the document's first child, so its text starts at 1.
  let from = 1

  // `highlight` never throws on malformed input, it falls back to best effort
  // tokens. Metadata is invalid yaml on most keystrokes, so that matters.
  for (const run of toRuns(lowlight.highlight(frontmatterLanguage, block.textContent).children)) {
    const to = from + run.text.length

    if (run.classes.length) {
      decorations.push(Decoration.inline(from, to, { class: run.classes.join(' ') }))
    }

    from = to
  }

  return DecorationSet.create(doc, decorations)
}

/**
 * Renders the frontmatter block as highlighted yaml.
 *
 * The decorations are rebuilt on every document change rather than only when
 * the block itself changed: there is at most one block holding a few hundred
 * characters, which is far cheaper than the bookkeeping needed to tell whether
 * it was the part that changed.
 */
export function frontmatterHighlightPlugin(nodeName: string): Plugin {
  return new Plugin({
    key: frontmatterHighlightKey,
    state: {
      init: (_, state) => buildDecorations(state.doc, nodeName),
      apply: (transaction, decorations) => {
        return transaction.docChanged
          ? buildDecorations(transaction.doc, nodeName)
          : decorations.map(transaction.mapping, transaction.doc)
      }
    },
    props: {
      decorations(state) {
        return frontmatterHighlightKey.getState(state)
      }
    }
  })
}
