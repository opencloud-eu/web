import { Extension as TipTapExtension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { escapeRegExp } from 'lodash-es'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import MentionMenu from '../components/MentionMenu.vue'
import type { MentionItem, TextEditorMentionsOptions } from '../types'
import { MentionSuggestionPluginKey } from './mentionSuggestionKey'

export { MentionSuggestionPluginKey } from './mentionSuggestionKey'

export const MentionHighlightPluginKey = new PluginKey<DecorationSet>('mentionHighlight')

export const mentionHighlightClass = 'text-editor-mention'

export interface MentionMenuHandle {
  onUpdate: (props: SuggestionProps<MentionItem>) => void
  onKeyDown: (event: KeyboardEvent) => boolean
}

function mentionDecorations(doc: Node, labels: string[]): DecorationSet {
  if (!labels.length) {
    return DecorationSet.empty
  }

  const mentionPattern = new RegExp(
    // a mention ends at a blank, a punctuation character or the end of the text
    `@(?:${labels.map(escapeRegExp).join('|')})(?![^\\s.,!?;:)}\\]])`,
    'g'
  )
  const decorations: Decoration[] = []

  doc.descendants((node, position) => {
    if (!node.isText || !node.text) {
      return
    }

    for (const { 0: mention, index } of node.text.matchAll(mentionPattern)) {
      const previousCharacter = node.text[index - 1]

      // just like the suggestion itself, a mention starts at the beginning or after a blank
      if (previousCharacter && !/\s/.test(previousCharacter)) {
        continue
      }

      decorations.push(
        Decoration.inline(position + index, position + index + mention.length, {
          class: mentionHighlightClass
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

// Mentions remain plain text when serialized. Rebuild their decorations from the users that can
// be mentioned, so highlights also survive content reloads and undo/redo.
function createMentionHighlightPlugin(items: TextEditorMentionsOptions['items']) {
  // longest label first, so that `@Alice Smith` wins over `@Alice`
  let labels: string[] = []
  function setLabels(nextLabels: string[]): void {
    labels = [...new Set(nextLabels)].sort((a, b) => b.length - a.length)
  }

  const plugin = new Plugin<DecorationSet>({
    key: MentionHighlightPluginKey,
    state: {
      init: () => DecorationSet.empty,
      apply: (transaction, decorations) => {
        if (!transaction.docChanged && !transaction.getMeta(MentionHighlightPluginKey)) {
          return decorations
        }

        return mentionDecorations(transaction.doc, labels)
      }
    },
    props: {
      decorations: (state) => MentionHighlightPluginKey.getState(state)
    },
    view: (view) => {
      let destroyed = false

      Promise.resolve(items(''))
        .then((mentionItems) => {
          if (destroyed) {
            return
          }

          setLabels([...labels, ...mentionItems.map(({ label }) => label)])
          view.dispatch(view.state.tr.setMeta(MentionHighlightPluginKey, true))
        })
        .catch((error) => console.error('Error loading users for mention highlights', error))

      return {
        destroy: () => {
          destroyed = true
        }
      }
    }
  })

  return { plugin, addLabel: (label: string) => setLabels([...labels, label]) }
}

export const Mentions = TipTapExtension.create<TextEditorMentionsOptions>({
  name: 'mentions',

  addOptions() {
    return {
      items: () => [],
      onSelect: () => undefined
    }
  },

  addProseMirrorPlugins() {
    const { plugin: mentionHighlightPlugin, addLabel } = createMentionHighlightPlugin(
      this.options.items
    )

    return [
      mentionHighlightPlugin,
      Suggestion<MentionItem, MentionItem>({
        editor: this.editor,
        pluginKey: MentionSuggestionPluginKey,
        char: '@',
        allowedPrefixes: [' '],
        startOfLine: false,
        shouldShow: ({ editor, transaction }) =>
          transaction.docChanged ||
          transaction.selectionSet ||
          MentionSuggestionPluginKey.getState(editor.state)?.active === true,
        shouldResetDismissed: ({ transaction }) => transaction.selectionSet,
        items: ({ query }) => this.options.items(query),
        command: ({ editor, range, props }) => {
          addLabel(props.label)
          const inserted = editor
            .chain()
            .focus()
            .insertContentAt(range, { type: 'text', text: `@${props.label} ` })
            .run()

          if (inserted) {
            this.options.onSelect(props)
          }
        },
        render: () => {
          let renderer: VueRenderer | null = null

          function getHandle(): MentionMenuHandle | null {
            return (renderer?.ref as MentionMenuHandle | undefined) ?? null
          }

          return {
            onStart: (props) => {
              renderer = new VueRenderer(MentionMenu, {
                props,
                editor: props.editor
              })
              if (renderer.el) {
                document.body.appendChild(renderer.el)
              }
            },
            onUpdate: (props) => {
              renderer?.updateProps(props)
              getHandle()?.onUpdate(props)
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              return getHandle()?.onKeyDown(props.event) ?? false
            },
            onExit: () => {
              renderer?.el?.remove()
              renderer?.destroy()
              renderer = null
            }
          }
        }
      })
    ]
  }
})
