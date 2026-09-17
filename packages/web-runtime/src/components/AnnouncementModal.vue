<template>
  <div v-if="!editorReady" class="flex justify-center py-4">
    <oc-spinner :aria-label="$gettext('Loading announcement details')" />
  </div>
  <text-editor-viewer
    v-else
    class="announcement-modal"
    :content="infoText"
    :aria-label="$gettext('Announcement details')"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { preloadTextEditor, TextEditorViewer, type Modal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

const { infoText = '' } = defineProps<{ modal: Modal; infoText?: string }>()

const { $gettext } = useGettext()

const editorReady = ref(false)
onMounted(async () => {
  await preloadTextEditor()
  editorReady.value = true
})
</script>
