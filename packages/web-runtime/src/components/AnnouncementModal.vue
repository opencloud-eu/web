<template>
  <oc-section class="announcement-modal" :title="title" icon="information" title-tag="h3">
    <div v-if="!editorReady" class="flex justify-center py-4">
      <oc-spinner :aria-label="$gettext('Loading announcement details')" />
    </div>
    <text-editor-viewer v-else :content="infoText" :aria-label="$gettext('Announcement details')" />
  </oc-section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { preloadTextEditor, TextEditorViewer, type Modal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

const { title = '', infoText = '' } = defineProps<{
  modal: Modal
  title?: string
  infoText?: string
}>()

const { $gettext } = useGettext()

const editorReady = ref(false)
onMounted(async () => {
  await preloadTextEditor()
  editorReady.value = true
})
</script>
