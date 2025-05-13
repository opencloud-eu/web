<template>
  <div :class="$attrs.class">
    <slot name="label">
      <label class="oc-label" :for="id">
        {{ label }}
        <span v-if="requiredMark" class="oc-text-error" aria-hidden="true">*</span>
      </label>
    </slot>
    <div class="oc-color-input-wrapper oc-position-relative">
      <input
        :id="id"
        v-bind="additionalAttributes"
        type="color"
        :aria-invalid="ariaInvalid"
        class="oc-color-input oc-input oc-rounded"
        :class="{
          'oc-color-input-danger': !!errorMessage,
          'clear-action-visible': showClearButton
        }"
        :value="modelValue"
        :disabled="disabled"
        @change="onChange(($event.target as HTMLInputElement).value)"
        @input="onInput(($event.target as HTMLInputElement).value)"
      />
      <oc-button
        v-if="showClearButton"
        class="oc-mr-xs oc-position-center-right oc-color-input-btn-clear"
        appearance="raw"
        no-hover
        @click="onClear"
      >
        <oc-icon name="close" size="small" />
      </oc-button>
    </div>
    <div
      v-if="showMessageLine"
      class="oc-color-input-message"
      :class="{
        'oc-color-input-description': !!descriptionMessage,
        'oc-color-input-danger': !!errorMessage
      }"
    >
      <oc-icon
        v-if="messageText !== null && !!descriptionMessage"
        name="information"
        size="small"
        fill-type="line"
        accessible-label="info"
        aria-hidden="true"
      />

      <span
        :id="messageId"
        :class="{
          'oc-color-input-description': !!descriptionMessage,
          'oc-color-input-danger': !!errorMessage
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
  display: flex;
  align-items: center;
  position: relative;
  padding-left: var(--oc-space-large);
  padding-top: calc(var(--oc-space-xsmall) - 2px);

  .oc-icon {
    position: absolute;
    left: var(--oc-space-xsmall);
    top: var(--oc-space-xsmall);
  }
}

.oc-color-input {
  padding-top: math.div(var(--oc-space-xsmall), 2) !important;
  padding-bottom: math.div(var(--oc-space-xsmall), 2) !important;

  &-wrapper {
    max-width: 5rem !important;
  }

  &:focus {
    border: 1px solid var(--oc-role-surface) !important;
    outline: 2px solid var(--oc-role-outline) !important;
  }

  &-description {
    color: var(--oc-role-on-surface-variant);
  }

  &-danger,
  &-danger:focus {
    border-color: var(--oc-role-error) !important;
    color: var(--oc-role-error) !important;
  }

  &-message {
    display: flex;
    align-items: center;
    margin-top: var(--oc-space-xsmall);
    min-height: $oc-font-size-default * 1.5;
  }

  &.clear-action-visible {
    padding-right: ($oc-size-icon-default * 0.7) + 7px;
  }
}
</style>
