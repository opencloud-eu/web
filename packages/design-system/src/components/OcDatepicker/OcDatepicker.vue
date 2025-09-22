<template>
  <oc-text-input
    v-model="dateInputString"
    v-bind="$attrs"
    :label="label"
    type="date"
    :min="minDate?.toISODate()"
    :fix-message-line="true"
    :error-message="errorMessage"
    :clear-button-enabled="isClearable"
    :clear-button-accessible-label="$gettext('Clear date')"
    class="oc-date-picker"
    :class="{ 'oc-date-picker-dark': isDark }"
  />
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { DateTime } from 'luxon'

export interface Props {
  /**
   * @docs Label of the date picker.
   */
  label: string
  /**
   * @docs Current date which acts as the pre-filled date.
   */
  currentDate?: DateTime
  /**
   * @docs Determines if the date picker is clearable.
   */
  isClearable?: boolean
  /**
   * @docs Minimum date that can be selected. Dates before this date will be disabled.
   */
  minDate?: DateTime
  /**
   * @docs Dark theme for the date picker.
   * Dark theme is only available for Chromium-like browsers and Safari, Firefox is not supported.
   */
  isDark?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the date has been changed.
   */
  (e: 'dateChanged', data: { date: DateTime | null; error: boolean }): void
}

const { label, currentDate, isClearable = true, minDate, isDark = false } = defineProps<Props>()

const emit = defineEmits<Emits>()

const { $gettext, current } = useGettext()
const dateInputString = ref<string>('')

const date = computed(() => {
  const date = DateTime.fromISO(unref(dateInputString)).endOf('day')
  return date.isValid ? date : null
})

const isMinDateUndercut = computed(() => {
  if (!minDate || !unref(date)) {
    return false
  }
  return unref(date) < minDate
})

const errorMessage = computed(() => {
  if (unref(isMinDateUndercut)) {
    return $gettext('The date must be after %{date}', {
      date: minDate.minus({ day: 1 }).setLocale(current).toLocaleString(DateTime.DATE_SHORT)
    })
  }
  return ''
})

watch(
  () => currentDate,
  () => {
    if (currentDate) {
      dateInputString.value = currentDate.toISODate()
      return
    }

    dateInputString.value = undefined
  },
  { immediate: true }
)

watch(
  date,
  () => {
    emit('dateChanged', { date: unref(date), error: unref(isMinDateUndercut) })
  },
  { deep: true }
)
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-date-picker input::-webkit-calendar-picker-indicator {
    @apply cursor-pointer;
  }
}
</style>
<style lang="scss">
.oc-date-picker-dark input {
  color-scheme: dark;
}

.oc-date-picker-dark input::-webkit-calendar-picker-indicator {
  filter: invert(0);
}
</style>
