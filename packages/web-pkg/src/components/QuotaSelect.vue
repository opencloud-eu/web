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
  defaultQuota = null,
  allowDefault = false
} = defineProps<{
  totalQuota?: number | null
  maxQuota?: number
  defaultQuota?: number | null
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
  isDefault?: boolean
}

const { $gettext, current: currentLanguage } = useGettext()

const PRESET_QUOTAS = [1, 2, 5, 10, 50, 100].map((gigabytes) => gigabytes * 1e9)
const customQuotas = ref<number[]>([])
const selectedQuota = ref(totalQuota)
const quotaLimit = computed(() => maxQuota || 1e15)
const options = computed<Option[]>(() => {
  const quotas = [...PRESET_QUOTAS, ...unref(customQuotas)]
  if (defaultQuota && !quotas.includes(defaultQuota)) {
    quotas.push(defaultQuota)
  }
  const availableOptions: Option[] = quotas
    .filter((value) => !maxQuota || value <= maxQuota || isSelectableDefault(value))
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

  if (!maxQuota || currentQuota === 0 || isSelectableDefault(0)) {
    availableOptions.push({
      value: 0,
      displayValue: $gettext('No restriction'),
      ...(maxQuota && !isSelectableDefault(0) && { selectable: false })
    })
  }
  return availableOptions.map(markDefaultOption)
})
const selectedOption = computed(() => unref(options).find(isSelectedOption))

function isSelectedOption(option: Option) {
  if (unref(selectedQuota) === null) {
    return allowDefault && option.isDefault
  }
  return option.value === unref(selectedQuota)
}

function isSelectableDefault(value: number) {
  return allowDefault && value === defaultQuota
}

function markDefaultOption(option: Option): Option {
  if (option.value !== defaultQuota) {
    return option
  }
  const displayValue = $gettext('%{quota} (Default)', { quota: option.displayValue })
  return { ...option, displayValue, isDefault: true }
}

function normalizeInput(input: string) {
  return input.replace(',', '.')
}

function parseInputNumber(input: string) {
  const normalizedInput = normalizeInput(input)
  if (!/^\d+(\.\d+)?$/.test(normalizedInput)) {
    return null
  }
  return parseFloat(normalizedInput)
}

function isZeroInput(input: string) {
  return parseInputNumber(input) === 0
}

function parseQuotaInput(input: string) {
  const inputNumber = parseInputNumber(input)
  if (inputNumber === null) {
    return null
  }
  return Math.round(inputNumber * 1e9)
}

function getFormattedFileSize(value: number) {
  return value > 0 ? formatFileSize(value, unref(currentLanguage)) : value.toString()
}

function onUpdate(event: Option) {
  if (!optionSelectable(event)) {
    return
  }
  const value = allowDefault && event.isDefault ? null : event.value
  rememberCustomQuota(unref(selectedQuota))
  rememberCustomQuota(value)
  selectedQuota.value = value
  emit('selectedOptionChange', { ...event, value })
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
  // the option of a typed number comes first, also when its label differs, e.g. "0.013" for "13 MB"
  const typedQuota = parseQuotaInput(search)
  const exactMatches = typedQuota ? items.filter((item) => item.value === typedQuota) : []
  const normalizedSearch = search.toLocaleLowerCase()
  const textMatches = items.filter(
    (item) =>
      !exactMatches.includes(item) &&
      item.displayValue.toLocaleLowerCase().includes(normalizedSearch)
  )
  return [...exactMatches, ...textMatches]
}

function createOption(option: string): Option {
  if (isZeroInput(option)) {
    const unlimitedOption = unref(options).find((o) => o.value === 0)
    if (unlimitedOption) {
      return unlimitedOption
    }
  }

  const value = parseQuotaInput(option)

  if (value === null) {
    return {
      displayValue: option,
      value: null,
      error: $gettext('Please enter only numbers'),
      selectable: false
    }
  }

  if (value < 1) {
    return {
      displayValue: option,
      value: null,
      error: $gettext('Please enter a value greater than 0'),
      selectable: false
    }
  }

  const existingOption = unref(options).find(
    (existing) => existing.value === value && optionSelectable(existing)
  )
  if (existingOption) {
    return existingOption
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

  return { value, displayValue: getFormattedFileSize(value) }
}
watch(
  () => totalQuota,
  (value) => {
    selectedQuota.value = value
  }
)
</script>
