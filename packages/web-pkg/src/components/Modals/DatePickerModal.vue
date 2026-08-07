<template>
  <oc-datepicker
    :label="$gettext('Expiration date')"
    type="date"
    :min-date="minDate"
    :current-date="currentDate"
    :is-clearable="isClearable"
    :is-dark="currentTheme.isDark"
    required-mark
    @date-changed="onDateChanged"
  />

  <div class="flex justify-end items-center mt-2">
    <oc-button
      :disabled="confirmDisabled"
      class="oc-modal-body-actions-confirm ml-2"
      appearance="filled"
      @click="$emit('confirm', dateTime)"
    >
      {{ $gettext('Confirm') }}
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DateTime } from 'luxon'
import { Modal, useThemeStore } from '../../composables/piniaStores'
import { storeToRefs } from 'pinia'

const {
  currentDate = undefined,
  minDate = undefined,
  isClearable = true
} = defineProps<{
  modal: Modal
  currentDate?: DateTime
  minDate?: DateTime
  isClearable?: boolean
}>()

defineEmits<{
  (e: 'confirm', dateTime: DateTime): void
  (e: 'cancel'): void
}>()

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const dateTime = ref<DateTime>()
const confirmDisabled = ref(true)
const onDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
  confirmDisabled.value = error || !date
  dateTime.value = date
}
</script>
