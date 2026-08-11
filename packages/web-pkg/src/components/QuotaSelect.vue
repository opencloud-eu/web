<template>
  <div class="quota-select-batch-action-form">
    <oc-select
      ref="select"
      :model-value="selectedOption"
      :selectable="optionSelectable"
      taggable
      push-tags
      :clearable="false"
      :options="options"
      :create-option="createOption"
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
import { ref, computed, unref, onMounted, watch } from 'vue'
import { isNumber } from 'lodash-es'
import { formatFileSize } from '../helpers/filesize'
import { useGettext } from 'vue3-gettext'

const { totalQuota = 0, maxQuota = 0 } = defineProps<{
  totalQuota?: number
  maxQuota?: number
}>()

const emit = defineEmits<{
  (e: 'selectedOptionChange', value: Option): void
}>()

type Option = {
  value: number
  displayValue: string
  selectable?: boolean
}

const { $gettext, current: currentLanguage } = useGettext()

const selectedOption = ref<Option>(undefined)
const options = ref<Option[]>([])

function isValueValidNumber(value: string | number) {
  if (isNumber(value)) {
    return value > 0
  }

  const optionIsNumberRegex = /^[0-9]\d*(([.,])\d+)?$/g
  return optionIsNumberRegex.test(value)
}

function getFormattedFileSize(value: number) {
  const formattedFilesize = formatFileSize(value, unref(currentLanguage))
  return !isValueValidNumber(value) ? value.toString() : formattedFilesize
}

const quotaLimit = computed(() => maxQuota || 1e15)

const DEFAULT_OPTIONS = computed<Option[]>(() => {
  return [
    {
      value: Math.pow(10, 9),
      displayValue: getFormattedFileSize(Math.pow(10, 9))
    },
    {
      value: 2 * Math.pow(10, 9),
      displayValue: getFormattedFileSize(2 * Math.pow(10, 9))
    },
    {
      value: 5 * Math.pow(10, 9),
      displayValue: getFormattedFileSize(5 * Math.pow(10, 9))
    },
    {
      value: 10 * Math.pow(10, 9),
      displayValue: getFormattedFileSize(10 * Math.pow(10, 9))
    },
    {
      value: 50 * Math.pow(10, 9),
      displayValue: getFormattedFileSize(50 * Math.pow(10, 9))
    },
    {
      value: 100 * Math.pow(10, 9),
      displayValue: getFormattedFileSize(100 * Math.pow(10, 9))
    },
    {
      displayValue: $gettext('No restriction'),
      value: 0
    }
  ]
})

function onUpdate(event: Option) {
  selectedOption.value = event
  emit('selectedOptionChange', unref(selectedOption))
}
function optionSelectable(option: Option) {
  return option.selectable !== false
}

function createOption(option: string) {
  option = option.replace(',', '.')

  if (!isValueValidNumber(option)) {
    return {
      displayValue: option,
      value: option,
      error: $gettext('Please enter only numbers'),
      selectable: false
    }
  }
  const value = parseFloat(option) * Math.pow(10, 9)

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

  return {
    value,
    displayValue: getFormattedFileSize(value)
  }
}
function setOptions() {
  let availableOptions = [...unref(DEFAULT_OPTIONS)]

  if (maxQuota) {
    availableOptions = availableOptions.filter((availableOption) => {
      if (totalQuota === 0 && availableOption.value === 0) {
        availableOption.selectable = false
        return true
      }
      return availableOption.value !== 0 && availableOption.value <= maxQuota
    })
  }

  const selectedQuotaInOptions = availableOptions.find((option) => option.value === totalQuota)

  if (!selectedQuotaInOptions) {
    availableOptions.push({
      displayValue: getFormattedFileSize(totalQuota),
      value: totalQuota,
      selectable: totalQuota <= unref(quotaLimit)
    })
  }

  // Sort options and make sure that unlimited is at the end
  availableOptions = [
    ...availableOptions.filter((o) => o.value).sort((a, b) => a.value - b.value),
    ...availableOptions.filter((o) => !o.value)
  ]
  options.value = availableOptions
}

watch(
  () => totalQuota,
  () => {
    const selected = unref(options).find((o) => o.value === totalQuota)
    if (selected) {
      selectedOption.value = selected
    }
  }
)

onMounted(() => {
  setOptions()
  selectedOption.value = unref(options).find((o) => o.value === totalQuota)
})
</script>
