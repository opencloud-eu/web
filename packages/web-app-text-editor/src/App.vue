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
import { useMentionUsers, type YjsEditorSlotProps } from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar,
  type ContentType
} from '@opencloud-eu/web-pkg/editor'
import { detectContentType } from './yjs'

const { ydoc, awareness, isReadOnly, resource, space } = defineProps<YjsEditorSlotProps>()

const emit = defineEmits<{
  (e: 'register:onSaveCallback', value: () => Promise<void>): void
}>()

const { $gettext } = useGettext()

const contentType = computed<ContentType>(() => {
  return detectContentType(resource)
})

const placeholder = computed(() => {
  if (isReadOnly || unref(contentType) !== 'markdown') {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

const { getMentionUsers, notifyMentionedUsers, resetMentionState, selectMentionUser } =
  useMentionUsers({
    space: toRef(() => space),
    resource: toRef(() => resource)
  })

function selectMention({ id }: { id: string }): void {
  selectMentionUser(id)
}

watch([() => space.id, () => resource.id], resetMentionState)

emit('register:onSaveCallback', notifyMentionedUsers)

const textEditor = useTextEditor({
  contentType: unref(contentType),
  currentResource: toRef(() => resource),
  readonly: () => isReadOnly,
  placeholder: unref(placeholder),
  ydoc,
  awareness,
  mentions: {
    items: getMentionUsers,
    onSelect: selectMention
  }
})
</script>
