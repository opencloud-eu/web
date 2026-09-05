<template>
  <div class="oc-text-editor size-full" :class="{ 'overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useAuthStore, useMentionUsers, type YjsEditorSlotProps } from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar,
  type ContentType,
  type TextEditorMentionsOptions
} from '@opencloud-eu/web-pkg/editor'
import { detectContentType } from './yjs'

const { ydoc, awareness, isReadOnly, resource, space, yjsStatus } =
  defineProps<YjsEditorSlotProps>()

const emit = defineEmits<{
  (e: 'register:onSaveCallback', value: (content: unknown) => Promise<void>): void
}>()

const { $gettext } = useGettext()
const authStore = useAuthStore()

const contentType = computed<ContentType>(() => {
  return detectContentType(resource)
})

const isRichText = computed(() => ['markdown', 'tiptap-json'].includes(unref(contentType)))

const placeholder = computed(() => {
  if (isReadOnly || !unref(isRichText)) {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

const mentionsEnabled = authStore.userContextReady && unref(isRichText)

let mentions: TextEditorMentionsOptions | undefined
if (mentionsEnabled) {
  const {
    getMentionUsers,
    notifyMentionedUsers,
    ownMentionLabel,
    resetMentionState,
    selectMentionUser
  } = useMentionUsers({
    space: toRef(() => space),
    resource: toRef(() => resource)
  })

  watch([() => space.id, () => resource.id], resetMentionState)

  emit('register:onSaveCallback', (content) =>
    notifyMentionedUsers(typeof content === 'string' ? content : undefined)
  )

  mentions = {
    getItems: getMentionUsers,
    onSelect: selectMentionUser,
    highlightLabels: [unref(ownMentionLabel)].filter(Boolean)
  }
}

const textEditor = useTextEditor({
  contentType: unref(contentType),
  currentResource: toRef(() => resource),
  readonly: () => isReadOnly,
  placeholder: unref(placeholder),
  ydoc,
  awareness,
  yjsStatus: () => yjsStatus,
  mentions
})
</script>
