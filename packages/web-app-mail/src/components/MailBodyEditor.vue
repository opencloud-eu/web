<template>
  <div class="mail-body-editor flex flex-col gap-2 h-full">
    <div class="mail-body-editor-editor-wrapper flex-1" @click="onWrapperClick">
      <EditorContent v-if="editor" :editor="editor" class="mail-body-editor-editor" />
    </div>

    <MailComposeFormattingToolbar
      v-if="showToolbar"
      :editor="editor"
      @open-link-modal="openLinkModal"
    />

    <oc-modal
      v-if="showLinkModal"
      :title="$gettext('Add link')"
      :hide-actions="true"
      element-class="mail-body-editor-link-modal"
    >
      <template #content>
        <div class="p-4 flex flex-col gap-4">
          <oc-text-input v-model="linkInput" :label="$gettext('URL')" type="text" class="w-full" />
          <div class="flex justify-end gap-2">
            <oc-button appearance="raw" @click="cancelLink">
              <span v-text="$gettext('Cancel')" />
            </oc-button>
            <oc-button appearance="filled" @click="applyLink">
              <span v-text="$gettext('Apply')" />
            </oc-button>
          </div>
        </div>
      </template>
    </oc-modal>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import MailComposeFormattingToolbar from './MailComposeFormattingToolbar.vue'

const { $gettext } = useGettext()

const props = defineProps<{
  modelValue: string
  showToolbar?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showLinkModal = ref(false)
const linkInput = ref('')
const linkSelection = ref<{ from: number; to: number } | null>(null)

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      link: false
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true
    }),
    Image.configure({
      inline: false
    })
  ],
  content: props.modelValue || '',
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  }
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    if (value !== current) {
      editor.value.commands.setContent(value || '', { emitUpdate: false })
    }
  }
)

const onWrapperClick = (event: MouseEvent) => {
  if (!editor.value) return
  const editorDom = editor.value.view.dom as HTMLElement

  if (editorDom.contains(event.target as Node)) {
    return
  }

  editor.value.commands.focus('end')
}

const openLinkModal = () => {
  if (!editor.value) return

  const previousUrl = editor.value.getAttributes('link').href as string | undefined
  linkInput.value = previousUrl ?? ''

  const { from, to } = editor.value.state.selection
  linkSelection.value = { from, to }

  showLinkModal.value = true
}

const cancelLink = () => {
  showLinkModal.value = false
  linkSelection.value = null
}

const applyLink = () => {
  if (!editor.value) return

  const url = linkInput.value.trim()
  const selection = linkSelection.value
  let chain = editor.value.chain()

  if (selection) {
    chain = chain.setTextSelection(selection).focus()
  } else {
    chain = chain.focus()
  }

  if (!url) {
    chain.extendMarkRange('link').unsetLink().run()
    showLinkModal.value = false
    linkSelection.value = null
    return
  }

  if (selection && selection.from !== selection.to) {
    chain.extendMarkRange('link').setLink({ href: url }).run()
  } else {
    chain.insertContent(`<a href="${url}">${url}</a>`).run()
  }

  showLinkModal.value = false
  linkSelection.value = null
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style>
.mail-body-editor {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  height: 100% !important;
  position: relative !important;
}

.mail-body-editor-editor-wrapper {
  border-radius: 8px !important;
  border: none !important;
  background-color: var(--oc-color-role-surface, #ffffff) !important;
  padding: 12px 14px !important;
  cursor: text !important;
  flex: 1 1 auto !important;
  display: flex !important;
  overflow-y: auto !important;
}

.mail-body-editor-editor-wrapper:focus,
.mail-body-editor-editor-wrapper:focus-within {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

.mail-body-editor-editor,
.mail-body-editor .ProseMirror {
  flex: 1 1 auto !important;
  min-height: 128px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  outline: none !important;
  border: none !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
}

.mail-body-editor .ProseMirror a {
  color: var(--oc-color-role-primary) !important;
  text-decoration: underline !important;
  cursor: pointer !important;
}

.mail-body-editor .ProseMirror:focus,
.mail-body-editor .ProseMirror:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.mail-body-editor .ProseMirror p {
  margin: 0 0 8px !important;
}

.mail-body-editor .ProseMirror ul {
  list-style-type: disc !important;
  padding-left: 20px !important;
  margin: 4px 0 8px !important;
}

.mail-body-editor .ProseMirror ol {
  list-style-type: decimal !important;
  padding-left: 20px !important;
  margin: 4px 0 8px !important;
}

.mail-body-editor .ProseMirror li {
  margin: 2px 0 !important;
}

.mail-body-editor .ProseMirror strong {
  font-weight: 600 !important;
}

.mail-body-editor .ProseMirror em {
  font-style: italic !important;
}

.mail-body-editor .ProseMirror u {
  text-decoration: underline !important;
}

.mail-body-editor .ProseMirror blockquote {
  border-left: 2px solid var(--oc-color-role-outline-variant, #94a3b8) !important;
  padding-left: 12px !important;
  margin: 4px 0 8px !important;
  font-style: italic !important;
  opacity: 0.9 !important;
}

.mail-body-editor .ProseMirror pre {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace !important;
  font-size: 14px !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  background: rgba(148, 163, 184, 0.12) !important;
  overflow-x: auto !important;
}

.mail-body-editor .ProseMirror code {
  font-family: inherit !important;
  font-size: 0.875em !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
  background: rgba(148, 163, 184, 0.18) !important;
}

.mail-body-editor-toolbar-shell {
  margin-top: 0px !important;
  display: flex !important;
  justify-content: center !important;
  position: absolute !important;
  bottom: 2px !important;
  transform: translateX(-50%) !important;
  left: 50% !important;
  z-index: 10 !important;
}

.mail-body-editor-toolbar {
  display: inline-flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 9px 14px !important;
  border-radius: 9999px !important;
  background-color: var(--oc-color-role-surface, #ffffff) !important;
  border: 1px solid var(--oc-color-role-outline-variant, #e5e7eb) !important;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08) !important;
}

.mail-body-editor-toolbar-group {
  display: inline-flex !important;
  align-items: stretch !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background-color: var(--oc-color-role-surface-variant, #f3f4f6) !important;
}

.mail-body-editor-toolbar-btn {
  min-width: 42px !important;
  height: 35px !important;
  padding: 0 11px !important;
  border-radius: 0 !important;
  border: none !important;
  background-color: transparent !important;
  color: var(--oc-color-role-on-surface, #111827) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  user-select: none !important;
}

.mail-body-editor-toolbar-icon {
  font-size: 17px !important;
}

.mail-body-editor-toolbar-btn:hover {
  background-color: var(--oc-color-role-surface, #ffffff) !important;
}

.mail-body-editor-toolbar-btn--active {
  background-color: var(--oc-color-role-surface, #ffffff) !important;
  font-weight: 600 !important;
}

.mail-body-editor-link-modal {
  max-width: 420px;
}
</style>
