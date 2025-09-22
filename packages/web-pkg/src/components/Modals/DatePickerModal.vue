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
    <oc-button class="oc-modal-body-actions-cancel ml-2" @click="$emit('cancel')">
      {{ $gettext('Cancel') }}
    </oc-button>
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

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue'
import { DateTime } from 'luxon'
import { Modal, useThemeStore } from '../../composables/piniaStores'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'DatePickerModal',
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    currentDate: { type: Object as PropType<DateTime>, required: false, default: null },
    minDate: { type: Object as PropType<DateTime>, required: false, default: null },
    isClearable: { type: Boolean, default: true }
  },
  emits: ['confirm', 'cancel'],
  setup() {
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)

    const dateTime = ref<DateTime>()
    const confirmDisabled = ref(true)
    const onDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
      confirmDisabled.value = error || !date
      dateTime.value = date
    }

    return {
      confirmDisabled,
      onDateChanged,
      currentTheme,
      dateTime
    }
  }
})
</script>
