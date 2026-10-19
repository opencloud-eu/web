<template>
  <div class="quota-select-batch-action-form">
    <oc-select
      :model-value="selectedOption"
      :selectable="optionSelectable"
      taggable
      :clearable="false"
      :options="options"
      :create-option="createOption"
      :filter="filterOptions"
      option-label="displayValue"
      :label="$gettext('Quota')"
      v-bind="$attrs"
      @update:model-value="onUpdate"
    >
      <template #selected-option="{ displayValue }">
        <oc-icon v-if="$attrs['read-only']" name="lock" class="mr-1" size-class="size-4" />
        <span v-text="displayValue" />
      </template>
      <template #search="{ attributes, events }">
        <input class="vs__search" v-bind="attributes" v-on="events" />
      </template>
      <template #option="{ displayValue, error }">
        <div class="flex justify-between">
          <span v-text="displayValue" />
        </div>
        <div v-if="error" class="oc-text-input-danger">{{ error }}</div>
      </template>
    </oc-select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, unref, watch } from 'vue'
import { formatFileSize } from '../helpers/filesize'
import { useGettext } from 'vue3-gettext'

const {
  totalQuota = 0,
  maxQuota = 0,
  allowDefault = false
} = defineProps<{
  totalQuota?: number | null
  maxQuota?: number
  allowDefault?: boolean
}>()

const emit = defineEmits<{
  (e: 'selectedOptionChange', value: Option): void
}>()

type Option = {
  value: number | null
  displayValue: string
  selectable?: boolean
  error?: string
}

const { $gettext, current: currentLanguage } = useGettext()

const PRESET_QUOTAS = [1, 2, 5, 10, 50, 100].map((gigabytes) => gigabytes * 1e9)
const customQuotas = ref<number[]>([])
const selectedQuota = ref(totalQuota)
const quotaLimit = computed(() => maxQuota || 1e15)
const options = computed<Option[]>(() => {
  const availableOptions: Option[] = [...PRESET_QUOTAS, ...unref(customQuotas)]
    .filter((value) => !maxQuota || value <= maxQuota)
    .map((value) => ({ value, displayValue: getFormattedFileSize(value) }))
  const currentQuota = unref(selectedQuota)

  if (
    currentQuota !== null &&
    currentQuota !== 0 &&
    !availableOptions.some((option) => option.value === currentQuota)
  ) {
    availableOptions.push({
      value: currentQuota,
      displayValue: getFormattedFileSize(currentQuota),
      selectable: currentQuota <= unref(quotaLimit)
    })
  }

  availableOptions.sort((a, b) => a.value - b.value)

  if (allowDefault) {
    availableOptions.unshift({ value: null, displayValue: $gettext('Default') })
  }
  if (!maxQuota || currentQuota === 0) {
    availableOptions.push({
      value: 0,
      displayValue: $gettext('No restriction'),
      ...(maxQuota && { selectable: false })
    })
  }
  return availableOptions
})
const selectedOption = computed(() =>
  unref(options).find((option) => option.value === unref(selectedQuota))
)

function isValueValidNumber(value: string) {
  return /^\d+([.,]\d+)?$/.test(value)
}

function isZeroInput(input: string) {
  const normalizedInput = input.replace(',', '.')
  return isValueValidNumber(normalizedInput) && parseFloat(normalizedInput) === 0
}

function getFormattedFileSize(value: number) {
  return value > 0 ? formatFileSize(value, unref(currentLanguage)) : value.toString()
}

function onUpdate(event: Option) {
  if (!optionSelectable(event)) {
    return
  }
  rememberCustomQuota(unref(selectedQuota))
  rememberCustomQuota(event.value)
  selectedQuota.value = event.value
  emit('selectedOptionChange', event)
}

function rememberCustomQuota(value: number | null) {
  if (
    value === null ||
    value <= 0 ||
    PRESET_QUOTAS.includes(value) ||
    unref(customQuotas).includes(value)
  ) {
    return
  }
  customQuotas.value.push(value)
}

function optionSelectable(option: Option) {
  return option.selectable !== false
}

function filterOptions(items: Option[], search: string) {
  // a typed 0 means "No restriction", so it must not match presets like "10 GB"
  if (isZeroInput(search)) {
    return items.filter((item) => item.value === 0)
  }
  const normalizedSearch = search.toLocaleLowerCase()
  return items.filter((item) => item.displayValue.toLocaleLowerCase().includes(normalizedSearch))
}

function createOption(option: string): Option {
  if (isZeroInput(option)) {
    const unlimitedOption = unref(options).find((o) => o.value === 0)
    if (unlimitedOption) {
      return unlimitedOption
    }
  }

  option = option.replace(',', '.')

  if (!isValueValidNumber(option)) {
    return {
      displayValue: option,
      value: null,
      error: $gettext('Please enter only numbers'),
      selectable: false
    }
  }
  const value = Math.round(parseFloat(option) * 1e9)

  if (value < 1) {
    return {
      displayValue: option,
      value: null,
      error: $gettext('Please enter a value greater than 0'),
      selectable: false
    }
  }

  if (value > unref(quotaLimit)) {
    return {
      value,
      displayValue: getFormattedFileSize(value),
      error: $gettext('Please enter a value equal to or less than %{ quotaLimit }', {
        quotaLimit: getFormattedFileSize(unref(quotaLimit)).toString()
      }),

      selectable: false
    }
  }

  return (
    unref(options).find((existing) => existing.value === value) || {
      value,
      displayValue: getFormattedFileSize(value)
    }
  )
}
watch(
  () => totalQuota,
  (value) => {
    selectedQuota.value = value
  }
)
</script>
