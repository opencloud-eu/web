import { Extension as TipTapExtension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import SlashCommandMenu from '../components/SlashCommandMenu.vue'
import type { SlashCommandGroup, SlashCommandItem } from '../types'

export type FlatSlashCommandItem = SlashCommandItem & {
  groupId: string
  groupTitle: string
}

export interface SlashCommandsOptions {
  getGroups: () => SlashCommandGroup[]
}

export interface SlashCommandMenuHandle {
  onUpdate: (props: SuggestionProps<FlatSlashCommandItem>) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

export function filterSlashCommandItems(
  groups: SlashCommandGroup[],
  query: string
): FlatSlashCommandItem[] {
  const normalized = query.trim().toLowerCase()
  const flat: FlatSlashCommandItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
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
        items: ({ query }) => filterSlashCommandItems(this.options.getGroups(), query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
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
            onKeyDown: (props) => {
              return getHandle()?.onKeyDown(props) ?? false
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
