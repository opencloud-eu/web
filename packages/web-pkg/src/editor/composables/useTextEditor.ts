import { ref, computed, onBeforeUnmount, watch, unref, onMounted, triggerRef } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Collaboration } from '@tiptap/extension-collaboration'
import { yCursorPlugin } from '@tiptap/y-tiptap'
import type { Awareness } from 'y-protocols/awareness'
import type { ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { Resource } from '@opencloud-eu/web-client'
import type {
  TextEditorOptions,
  TextEditorInstance,
  TextEditorLinkPanelRequest,
  TextEditorState
} from '../types'
import type { EditorAction, EditorActionGroup } from './useEditorActions'
import { SlashCommands } from '../extensions'
import { useContentStrategy } from './useContentStrategy'

// Custom Tiptap extension that wires y-tiptap's yCursorPlugin to a given
// Awareness. We bypass `@tiptap/extension-collaboration-cursor` because
// its 3.0.0 release still imports `yCursorPlugin` from the upstream
// `y-prosemirror` package — a different module with a different
// `ySyncPluginKey` than the `@tiptap/y-tiptap` fork that
// `@tiptap/extension-collaboration` uses. Mixing them throws
// "Cannot read properties of undefined (reading 'doc')" on first paint.
// y-tiptap's yCursorPlugin shares ySyncPluginKey with Collaboration so
// the cursor plugin can find the sync state.
function makeCollabCursorExtension(awareness: Awareness): Extension {
  return Extension.create({
    name: 'yCollaborationCursor',
    addProseMirrorPlugins() {
      return [
        yCursorPlugin(awareness, {
          // Emit the same `.collaboration-cursor__caret/__label` DOM the
          // (broken) upstream extension would have, so consumer CSS keeps
          // working unchanged.
          cursorBuilder: (user: { name?: string; color?: string }) => {
            const cursor = document.createElement('span')
            cursor.classList.add('collaboration-cursor__caret')
            cursor.setAttribute('style', `border-color: ${user.color ?? '#ffa500'}`)
            const label = document.createElement('div')
            label.classList.add('collaboration-cursor__label')
            label.setAttribute('style', `background-color: ${user.color ?? '#ffa500'}`)
            label.insertBefore(document.createTextNode(user.name ?? ''), null)
            cursor.insertBefore(label, null)
            return cursor
          }
        })
      ]
    }
  })
}

export function useTextEditor(options: TextEditorOptions): TextEditorInstance {
  const { resolveStrategy } = useContentStrategy()
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100),
    currentResource: options.currentResource ?? ref<Resource | null>(null)
  }

  const contentType = ref(options.contentType)
  const readonly = ref(options.readonly ?? false)
  const strategy = resolveStrategy(options.contentType, state)
  const collabFragment = options.ydocFragment ?? 'default'

  // Filter out excluded actions (by id) from toolbar and slash commands, including
  // nested dropdown children (e.g. exclude 'image-upload' but keep 'image-url').
  const excludeActions = options.excludeActions ?? []
  const filterActions = (actions: EditorAction[]): EditorAction[] =>
    actions
      .filter((action) => !excludeActions.includes(action.id))
      .map((action) =>
        action.childActions
          ? { ...action, childActions: filterActions(action.childActions) }
          : action
      )
  const editorActionGroups = (): EditorActionGroup[] =>
    strategy.editorActionGroups().map((group) => ({
      ...group,
      actions: filterActions(group.actions)
    }))

  // Debounce onUpdate to avoid firing on every keystroke while typing.
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const extensions = strategy.extensions()
  if (options.ydoc) {
    // Bind ProseMirror state to the shared Y.Doc. With Collaboration active,
    // the editor's initial content is read from the Y.Doc (not from the
    // `content` option), so we skip the `content` assignment below. The
    // strategies already disable `StarterKit.undoRedo` so yUndoPlugin can
    // take over without conflict.
    extensions.push(
      Collaboration.configure({
        document: options.ydoc,
        field: collabFragment
      }) as (typeof extensions)[number]
    )
    if (options.awareness) {
      // Render remote peers' carets + labels via y-tiptap's yCursorPlugin.
      // Skipped when only ydoc is provided (local mode, no remote peers).
      extensions.push(makeCollabCursorExtension(options.awareness) as (typeof extensions)[number])
    }
  }
  if (options.slashCommands !== false) {
    const resolvedGroups = editorActionGroups()
    const hasSlashCommandItems = resolvedGroups.some((group) =>
      group.actions.some((action) => action.showInSlashCommands !== false)
    )

    if (hasSlashCommandItems) {
      extensions.push(
        SlashCommands.configure({ getGroups: () => resolvedGroups }) as (typeof extensions)[number]
      )
    }
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
    // In collab mode the wrapper hydrates the Y.Doc — passing `content` here
    // would race against the CRDT and produce duplicated state. Leave the
    // editor blank; Collaboration will paint Y.Doc state into it.
    content: options.ydoc
      ? ''
      : unref(options.modelValue)
        ? strategy.deserialize(unref(options.modelValue))
        : '',
    editable: !readonly.value
  }

  watch(options.modelValue, (content) => {
    if (!unref(editor) || unref(editor)?.isFocused) {
      return
    }
    // In collab mode the Y.Doc is the source of truth — never round-trip
    // `modelValue` back into the editor (would clobber peer edits).
    if (options.ydoc) return
    setContent(content)
  })

  if (strategy.editorContentType) {
    editorOptions.contentType = strategy.editorContentType()
  }

  // the editor is a bare contenteditable div. When it gets an accessible name, also give it a
  // textbox role (+ aria-multiline) so the aria-label is valid and it reads as a multiline text field
  const editorAttributes: Record<string, string> = {}
  if (options.ariaLabel) {
    editorAttributes.role = 'textbox'
    editorAttributes['aria-multiline'] = 'true'
    editorAttributes['aria-label'] = options.ariaLabel
  }
  if (options.placeholder) {
    editorAttributes['aria-placeholder'] = options.placeholder
    editorAttributes['aria-multiline'] = 'true'
  }

  editorOptions.editorProps = {
    attributes: editorAttributes,
    handleDOMEvents: {
      auxclick(view: Editor['view'], event: Event) {
        const target = event.target
        if (!(target instanceof Element)) {
          return false
        }

        const anchor = target.closest<HTMLAnchorElement>('a')
        if (!anchor || !view.dom.contains(anchor)) {
          return false
        }

        if (!view.editable) {
          return false
        }

        event.preventDefault()
        return true
      }
    }
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
        debounceTimer = null
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
      if (options.onUpdate && editor.value) {
        options.onUpdate(strategy.serialize(editor.value))
      }
      debounceTimer = null
    }
    editor.value?.destroy()
    editor.value = null
    state.linkPanel.value = null
  }

  const triggerEditorUpdate = () => triggerRef(editor)

  onMounted(() => {
    editor.value?.on('selectionUpdate', triggerEditorUpdate)
    editor.value?.on('transaction', triggerEditorUpdate)
    // Auto-focus on mount used to live here — moved to the consumer.
    // The composable's job is to build an Editor; deciding when (or
    // whether) to put the cursor in it is UX policy and belongs with the
    // caller. All current consumers either rely on the user clicking in
    // (text-editor) or render read-only previews (app-store description,
    // files list/space headers) and never wanted auto-focus anyway.
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
    actionGroups: editorActionGroups,
    getContent,
    setContent,
    isEmpty,
    isFocused,
    focus,
    blur,
    destroy
  }
}
