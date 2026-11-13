<template>
  <form autocomplete="off" @submit.prevent="$emit('confirm', dateTime)">
    <oc-datepicker
      id="date-picker-modal-input"
      :label="$gettext('Expiration date')"
      type="date"
      :min-date="minDate"
      :max-date="DateTime.now().plus({ years: 100 })"
      :current-date="currentDate"
      :is-clearable="isClearable"
      :is-dark="currentTheme.isDark"
      required-mark
      @date-changed="onDateChanged"
    />
    <input type="submit" class="hidden" />
  </form>

  <teleport defer :to="`#${modalActionsTarget(modal)}`">
    <oc-button
      :disabled="confirmDisabled"
      class="oc-modal-body-actions-confirm ml-2"
      appearance="filled"
      @click="$emit('confirm', dateTime)"
    >
      {{ $gettext('Confirm') }}
    </oc-button>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DateTime } from 'luxon'
import { Modal, modalActionsTarget, useThemeStore } from '../../composables/piniaStores'
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

const emit = defineEmits<{
  (e: 'confirm', dateTime: DateTime): void
  (e: 'cancel'): void
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const dateTime = ref<DateTime>()
const confirmDisabled = ref(true)
// lets the modal wrapper ignore a confirm on Enter while the date is invalid
watch(confirmDisabled, (disabled) => emit('update:confirmDisabled', disabled), { immediate: true })

const onDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
  confirmDisabled.value = error || !date
  dateTime.value = date
}
</script>
