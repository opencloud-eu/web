<template>
  <div class="flex items-center">
    <oc-icon name="hard-drive-2" size="small" fill-type="line" class="mr-1" />
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

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { Quota } from '@opencloud-eu/web-client/graph/generated'
import { useGettext } from 'vue3-gettext'
import { formatFileSize } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'QuotaInformation',
  props: {
    quota: {
      type: Object as PropType<Quota>,
      required: true,
      default: () => undefined as Quota // FIXME: hack because vue doesn't detect type
    }
  },
  setup(props) {
    const { $gettext, current: currentLanguage } = useGettext()

    const limitedPersonalStorage = computed(() => {
      return props.quota.total !== 0
    })

    const quotaUsagePercent = computed(() => {
      return parseFloat(((props.quota.used / props.quota.total) * 100).toFixed(2))
    })

    const personalStorageDetailsLabel = computed(() => {
      const total = props.quota.total || 0
      const used = props.quota.used || 0
      return total
        ? $gettext('%{used} of %{total} used (%{percentage}%)', {
            used: formatFileSize(used, currentLanguage),
            total: formatFileSize(total, currentLanguage),
            percentage: (unref(quotaUsagePercent) || 0).toString()
          })
        : $gettext('%{used} used', {
            used: formatFileSize(used, currentLanguage),
            total: formatFileSize(total, currentLanguage)
          })
    })

    const quotaProgressColor = computed(() => {
      if ((unref(quotaUsagePercent) || 0) < 90) {
        return 'var(--oc-role-secondary)'
      }
      return 'var(--oc-role-error)'
    })

    return {
      quotaUsagePercent,
      personalStorageDetailsLabel,
      limitedPersonalStorage,
      quotaProgressColor
    }
  }
})
</script>
