<template>
  <side-bar-multiple-selection
    id="oc-file-details-multiple-sidebar"
    :img-src="illustration"
    :message="selectedFilesString"
    :details="details"
    :details-label="$gettext('Overview of the information about the selected files')"
  />
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { SideBarMultipleSelection, formatFileSize, useResourcesStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { useViewIllustration } from '../../../composables/useViewIllustration'

const { showSpaceCount = false } = defineProps<{ showSpaceCount?: boolean }>()

const { $gettext, $ngettext, current: currentLanguage } = useGettext()
const resourcesStore = useResourcesStore()
const { illustration } = useViewIllustration()
const { selectedResources } = storeToRefs(resourcesStore)

const hasSize = computed(() => {
  return unref(selectedResources).some((resource) => Object.hasOwn(resource, 'size'))
})

const filesCount = computed(() => {
  return unref(selectedResources).filter((i) => i.type === 'file').length
})

const foldersCount = computed(() => {
  return unref(selectedResources).filter((i) => i.type === 'folder').length
})

const spacesCount = computed(() => {
  return unref(selectedResources).filter((i) => i.type === 'space').length
})

const sizeValue = computed(() => {
  let size = 0
  unref(selectedResources).forEach((i) => (size += parseInt(i.size?.toString() || '0')))
  return formatFileSize(size, currentLanguage)
})

const details = computed(() => [
  { term: $gettext('Files'), definition: unref(filesCount).toString() },
  { term: $gettext('Folders'), definition: unref(foldersCount).toString() },
  ...((showSpaceCount && [
    { term: $gettext('Spaces'), definition: unref(spacesCount).toString() }
  ]) ||
    []),
  ...((unref(hasSize) && [{ term: $gettext('Size'), definition: unref(sizeValue).toString() }]) ||
    [])
])

const selectedFilesCount = computed(() => {
  return unref(selectedResources).length
})
const selectedFilesString = computed(() => {
  return $ngettext(
    '%{ itemCount } item selected',
    '%{ itemCount } items selected',
    unref(selectedFilesCount),
    {
      itemCount: unref(selectedFilesCount).toString()
    }
  )
})
</script>
