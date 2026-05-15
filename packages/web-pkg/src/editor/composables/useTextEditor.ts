import { ref, computed, onBeforeUnmount, watch, unref, onMounted, triggerRef } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import { Placeholder } from '@tiptap/extension-placeholder'
import type { ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { HocuspocusProvider } from '@hocuspocus/provider'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
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
  const collaboration = options.collaboration

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // Set when Hocuspocus rejects the token. Once true the editor stops
  // suppressing AppWrapper's autosave path so the user's edits still get
  // persisted via the single-user WebDAV PUT route as a safety net.
  const collabFailed = ref(false)

  const provider = collaboration
    ? new HocuspocusProvider({
        url: collaboration.wsUrl,
        name: collaboration.room,
        token: collaboration.token,
        onAuthenticationFailed: ({ reason }) => {
          console.error(
            '[useTextEditor] hocuspocus authentication failed; falling back to single-user autosave',
            reason
          )
          collabFailed.value = true
          // Immediately push the current editor state to AppWrapper so the
          // dirty state engages now — don't wait for the next keystroke.
          if (options.onUpdate && editor.value) {
            options.onUpdate(strategy.serialize(editor.value))
          }
        },
        onStateless: ({ payload }) => collaboration.onStateless?.(payload)
      })
    : null

  const extensions = strategy.extensions({ collaboration: !!collaboration })
  if (options.slashCommands !== false) {
    const resolvedGroups = strategy.editorActionGroups()
    if (resolvedGroups.length > 0) {
      extensions.push(
        SlashCommands.configure({ getGroups: () => resolvedGroups }) as (typeof extensions)[number]
      )
    }
  }
  if (provider && collaboration) {
    extensions.push(
      Collaboration.configure({
        document: provider.document,
        field: 'default'
      }) as (typeof extensions)[number],
      CollaborationCaret.configure({
        provider,
        user: collaboration.user
      }) as (typeof extensions)[number]
    )
  }

  if (options.placeholder) {
    extensions.push(
      Placeholder.configure({ placeholder: options.placeholder }) as (typeof extensions)[number]
    )
  }

  // useEditor returns ShallowRef<Editor | undefined>; we cast to ShallowRef<Editor | null>
  // to satisfy TextEditorInstance. The destroy() method sets it to null explicitly.
  const editorOptions: Record<string, any> = {
    extensions,
    // In collaboration mode the Y.Doc is the source of truth; seeding here would
    // duplicate the document body for every joining client.
    content: collaboration
      ? null
      : unref(options.modelValue)
        ? strategy.deserialize(unref(options.modelValue))
        : '',
    editable: !readonly.value
  }

  if (!collaboration) {
    watch(options.modelValue, (content) => {
      if (!unref(editor) || unref(editor)?.isFocused) {
        return
      }
      setContent(content)
    })
  }

  if (strategy.editorContentType) {
    editorOptions.contentType = strategy.editorContentType()
  }

  if (options.placeholder) {
    editorOptions.editorProps = {
      attributes: {
        'aria-placeholder': options.placeholder,
        'aria-multiline': 'true'
      }
    }
  }

  const editor = useEditor({
    ...editorOptions,
    onUpdate({ editor: e }) {
      // In collaboration mode the hocuspocus server is the writer of record,
      // so we suppress the AppWrapper autosave path — UNLESS authentication
      // failed, in which case we re-engage it as a safety net against
      // dataloss.
      if (!options.onUpdate || (collaboration && !collabFailed.value)) {
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
    editor.value?.commands.focus('start')
  }

  const blur = (): void => {
    editor.value?.commands.blur()
  }

  const destroy = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      if (options.onUpdate && editor.value && (!collaboration || collabFailed.value)) {
        options.onUpdate(strategy.serialize(editor.value))
      }
      debounceTimer = null
    }
    editor.value?.destroy()
    editor.value = null
    provider?.destroy()
  }

  const triggerEditorUpdate = () => triggerRef(editor)

  onMounted(() => {
    editor.value?.on('selectionUpdate', triggerEditorUpdate)
    editor.value?.on('transaction', triggerEditorUpdate)
    if (!unref(readonly)) {
      focus()
    }
  })

  onBeforeUnmount(() => {
    editor.value?.off('selectionUpdate', triggerEditorUpdate)
    editor.value?.off('transaction', triggerEditorUpdate)
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
