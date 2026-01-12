<template>
  <oc-datepicker
    :label="$gettext('Expiry date')"
    :min-date="DateTime.now()"
    @date-changed="onExpiryDateChanged"
  />
  <div>Selected date: {{ selectedDate }}</div>
  <div>Input error: {{ inputError }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DateTime } from 'luxon'

const selectedDate = ref<DateTime>()
const inputError = ref<boolean>()

const onExpiryDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
  selectedDate.value = date
  inputError.value = error
}
</script>
