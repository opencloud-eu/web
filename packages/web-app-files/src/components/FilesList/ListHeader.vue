<template>
  <div>
    <div
      v-if="loadReadmeContentTask.isRunning || !loadReadmeContentTask.last"
      class="flex justify-center"
    >
      <oc-spinner size="large" class="my-4" :aria-label="$gettext('Loading README content')" />
    </div>
    <div
      v-else
      ref="markdownContainerRef"
      class="markdown-container flex min-h-0 [&.collapsed]:max-h-[300px] [&.collapsed]:overflow-hidden"
      :class="{
        collapsed: markdownCollapsed,
        'mask-linear-[180deg,black,80%,transparent]': markdownCollapsed && showMarkdownCollapse
      }"
    >
      <text-editor class="w-full" is-read-only :current-content="markdownContent" />
    </div>
    <div v-if="showMarkdownCollapse && markdownContent" class="markdown-collapse text-center mt-2">
      <oc-button appearance="raw" no-hover @click="toggleMarkdownCollapsed">
        <span>{{ toggleMarkdownCollapsedText }}</span>
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, useTemplateRef } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { TextEditor, useClientService } from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'

const { space, readmeFile } = defineProps<{
  space: SpaceResource
  readmeFile: Resource
}>()

const { $gettext } = useGettext()
const clientService = useClientService()
const { getFileContents } = clientService.webdav

const markdownContainerRef = useTemplateRef('markdownContainerRef')
const markdownContent = ref('')
const markdownCollapsed = ref(true)
const showMarkdownCollapse = ref(false)

const toggleMarkdownCollapsedText = computed(() => {
  return unref(markdownCollapsed) ? $gettext('Show more') : $gettext('Show less')
})
const toggleMarkdownCollapsed = () => {
  markdownCollapsed.value = !unref(markdownCollapsed)
}

const onMarkdownResize = () => {
  if (!unref(markdownContainerRef)) {
    return
  }

  unref(markdownContainerRef).classList.remove('collapsed')
  const markdownContainerHeight = unref(markdownContainerRef).offsetHeight
  if (markdownContainerHeight < 300) {
    showMarkdownCollapse.value = false
    return
  }
  showMarkdownCollapse.value = true

  if (unref(markdownCollapsed)) {
    unref(markdownContainerRef).classList.add('collapsed')
  }
}
const markdownResizeObserver = new ResizeObserver(onMarkdownResize)
const observeMarkdownContainerResize = () => {
  if (!markdownResizeObserver || !unref(markdownContainerRef)) {
    return
  }
  markdownResizeObserver.unobserve(unref(markdownContainerRef))
  markdownResizeObserver.observe(unref(markdownContainerRef))
}
const unobserveMarkdownContainerResize = () => {
  if (!markdownResizeObserver || !unref(markdownContainerRef)) {
    return
  }
  markdownResizeObserver.unobserve(unref(markdownContainerRef))
}

const loadReadmeContentTask = useTask(function* (signal) {
  try {
    const { body } = yield getFileContents(space, { fileId: unref(readmeFile).id }, { signal })
    markdownContent.value = body || ''
  } catch (e) {
    console.error('failed to load README.md content', e)
  }
})

onMounted(async () => {
  await loadReadmeContentTask.perform()
  await nextTick()
  observeMarkdownContainerResize()
})

onBeforeUnmount(() => {
  unobserveMarkdownContainerResize()
})
</script>
