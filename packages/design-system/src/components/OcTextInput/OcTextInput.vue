<template>
  <div :class="$attrs.class">
    <slot name="label">
      <label class="oc-label" :for="id">
        {{ label }}
        <span v-if="requiredMark" class="oc-text-error" aria-hidden="true">*</span>
      </label>
    </slot>
    <div class="oc-position-relative">
      <oc-icon
        v-if="readOnly"
        name="lock"
        size="small"
        class="oc-mt-s oc-ml-s oc-position-absolute"
      />
      <component
        :is="inputComponent"
        :id="id"
        v-bind="additionalAttributes"
        ref="inputRef"
        :aria-invalid="ariaInvalid"
        class="oc-text-input oc-input oc-rounded"
        :class="{
          'oc-text-input-danger': !!errorMessage,
          'oc-pl-l': !!readOnly,
          'clear-action-visible': showClearButton
        }"
        :type="type"
        :value="modelValue"
        :disabled="disabled || readOnly"
        v-on="additionalListeners"
        @change="onChange(($event.target as HTMLInputElement).value)"
        @input="onInput(($event.target as HTMLInputElement).value)"
        @password-challenge-completed="$emit('passwordChallengeCompleted')"
        @password-challenge-failed="$emit('passwordChallengeFailed')"
        @focus="onFocus($event.target)"
      />
      <oc-button
        v-if="showClearButton"
        :aria-label="clearButtonAccessibleLabelValue"
        class="oc-pr-s oc-position-center-right oc-text-input-btn-clear"
        appearance="raw"
        no-hover
        @click="onClear"
      >
        <oc-icon name="close" size="small" />
      </oc-button>
    </div>
    <div
      v-if="showMessageLine"
      class="oc-text-input-message oc-text-small"
      :class="{
        'oc-text-input-description': !!descriptionMessage,
        'oc-text-input-danger': !!errorMessage
      }"
    >
      <oc-icon
        v-if="!!errorMessage"
        name="error-warning"
        size="small"
        fill-type="line"
        aria-hidden="true"
        class="oc-mr-xs"
      />

      <span
        :id="messageId"
        :class="{
          'oc-text-input-description': !!descriptionMessage,
          'oc-text-input-danger': !!errorMessage
        }"
        v-text="messageText"
      />
    </div>
    <portal-target v-if="type === 'password'" name="app.design-system.password-policy" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, useAttrs, useTemplateRef, unref, watch } from 'vue'
import { uniqueId } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcTextInputPassword from '../OcTextInputPassword/OcTextInputPassword.vue'
import { PasswordPolicy } from '../../helpers'
import { PortalTarget } from 'portal-vue'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  /**
   * @docs The element ID of the input.
   */
  id?: string
  /**
   * @docs The type of the input.
   * @default text
   */
  type?: 'text' | 'number' | 'email' | 'password' | 'date'
  /**
   * @docs The value of the input.
   */
  modelValue?: string
  /**
   * @docs The selection range of the input.
   */
  selectionRange?: [number, number]
  /**
   * @docs Determines if the input should have a clear button.
   * @default false
   */
  clearButtonEnabled?: boolean
  /**
   * @docs The accessible label of the clear button.
   */
  clearButtonAccessibleLabel?: string
  /**
   * @docs The default value of the input.
   */
  defaultValue?: string
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
   * @docs Determines if the input is read-only.
   * @default false
   */
  readOnly?: boolean
  /**
   * @docs Determines if a required mark (*) should be displayed next to the label.
   * @default false
   */
  requiredMark?: boolean
  /**
   * @docs The password policy if the `type` is set to `password`. Please refer to the component source for the `PasswordPolicy` type definition.
   */
  passwordPolicy?: PasswordPolicy
  /**
   * @docs The method to generate a password if the `type` is set to `password`.
   */
  generatePasswordMethod?: (...args: unknown[]) => string
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
  /**
   * @docs Emitted when the input has been focused.
   */
  (e: 'focus', value: string): void
  /**
   * @docs Emitted when the password challenge has been completed successfully.
   */
  (e: 'passwordChallengeCompleted'): void
  /**
   * @docs Emitted when the password challenge has failed.
   */
  (e: 'passwordChallengeFailed'): void
}

export interface Slots {
  /**
   * @docs Can be used to overwrite the default rendering of the label.
   */
  label?: () => unknown
}

const {
  id = uniqueId('oc-textinput-'),
  type = 'text',
  modelValue = '',
  selectionRange,
  clearButtonEnabled = false,
  clearButtonAccessibleLabel = '',
  defaultValue,
  disabled = false,
  label,
  errorMessage,
  fixMessageLine = false,
  descriptionMessage,
  readOnly = false,
  requiredMark = false,
  passwordPolicy = {},
  generatePasswordMethod
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const showMessageLine = computed(() => {
  return fixMessageLine || !!errorMessage || !!descriptionMessage
})

const messageId = computed(() => `${id}-message`)

const additionalListeners = computed(() => {
  if (type === 'password') {
    return { passwordGenerated: onInput }
  }
  return {}
})

const tmpAttrs = useAttrs()
const additionalAttributes = computed(() => {
  const additionalAttrs: Record<string, unknown> = {}
  if (!!errorMessage || !!descriptionMessage) {
    additionalAttrs['aria-describedby'] = messageId.value
  }
  if (defaultValue) {
    additionalAttrs['placeholder'] = defaultValue
  }
  if (type === 'password') {
    additionalAttrs['password-policy'] = passwordPolicy
    additionalAttrs['generate-password-method'] = generatePasswordMethod
    additionalAttrs['has-error'] = !!errorMessage
  }
  // note: we spread out the attrs we don't want to be present in the resulting object
  const { change, input, focus, class: classes, ...attrs } = tmpAttrs
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

const clearButtonAccessibleLabelValue = computed(() => {
  return clearButtonAccessibleLabel || 'Clear input'
})

const inputComponent = computed(() => {
  return type === 'password' ? OcTextInputPassword : 'input'
})

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const focus = () => {
  unref(inputRef).focus()
}
defineExpose({ focus })

function onClear() {
  focus()
  onInput('')
  onChange(null)
}

const onChange = (value: string) => {
  emit('change', value)
}

const onInput = (value: string) => {
  emit('update:modelValue', value)
}

const onFocus = async (target: HTMLInputElement) => {
  await nextTick()
  setSelection()
  emit('focus', target.value)
}
const setSelection = () => {
  if (!unref(inputRef)) {
    return
  }
  if (selectionRange && selectionRange.length > 1) {
    unref(inputRef).setSelectionRange(selectionRange[0], selectionRange[1])
  } else {
    unref(inputRef).select()
  }
}
watch(
  [() => selectionRange, inputRef],
  async () => {
    await nextTick()
    setSelection()
  },
  { immediate: true }
)
</script>

<style lang="scss">
.oc-text-input-message.oc-text-input-description {
  display: flex;
  align-items: center;
  position: relative;
}

.oc-text-input {
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
