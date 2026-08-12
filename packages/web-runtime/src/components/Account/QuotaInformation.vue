<template>
  <div class="flex items-center">
    <oc-icon name="hard-drive-2" size-class="size-4" fill-type="line" class="mr-1" />
    <div>
      <p class="my-0">
        <span class="quota-information-text" v-text="personalStorageDetailsLabel" />
      </p>
      <oc-progress
        v-if="limitedPersonalStorage"
        :value="quotaUsagePercent"
        :max="100"
        size="small"
        :color="quotaProgressColor"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { Quota } from '@opencloud-eu/web-client/graph/generated'
import { useGettext } from 'vue3-gettext'
import { formatFileSize } from '@opencloud-eu/web-pkg'

const { quota } = defineProps<{
  quota: Quota
}>()

const { $gettext, current: currentLanguage } = useGettext()

const limitedPersonalStorage = computed(() => {
  return !isNaN(quota.total) && quota.total !== 0
})

const quotaUsagePercent = computed(() => {
  return parseFloat(((quota.used / quota.total) * 100).toFixed(2))
})

const personalStorageDetailsLabel = computed(() => {
  const total = quota.total || 0
  const used = quota.used || 0
  return total
    ? $gettext('%{used} of %{total} used (%{percentage}%)', {
        used: formatFileSize(used, currentLanguage),
        total: formatFileSize(total, currentLanguage),
        percentage: (unref(quotaUsagePercent) || 0).toString()
      })
    : $gettext('%{used} used', {
        used: formatFileSize(used, currentLanguage)
      })
})

const quotaProgressColor = computed(() => {
  if ((unref(quotaUsagePercent) || 0) < 90) {
    return 'var(--oc-role-secondary)'
  }
  return 'var(--oc-role-error)'
})
</script>
