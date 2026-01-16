<template>
  <div class="mail-body-editor-toolbar-shell">
    <div class="mail-body-editor-toolbar">
      <div class="mail-body-editor-toolbar-group">
        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('bold')
          }"
          @click.stop="toggleBold"
        >
          <oc-icon
            name="bold"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>

        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('italic')
          }"
          @click.stop="toggleItalic"
        >
          <oc-icon
            name="italic"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>

        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('underline')
          }"
          @click.stop="toggleUnderline"
        >
          <oc-icon
            name="underline"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>
      </div>

      <div class="mail-body-editor-toolbar-group">
        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('bulletList')
          }"
          @click.stop="toggleBulletList"
        >
          <oc-icon
            name="list-unordered"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>

        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('orderedList')
          }"
          @click.stop="toggleOrderedList"
        >
          <oc-icon
            name="list-ordered-2"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>
      </div>

      <div class="mail-body-editor-toolbar-group">
        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('link')
          }"
          @click.stop="emitOpenLinkModal"
        >
          <oc-icon
            name="link"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>

        <oc-button
          type="button"
          appearance="raw"
          class="mail-body-editor-toolbar-btn"
          :class="{
            'mail-body-editor-toolbar-btn--active': toolbarProps.editor?.isActive('blockquote')
          }"
          @click.stop="toggleBlockquote"
        >
          <oc-icon
            name="chat-quote-line"
            fill-type="none"
            class="mail-body-editor-toolbar-icon text-role-on-surface"
          />
        </oc-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const toolbarProps = defineProps<{
  editor: Editor | null
}>()

const emit = defineEmits<{
  (e: 'open-link-modal'): void
}>()

const toggleBold = () => {
  if (!toolbarProps.editor) return
  toolbarProps.editor.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  if (!toolbarProps.editor) return
  toolbarProps.editor.chain().focus().toggleItalic().run()
}

const toggleUnderline = () => {
  if (!toolbarProps.editor) return
  toolbarProps.editor.chain().focus().toggleUnderline().run()
}

const toggleBulletList = () => {
  if (!toolbarProps.editor) return
  toolbarProps.editor.chain().focus().toggleBulletList().run()
}

const toggleOrderedList = () => {
  if (!toolbarProps.editor) return
  toolbarProps.editor.chain().focus().toggleOrderedList().run()
}

const toggleBlockquote = () => {
  if (!toolbarProps.editor) return
  toolbarProps.editor.chain().focus().toggleBlockquote().run()
}

const emitOpenLinkModal = () => {
  emit('open-link-modal')
}
</script>
