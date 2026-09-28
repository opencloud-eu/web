<template>
  <side-bar-no-selection
    id="oc-trash-no-selection"
    img-src="images/empty-states/empty-trash.svg"
    :message="$gettext('Select a trash bin to view details')"
    :details="details"
  />
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { SideBarNoSelection, useResourcesStore } from '@opencloud-eu/web-pkg'

const { $gettext, $ngettext } = useGettext()
const resourcesStore = useResourcesStore()
const { resources } = storeToRefs(resourcesStore)

const details = computed(() => {
  const count = unref(resources).length
  return [
    {
      term: $gettext('Items'),
      definition: $ngettext('%{count} trash bin', '%{count} trash bins', count, {
        count: count.toString()
      })
    }
  ]
})
</script>
