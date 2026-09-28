<template>
  <side-bar-no-selection
    id="oc-no-selection"
    :img-src="imgSrc"
    :message="$gettext('Select a file or folder to view details')"
    :details="details"
  />
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import {
  SideBarNoSelection,
  formatFileSize,
  isLocationCommonActive,
  isLocationSharesActive,
  isLocationTrashActive,
  useResourcesStore,
  useRouter
} from '@opencloud-eu/web-pkg'

const router = useRouter()
const { $gettext, $ngettext, current: currentLanguage } = useGettext()
const resourcesStore = useResourcesStore()
const { resources } = storeToRefs(resourcesStore)

const imgSrc = computed(() => {
  return `images/empty-states/${getEmptyStateImage()}.svg`
})

function getEmptyStateImage() {
  if (isLocationCommonActive(router, 'files-common-favorites')) {
    return 'empty-favorites'
  }
  if (isLocationCommonActive(router, 'files-common-search')) {
    return 'empty-search-results'
  }
  if (isLocationSharesActive(router, 'files-shares-with-me')) {
    return 'empty-shared-with-me'
  }
  if (isLocationSharesActive(router, 'files-shares-with-others')) {
    return 'empty-shared-with-others'
  }
  if (isLocationSharesActive(router, 'files-shares-via-link')) {
    return 'empty-shared-via-link'
  }
  if (isLocationTrashActive(router, 'files-trash-generic')) {
    return 'empty-trash'
  }
  return 'empty-folder'
}

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
