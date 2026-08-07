import { Extension as TipTapExtension } from '@tiptap/core'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import MentionMenu from '../components/MentionMenu.vue'
import type { MentionItem, TextEditorMentionsOptions } from '../types'
import { MentionSuggestionPluginKey } from './mentionSuggestionKey'

export { MentionSuggestionPluginKey } from './mentionSuggestionKey'

export interface MentionMenuHandle {
  onUpdate: (props: SuggestionProps<MentionItem>) => void
  onKeyDown: (event: KeyboardEvent) => boolean
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
    return [
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
