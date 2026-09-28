<template>
  <side-bar-no-selection
    id="oc-no-selection"
    :img-src="illustration"
    :message="$gettext('Select a file or folder to view details')"
    :details="details"
  />
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { SideBarNoSelection, formatFileSize, useResourcesStore } from '@opencloud-eu/web-pkg'
import { useViewIllustration } from '../../composables/useViewIllustration'

const { illustration } = useViewIllustration()
const { $gettext, $ngettext, current: currentLanguage } = useGettext()
const resourcesStore = useResourcesStore()
const { resources } = storeToRefs(resourcesStore)

const itemsValue = computed(() => {
  const filesCount = unref(resources).filter(({ type }) => type === 'file').length
  const foldersCount = unref(resources).filter(({ type }) => type === 'folder').length
  return [
    $ngettext('%{count} file', '%{count} files', filesCount, { count: filesCount.toString() }),
    $ngettext('%{count} folder', '%{count} folders', foldersCount, {
      count: foldersCount.toString()
    })
  ].join(', ')
})

const hasSize = computed(() => {
  if (!unref(resources).length) {
    // nothing to sum up, the total size is 0
    return true
  }
  return unref(resources).some((resource) => Object.hasOwn(resource, 'size'))
})

const sizeValue = computed(() => {
  const size = unref(resources).reduce(
    (total, { size }) => total + parseInt(size?.toString() || '0'),
    0
  )
  return formatFileSize(size, currentLanguage)
})

const details = computed(() => {
  return [
    { term: $gettext('Items'), definition: unref(itemsValue) },
    ...(unref(hasSize) ? [{ term: $gettext('Total size'), definition: unref(sizeValue) }] : [])
  ]
})
</script>
