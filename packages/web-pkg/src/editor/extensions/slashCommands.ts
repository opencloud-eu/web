import { Extension as TipTapExtension, Editor } from '@tiptap/core'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import SlashCommandMenu from '../components/SlashCommandMenu.vue'
import { EditorAction, EditorActionGroup } from '../composables'

export type FlatSlashCommandItem = EditorAction & {
  groupId: string
  groupTitle: string
}

export interface SlashCommandsOptions {
  getGroups: () => EditorActionGroup[]
}

export interface SlashCommandMenuHandle {
  onUpdate: (props: SuggestionProps<FlatSlashCommandItem>) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
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

export const SlashCommands = TipTapExtension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      getGroups: () => []
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<FlatSlashCommandItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
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
