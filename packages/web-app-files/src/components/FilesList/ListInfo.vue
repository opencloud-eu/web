<template>
  <div class="text-center">
    <p
      data-testid="files-list-footer-info"
      class="text-role-on-surface-variant"
      v-text="resourceContentsText"
    ></p>
    <p
      v-if="matchingResourcesText"
      data-testid="files-list-footer-matching-info"
      class="text-role-on-surface-variant"
      v-text="matchingResourcesText"
    ></p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useResourceContents } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'

const { resources = undefined, matchingCount = undefined } = defineProps<{
  /**
   * Resources to summarize, e.g. the ones of the current tab. Defaults to all loaded resources.
   */
  resources?: Resource[]
  /**
   * Number of resources matching an active search or filter. Leave undefined if none is active.
   */
  matchingCount?: number
}>()

const { $ngettext } = useGettext()
const { resourceContentsText } = useResourceContents({ resources: () => resources })

const matchingResourcesText = computed(() => {
  if (matchingCount === undefined) {
    return ''
  }
  return $ngettext(
    '%{ itemsCount } matching item',
    '%{ itemsCount } matching items',
    matchingCount,
    { itemsCount: matchingCount.toString() }
  )
})
</script>
