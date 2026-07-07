<template>
  <div class="flex justify-center" data-testid="public-link-info-expiration-date">
    <oc-icon
      v-oc-tooltip="expirationDateTooltip"
      :aria-label="expirationDateTooltip"
      name="calendar-event"
      fill-type="line"
    />
    <span class="sr-only" v-text="screenreaderShareExpiration" />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { DateTime } from 'luxon'
import { formatDateFromDateTime, formatRelativeDateFromDateTime } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

const { expirationDate = null } = defineProps<{ expirationDate?: DateTime }>()

const { $gettext, current: currentLanguage } = useGettext()

const expirationDateRelative = computed(() => {
  return formatRelativeDateFromDateTime(expirationDate, currentLanguage)
})

const dateExpire = computed(() => {
  return formatDateFromDateTime(expirationDate, currentLanguage)
})

const expirationDateTooltip = computed(() => {
  return $gettext('Expires %{timeToExpiry} (%{expiryDate})', {
    timeToExpiry: unref(expirationDateRelative),
    expiryDate: unref(dateExpire)
  })
})

const screenreaderShareExpiration = computed(() => {
  return $gettext('Share expires %{ expiryDateRelative } (%{ expiryDate })', {
    expiryDateRelative: unref(expirationDateRelative),
    expiryDate: unref(dateExpire)
  })
})
</script>
