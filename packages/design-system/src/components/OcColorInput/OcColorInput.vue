<template>
  <div :class="$attrs.class">
    <slot name="label">
      <label class="oc-label" :for="id">
        {{ label }}
        <span v-if="requiredMark" class="text-role-on-error" aria-hidden="true">*</span>
      </label>
    </slot>
    <div class="oc-color-input-wrapper oc-position-relative">
      <input
        :id="id"
        v-bind="additionalAttributes"
        type="color"
        :aria-invalid="ariaInvalid"
        class="oc-color-input oc-input oc-rounded py-0.5 focus:border focus:border-role-outline"
        :class="{
          'oc-color-input-danger text-role-on-error focus:text-role-on-error border-role-error':
            !!errorMessage,
          'pr-6': showClearButton
        }"
        :value="modelValue"
        :disabled="disabled"
        @change="onChange(($event.target as HTMLInputElement).value)"
        @input="onInput(($event.target as HTMLInputElement).value)"
      />
      <oc-button
        v-if="showClearButton"
        class="mr-1 oc-position-center-right oc-color-input-btn-clear"
        appearance="raw"
        no-hover
        @click="onClear"
      >
        <oc-icon name="close" size="small" />
      </oc-button>
    </div>
    <div
      v-if="showMessageLine"
      class="oc-color-input-message flex items-center text-sm mt-1"
      :class="{
        'oc-color-input-description text-role-on-surface-variant': !!descriptionMessage,
        'oc-color-input-danger text-role-on-error focus:text-role-on-error border-role-error':
          !!errorMessage
      }"
    >
      <oc-icon
        v-if="!!errorMessage"
        name="error-warning"
        size="small"
        fill-type="line"
        aria-hidden="true"
        class="mr-1"
      />

      <span
        :id="messageId"
        :class="{
          'oc-color-input-description text-role-on-surface-variant flex items-center':
            !!descriptionMessage,
          'oc-color-input-danger text-role-on-error focus:text-role-on-error border-role-error':
            !!errorMessage
        }"
        v-text="messageText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { uniqueId } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  /**
   * @docs The element ID of the input.
   */
  id?: string
  /**
   * @docs The value of the input.
   */
  modelValue?: string
  /**
   * @docs Determines if the input should have a clear button.
   * @default true
   */
  clearButtonEnabled?: boolean
  /**
   * @docs Determines if the input is disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * @docs The label of the input element.
   */
  label: string
  /**
   * @docs The error message to be displayed below the input.
   */
  errorMessage?: string
  /**
   * @docs Determines if the message line should be fixed.
   * @default false
   */
  fixMessageLine?: boolean
  /**
   * @docs The description message to be displayed below the input.
   */
  descriptionMessage?: string
  /**
   * @docs Determines if a required mark (*) should be displayed next to the label.
   * @default false
   */
  requiredMark?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the value of the input has changed after the user confirms or leaves the focus.
   */
  (e: 'change', value: string): void
  /**
   * @docs Emitted when the value of the input has updated.
   */
  (e: 'update:modelValue', value: string): void
}

export interface Slots {
  /**
   * @docs Can be used to overwrite the default rendering of the label.
   */
  label?: () => unknown
}

const {
  id = uniqueId('oc-color-input-'),
  modelValue = '',
  clearButtonEnabled = true,
  disabled = false,
  label,
  errorMessage,
  fixMessageLine = false,
  descriptionMessage,
  requiredMark = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const showMessageLine = computed(() => {
  return fixMessageLine || !!errorMessage || !!descriptionMessage
})

const messageId = computed(() => `${id}-message`)

const tmpAttrs = useAttrs()
const additionalAttributes = computed(() => {
  const additionalAttrs: Record<string, unknown> = {}
  if (!!errorMessage || !!descriptionMessage) {
    additionalAttrs['aria-describedby'] = messageId.value
  }
  // note: we spread out the attrs we don't want to be present in the resulting object
  const { change, input, class: classes, ...attrs } = tmpAttrs
  return { ...attrs, ...additionalAttrs }
})

const ariaInvalid = computed(() => {
  return (!!errorMessage).toString()
})

const messageText = computed(() => {
  if (errorMessage) {
    return errorMessage
  }
  return descriptionMessage
})

const showClearButton = computed(() => {
  return !disabled && clearButtonEnabled && !!modelValue
})

function onClear() {
  onInput('')
  onChange(null)
}

const onChange = (value: string) => {
  emit('change', value)
}

const onInput = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<style lang="scss">
.oc-color-input-message.oc-color-input-description {
  position: relative;

  .oc-icon {
    position: absolute;
    left: var(--oc-space-xsmall);
    top: var(--oc-space-xsmall);
  }
}

.oc-color-input {
  &-wrapper {
    max-width: 5rem !important;
  }

  &:focus {
    outline: 2px solid var(--oc-role-outline) !important;
  }

  &-message {
    min-height: $oc-font-size-default * 1.5;
  }
}
</style>
