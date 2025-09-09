<template>
  <div id="oc-spaces-details-multiple-sidebar" class="p-4 bg-role-surface-container rounded-sm">
    <div class="text-center mb-6 rounded-sm">
      <div>
        <oc-icon size="xxlarge" name="layout-grid" />
        <p v-text="selectedSpacesString" />
      </div>
    </div>
    <oc-definition-list :aria-label="detailsTableLabel" :items="items" class="m-0" />
  </div>
</template>
<script setup lang="ts">
import { formatFileSize } from '../../../../helpers'
import { computed, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

const { selectedSpaces } = defineProps<{
  selectedSpaces: SpaceResource[]
}>()

const language = useGettext()
const { $gettext, $ngettext } = language
const totalSelectedSpaceQuotaTotal = computed(() => {
  let total = 0
  selectedSpaces.forEach((space) => {
    total += space.spaceQuota.total
  })
  return formatFileSize(total, language.current)
})
const totalSelectedSpaceQuotaRemaining = computed(() => {
  let remaining = 0
  selectedSpaces.forEach((space) => {
    if (space.disabled) {
      return
    }
    remaining += space.spaceQuota.remaining
  })
  return formatFileSize(remaining, language.current)
})
const totalSelectedSpaceQuotaUsed = computed(() => {
  let used = 0
  selectedSpaces.forEach((space) => {
    if (space.disabled) {
      return
    }
    used += space.spaceQuota.used
  })
  return formatFileSize(used, language.current)
})
const totalEnabledSpaces = computed(() => {
  return selectedSpaces.filter((s) => !s.disabled).length
})
const totalDisabledSpaces = computed(() => {
  return selectedSpaces.filter((s) => s.disabled).length
})
const detailsTableLabel = computed(() => {
  return $gettext('Overview of the information about the selected spaces')
})
const selectedSpacesString = computed(() => {
  return $ngettext(
    '%{ itemCount } space selected',
    '%{ itemCount } spaces selected',
    selectedSpaces.length,
    {
      itemCount: selectedSpaces.length.toString()
    }
  )
})

const items = computed(() => [
  { term: $gettext('Total quota:'), definition: unref(totalSelectedSpaceQuotaTotal).toString() },
  {
    term: $gettext('Remaining quota:'),
    definition: unref(totalSelectedSpaceQuotaRemaining).toString()
  },
  { term: $gettext('Used quota:'), definition: unref(totalSelectedSpaceQuotaUsed).toString() },
  { term: $gettext('Enabled:'), definition: unref(totalEnabledSpaces).toString() },
  { term: $gettext('Disabled:'), definition: unref(totalDisabledSpaces).toString() }
])
</script>
