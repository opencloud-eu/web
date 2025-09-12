<template>
  <div :class="$attrs.class">
    <slot name="label">
      <label class="inline-block mb-0.5" :for="id">
        {{ label }}
        <span v-if="requiredMark" class="text-role-on-error" aria-hidden="true">*</span>
      </label>
    </slot>
    <div class="relative">
      <oc-icon v-if="readOnly" name="lock" size="small" class="mt-2 ml-2 absolute" />
      <component
        :is="inputComponent"
        :id="id"
        v-bind="additionalAttributes"
        ref="inputRef"
        :aria-invalid="ariaInvalid"
        class="oc-text-input oc-input"
        :class="{
          'oc-text-input-danger border-role-error': !!showErrorMessage,
          'pl-6': !!readOnly,
          'pr-6': showClearButton
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
        class="pr-2 absolute top-[50%] transform-[translateY(-50%)] right-0 oc-text-input-btn-clear"
        appearance="raw"
        no-hover
        @click="onClear"
      >
        <oc-icon name="close" size="small" />
      </oc-button>
    </div>
    <div
      v-if="showMessageLine"
      class="oc-text-input-message flex align-center text-sm mt-1 min-h-4.5"
      :class="{
        'oc-text-input-description text-role-on-surface-variant relative': showDescriptionMessage,
        'oc-text-input-danger text-role-on-error focus:text-role-on-error border-role-error':
          showErrorMessage
      }"
    >
      <template v-if="showErrorMessage">
        <oc-icon
          v-if="showErrorMessage"
          name="error-warning"
          size="small"
          fill-type="line"
          aria-hidden="true"
          class="mr-1"
        />
        <span
          v-if="showErrorMessage"
          :id="messageId"
          class="oc-text-input-danger text-role-on-error focus:text-role-on-error border-role-error"
          v-text="errorMessage"
        />
      </template>
      <span
        v-else-if="showDescriptionMessage"
        :id="messageId"
        class="oc-text-input-description text-role-on-surface-variant flex items-center relative"
        v-text="descriptionMessage"
      />
    </div>
    <portal-target v-if="type === 'password'" name="app.design-system.password-policy" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, useAttrs, useTemplateRef, watch } from 'vue'
import { PasswordPolicy, uniqueId } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcTextInputPassword from '../OcTextInputPassword/OcTextInputPassword.vue'
import { PortalTarget } from 'portal-vue'
import { debounce } from 'lodash-es'

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
  errorMessageDebouncedTime?: number
  /**
   * @docs The time in milliseconds to debounce the error message visibility.
   * @default 500
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
  errorMessageDebouncedTime = 500,
  fixMessageLine = false,
  descriptionMessage,
  readOnly = false,
  requiredMark = false,
  passwordPolicy = {},
  generatePasswordMethod
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const showErrorMessage = ref(false)
const showDescriptionMessage = computed(() => {
  return !!descriptionMessage
})
const showMessageLine = computed(() => {
  return fixMessageLine || unref(showErrorMessage) || unref(showDescriptionMessage)
})
const ariaInvalid = computed(() => {
  return unref(showErrorMessage).toString()
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
  if (unref(showErrorMessage) || unref(showDescriptionMessage)) {
    additionalAttrs['aria-describedby'] = messageId.value
  }
  if (defaultValue) {
    additionalAttrs['placeholder'] = defaultValue
  }
  if (type === 'password') {
    additionalAttrs['password-policy'] = passwordPolicy
    additionalAttrs['generate-password-method'] = generatePasswordMethod
    additionalAttrs['has-error'] = unref(showErrorMessage)
  }
  // note: we spread out the attrs we don't want to be present in the resulting object
  const { change, input, focus, class: classes, ...attrs } = tmpAttrs
  return { ...attrs, ...additionalAttrs }
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
  unref(inputRef).select()
  setSelectionRange()
  emit('focus', target.value)
}
const setSelectionRange = () => {
  if (selectionRange && selectionRange.length > 1) {
    unref(inputRef).setSelectionRange(selectionRange[0], selectionRange[1])
  }
}

watch(
  [() => selectionRange, inputRef],
  async () => {
    if (!unref(inputRef)) {
      return
    }
    await nextTick()
    setSelectionRange()
  },
  { immediate: true }
)

const onStopTyping = debounce(() => {
  showErrorMessage.value = !!errorMessage
}, errorMessageDebouncedTime)

watch(
  () => modelValue,
  () => {
    onStopTyping()
  }
)

watch(
  () => errorMessage,
  () => {
    if (!errorMessage) {
      showErrorMessage.value = false
      onStopTyping.cancel?.()
    } else {
      onStopTyping()
    }
  }
)
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-input {
    @apply inline-block align-middle text-role-on-surface bg-role-surface w-full max-w-full rounded-sm p-1.5 leading-4 border border-role-outline outline-0 overflow-visible appearance-none;
  }
  .oc-input:focus {
    @apply border border-role-surface outline-2 outline-role-outline;
  }
  .oc-input:disabled {
    @apply bg-role-surface-container cursor-not-allowed;
  }
  .oc-input::placeholder {
    @apply text-role-on-surface opacity-100;
  }
}
</style>
