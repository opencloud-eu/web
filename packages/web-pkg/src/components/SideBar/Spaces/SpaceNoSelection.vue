<template>
  <side-bar-no-selection
    img-src="images/illustrations/spaces.svg"
    :message="$gettext('Select a space to view details')"
    :details="details"
  />
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import SideBarNoSelection from '../SideBarNoSelection.vue'

const { spacesCount = 0 } = defineProps<{ spacesCount?: number }>()

const { $gettext, $ngettext } = useGettext()

const details = computed(() => {
  return [
    {
      term: $gettext('Items'),
      definition: $ngettext('%{count} space', '%{count} spaces', spacesCount, {
        count: spacesCount.toString()
      })
    }
  ]
})
</script>
