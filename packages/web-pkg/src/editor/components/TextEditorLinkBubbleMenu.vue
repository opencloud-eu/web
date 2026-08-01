<template>
  <BubbleMenu
    v-if="textEditor.editor.value"
    :editor="textEditor.editor.value"
    :should-show="shouldShow"
    :update-delay="0"
    class="text-editor-link-bubble-menu"
  >
    <div
      class="flex items-center gap-1 rounded-md border border-role-border bg-role-surface p-1 shadow-lg"
    >
      <oc-button
        v-oc-tooltip="$gettext('Edit Link')"
        type="button"
        appearance="raw"
        gap-size="small"
        class="text-editor-bubble-menu-btn h-8 shrink-0 justify-center px-2 py-0"
        :aria-label="$gettext('Edit Link')"
        @mousedown.prevent
        @click="editLink"
      >
        <oc-icon name="edit-2" fill-type="line" size="small" />
        <span>{{ $gettext('Edit Link') }}</span>
      </oc-button>

      <div class="h-5 w-px bg-role-outline-variant" />

      <oc-button
        v-oc-tooltip="$gettext('Open link in a new tab')"
        type="button"
        appearance="raw"
        class="text-editor-bubble-menu-btn h-8 w-8 shrink-0 justify-center p-0"
        :aria-label="$gettext('Open link in a new tab')"
        :disabled="!linkHref"
        @mousedown.prevent
        @click="openLink"
      >
        <oc-icon name="external-link" fill-type="line" size="small" />
      </oc-button>

      <div class="h-5 w-px bg-role-outline-variant" />

      <oc-button
        v-oc-tooltip="$gettext('Unlink')"
        type="button"
        appearance="raw"
        class="text-editor-bubble-menu-btn h-8 w-8 shrink-0 justify-center p-0"
        :aria-label="$gettext('Unlink')"
        @mousedown.prevent
        @click="removeLink"
      >
        <oc-icon name="link-unlink" size="small" fill-type="none" />
      </oc-button>
    </div>
  </BubbleMenu>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor } from '@tiptap/core'
import { useGettext } from 'vue3-gettext'
import { OcButton, OcIcon } from '@opencloud-eu/design-system/components'
import type { TextEditorInstance } from '../types'
import { normalizeLinkUrl } from '../extensions'
import { requestLinkPanel } from '../helpers/link'

const textEditor = inject<TextEditorInstance>('textEditor')!
const { $gettext } = useGettext()

const shouldShow = ({ editor }: { editor: Editor }) => {
  return editor.isActive('link')
}

const linkHref = computed(() => {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return ''
  }

  const { href } = editor.getAttributes('link')
  return normalizeLinkUrl(href || '')
})

function editLink() {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return
  }

  requestLinkPanel(editor, textEditor.state)
}

function openLink() {
  const href = unref(linkHref)
  if (!href) {
    return
  }

  window.open(href, '_blank', 'noopener,noreferrer')
}

function removeLink() {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return
  }

  editor.chain().focus().extendMarkRange('link').unsetLink().run()
}
</script>
