<template>
  <text-editor-content :editor="editor" class="announcement-modal" />
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import type { Modal } from '@opencloud-eu/web-pkg'
import { useTextEditor, TextEditorContent } from '@opencloud-eu/web-pkg/editor'
import { useGettext } from 'vue3-gettext'

const { infoText = '' } = defineProps<{ modal: Modal; infoText?: string }>()

const { $gettext } = useGettext()

const editor = useTextEditor({
  contentType: 'markdown',
  modelValue: toRef(() => infoText),
  ariaLabel: $gettext('Announcement details'),
  readonly: true
})
</script>
