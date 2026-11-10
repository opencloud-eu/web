import { Extension as TipTapExtension, Editor } from '@tiptap/core'
import { EditorState, Plugin, PluginKey, Transaction } from '@tiptap/pm/state'
import { isHistoryTransaction } from '@tiptap/pm/history'
import { ySyncPluginKey } from '@tiptap/y-tiptap'
import Suggestion, {
  SuggestionProps,
  SuggestionKeyDownProps,
  SuggestionPluginKey
} from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import SlashCommandMenu from '../components/SlashCommandMenu.vue'
import { EditorAction, EditorActionGroup } from '../composables'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    slashCommands: {
      /**
       * Open the slash menu for the block at `pos` (or at the selection) by inserting a "/".
       * The "/" gets removed again if the menu is dismissed without running a command.
       */
      openSlashCommandMenu: (pos?: number | null) => ReturnType
    }
  }
}

interface SlashMenuTrigger {
  // the "/" lives in a paragraph inserted just for it
  removeBlock: boolean
}

const slashMenuTriggerKey = new PluginKey<SlashMenuTrigger | null>('slashMenuTrigger')
const triggerChar = '/'

export type FlatSlashCommandItem = EditorAction & {
  groupId: string
  groupTitle: string
}

export interface SlashCommandsOptions {
  getGroups: () => EditorActionGroup[]
}

export interface SlashCommandMenuHandle {
  onUpdate: (props: SuggestionProps<FlatSlashCommandItem>) => void
  onKeyDown: (event: KeyboardEvent) => boolean
}

export function filterSlashCommandItems(
  groups: EditorActionGroup[],
  query: string,
  editor: Editor
): FlatSlashCommandItem[] {
  const normalized = query.trim().toLowerCase()
  const flat: FlatSlashCommandItem[] = []

  for (const group of groups) {
    for (const item of group.actions) {
      if (item.showInSlashCommands === false || (item.isEnabled && !item.isEnabled(editor))) {
        continue
      }
      if (!normalized) {
        flat.push({ ...item, groupId: group.id, groupTitle: group.title })
        continue
      }
      const haystack = [item.title, item.description ?? '', ...(item.keywords ?? [])]
        .join(' ')
        .toLowerCase()
      if (haystack.includes(normalized)) {
        flat.push({ ...item, groupId: group.id, groupTitle: group.title })
      }
    }
  }
  return flat
}

function isUndoRedo(tr: Transaction): boolean {
  return isHistoryTransaction(tr) || !!tr.getMeta(ySyncPluginKey)?.isUndoRedoOperation
}

function removeDismissedTrigger(
  transactions: readonly Transaction[],
  oldState: EditorState,
  newState: EditorState
): Transaction | null {
  const trigger = slashMenuTriggerKey.getState(newState)
  if (!trigger) {
    return null
  }
  // undo/redo already removed the "/" and may move the suggestion onto the user's own text
  if (transactions.some(isUndoRedo)) {
    return newState.tr.setMeta(slashMenuTriggerKey, null)
  }

  // The trigger is cleared as soon as the suggestion leaves it, so while it is pending the
  // previous suggestion is the trigger's. Positions aren't tracked, since collaborative sync
  // replaces the whole doc and breaks position mapping.
  const previous = SuggestionPluginKey.getState(oldState)
  const next = SuggestionPluginKey.getState(newState)
  const docChanged = transactions.some((t) => t.docChanged)
  const jumpedAway = !docChanged && next?.range.from !== previous?.range.from
  if (next?.active && !jumpedAway) {
    return null
  }

  const tr = newState.tr.setMeta(slashMenuTriggerKey, null)
  // a doc change means a command ran or the user kept typing, both keep the text
  if (!previous?.active || docChanged) {
    return tr
  }

  // undo must not bring back the "/" without its menu
  tr.setMeta('addToHistory', false)
  if (!next?.active) {
    // keep the caret from reopening the menu on a slash in the neighbouring block
    tr.setMeta(SuggestionPluginKey, { exit: true })
  }

  const { from, to } = previous.range
  const $from = newState.doc.resolve(from)
  if (trigger.removeBlock && $from.parent.content.size === to - from) {
    return tr.delete($from.before(), $from.after())
  }
  return tr.delete(from, to)
}

export const SlashCommands = TipTapExtension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      getGroups: () => []
    }
  },

  addCommands() {
    return {
      openSlashCommandMenu:
        (pos = null) =>
        ({ state, tr, chain }) => {
          // a second click on "+" closes the menu, the cleanup removes its "/"
          if (slashMenuTriggerKey.getState(state)) {
            tr.setMeta(SuggestionPluginKey, { exit: true })
            return true
          }

          let command = chain().focus()
          let removeBlock = false

          if (pos !== null) {
            const node = state.doc.nodeAt(pos)
            if (!node) {
              return false
            }

            if (node.isTextblock && node.content.size === 0) {
              command = command.setTextSelection(pos + 1)
            } else {
              const afterPos = pos + node.nodeSize
              command = command
                .insertContentAt(afterPos, { type: 'paragraph' })
                .setTextSelection(afterPos + 1)
              removeBlock = true
            }
          }

          return command
            .insertContent(triggerChar)
            .setMeta(slashMenuTriggerKey, { removeBlock } satisfies SlashMenuTrigger)
            .run()
        }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SlashMenuTrigger | null>({
        key: slashMenuTriggerKey,
        state: {
          init: () => null,
          apply: (tr, value) => {
            const meta = tr.getMeta(slashMenuTriggerKey)
            return meta === undefined ? value : meta
          }
        },
        appendTransaction: removeDismissedTrigger
      }),
      Suggestion<FlatSlashCommandItem>({
        editor: this.editor,
        char: triggerChar,
        startOfLine: false,
        shouldShow: ({ editor, transaction }) =>
          transaction.docChanged ||
          transaction.selectionSet ||
          SuggestionPluginKey.getState(editor.state)?.active === true,
        shouldResetDismissed: ({ transaction }) => transaction.selectionSet,
        decorationTag: 'span',
        decorationClass: 'text-editor-slash-filter',
        decorationContent: 'Filter...',
        decorationEmptyClass: 'text-editor-slash-filter--empty',
        items: ({ query, editor }) => {
          return filterSlashCommandItems(this.options.getGroups(), query, editor)
        },
        command: ({ editor, range, props }) => {
          props.slashCommandAction({ editor, range })
        },
        render: () => {
          let renderer: VueRenderer | null = null

          const getHandle = (): SlashCommandMenuHandle | null =>
            (renderer?.ref as SlashCommandMenuHandle | undefined) ?? null

          return {
            onStart: (props) => {
              renderer = new VueRenderer(SlashCommandMenu, {
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
