import { ref, computed, onBeforeUnmount, watch, unref } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import type { ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { TextEditorOptions, TextEditorInstance, TextEditorState } from '../types'
import { SlashCommands } from '../extensions'
import { useContentStrategy } from './useContentStrategy'

export function useTextEditor(options: TextEditorOptions): TextEditorInstance {
  const { resolveStrategy } = useContentStrategy()
  const state: TextEditorState = {
    sourceMode: ref(false)
  }

  const contentType = ref(options.contentType)
  const readonly = ref(options.readonly ?? false)
  const strategy = resolveStrategy(options.contentType, state)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const extensions = strategy.extensions()
  if (options.slashCommands !== false) {
    const resolvedGroups = strategy.editorActionGroups()
    if (resolvedGroups.length > 0) {
      extensions.push(
        SlashCommands.configure({ getGroups: () => resolvedGroups }) as (typeof extensions)[number]
      )
    }
  }

  // useEditor returns ShallowRef<Editor | undefined>; we cast to ShallowRef<Editor | null>
  // to satisfy TextEditorInstance. The destroy() method sets it to null explicitly.
  const editorOptions: Record<string, any> = {
    extensions,
    content: unref(options.modelValue) ? strategy.deserialize(unref(options.modelValue)) : '',
    editable: !readonly.value
  }

  watch(options.modelValue, (content) => {
    setContent(content)
  })

  if (strategy.editorContentType) {
    editorOptions.contentType = strategy.editorContentType()
  }

  const editor = useEditor({
    ...editorOptions,
    onUpdate({ editor: e }) {
      if (!options.onUpdate) {
        return
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        options.onUpdate!(strategy.serialize(e as unknown as Editor))
      }, 250)
    }
  }) as unknown as ShallowRef<Editor | null>

  watch(readonly, (value) => {
    editor.value?.setEditable(!value)
  })

  const getContent = (): string => {
    if (!editor.value) {
      return ''
    }
    return strategy.serialize(editor.value)
  }

  const setContent = (value: string): void => {
    if (!editor.value) {
      return
    }
    const content = strategy.deserialize(value)
    const setContentOptions: Record<string, any> = { emitUpdate: false }
    if (strategy.editorContentType) {
      setContentOptions.contentType = strategy.editorContentType()
    }
    editor.value.commands.setContent(content, setContentOptions)
  }

  const isEmpty = computed(() => editor.value?.isEmpty ?? true)
  const isFocused = computed(() => editor.value?.isFocused ?? false)

  const focus = (): void => {
    editor.value?.commands.focus('end')
  }

  const blur = (): void => {
    editor.value?.commands.blur()
  }

  const destroy = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      if (options.onUpdate && editor.value) {
        options.onUpdate(strategy.serialize(editor.value))
      }
      debounceTimer = null
    }
    editor.value?.destroy()
    editor.value = null
  }

  onBeforeUnmount(() => {
    destroy()
  })

  return {
    state,
    editor,
    contentType,
    readonly,
    actionGroups: strategy.editorActionGroups,
    getContent,
    isEmpty,
    isFocused,
    focus,
    blur,
    destroy
  }
}
