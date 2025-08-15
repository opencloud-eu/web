<template>
  <div class="space-quota">
    <p class="mb-2 mt-0" v-text="spaceStorageDetailsLabel" />
    <oc-progress
      :value="quotaUsagePercent"
      :max="100"
      size="small"
      :color="quotaProgressColor"
      background-color="var(--oc-role-surface)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { Quota } from '@opencloud-eu/web-client/graph/generated'
import { formatFileSize } from '../helpers'
import { useGettext } from 'vue3-gettext'

const { spaceQuota } = defineProps<{
  spaceQuota: Quota
}>()

const { $gettext, current: currentLanguage } = useGettext()

const spaceStorageDetailsLabel = computed(() => {
  if (spaceQuota.total) {
    return $gettext('%{used} of %{total} used (%{percentage}% used)', {
      used: unref(quotaUsed),
      total: unref(quotaTotal),
      percentage: unref(quotaUsagePercent).toString()
    })
  }

  return $gettext('%{used} used (no restriction)', {
    used: unref(quotaUsed)
  })
})
const quotaTotal = computed(() => {
  return formatFileSize(spaceQuota.total, currentLanguage)
})
const quotaUsed = computed(() => {
  return formatFileSize(spaceQuota.used, currentLanguage)
})
const quotaUsagePercent = computed(() => {
  return parseFloat(((spaceQuota.used / spaceQuota.total) * 100).toFixed(2))
})
const quotaProgressColor = computed(() => {
  switch (spaceQuota.state) {
    case 'normal':
      return 'var(--oc-role-secondary)'
    default:
      return 'var(--oc-role-error)'
  }
})
</script>
