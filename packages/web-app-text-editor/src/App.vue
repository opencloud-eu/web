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
import {
  ContentType,
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/web-pkg/editor'
import { useMentionUsers } from '@opencloud-eu/web-pkg'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

const {
  currentContent,
  contentType = undefined,
  isReadOnly = false,
  resource,
  space
} = defineProps<{
  currentContent: string
  contentType?: ContentType
  isReadOnly?: boolean
  resource: Resource
  space: SpaceResource
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
  (e: 'register:onSaveCallback', value: () => Promise<void>): void
}>()

const { $gettext } = useGettext()

const parsedContentType = computed<ContentType>(() => {
  if (contentType !== undefined) {
    return contentType
  }
  const ext = resource?.extension?.toLowerCase()
  const mimeType = resource?.mimeType?.toLowerCase()
  if (ext === 'md' || ext === 'markdown' || mimeType === 'text/markdown') {
    return 'markdown'
  }

  return 'plain-text'
})

const placeholder = computed(() => {
  if (isReadOnly || unref(parsedContentType) !== 'markdown') {
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
  contentType: unref(parsedContentType),
  modelValue: toRef(() => currentContent),
  readonly: isReadOnly,
  placeholder: unref(placeholder),
  mentions: {
    items: getMentionUsers,
    onSelect: selectMention
  },
  onUpdate: (content) => emit('update:currentContent', content)
})
</script>
