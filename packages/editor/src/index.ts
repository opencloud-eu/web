export type {
  ContentType,
  TextEditorOptions,
  TextEditorInstance,
  SlashCommandItem,
  SlashCommandGroup
} from './types'
export type { ToolbarItem, ToolbarGroup } from './actions/toolbar/types'
export { useTextEditor } from './composables/useTextEditor'
export { default as TextEditorProvider } from './components/TextEditorProvider.vue'
export { default as TextEditorContent } from './components/TextEditorContent.vue'
export { default as TextEditorToolbar } from './components/TextEditorToolbar.vue'
export { richTextSlashCommandGroups } from './actions/slashCommands/items'
