<template>
  <div>
    <slot name="label">
      <label class="oc-label" :for="id">
        {{ label }}
        <span v-if="requiredMark" class="oc-text-small" aria-hidden="true">*</span>
      </label>
    </slot>
    <div class="oc-flex oc-flex-middle">
      <input
        :id="id"
        v-bind="additionalAttributes"
        ref="inputRef"
        :aria-invalid="ariaInvalid"
        class="oc-invisible oc-file-input"
        type="file"
        :value="inputValue"
        :multiple="multiple"
        :accept="fileTypes"
        @change="onChange(($event.target as HTMLInputElement).value)"
        @focus="onFocus"
      />
      <oc-button
        ref="inputBtnRef"
        :class="{
          'oc-file-input-danger': !!errorMessage
        }"
        :disabled="disabled"
        color-role="secondary"
        appearance="outline"
        class="oc-file-input-button oc-text-input-btn oc-pr-s"
        @click="addFiles"
      >
        {{ $ngettext('Select file', 'Select files', multiple ? 2 : 1) }}
      </oc-button>
      <div class="oc-file-input-files oc-rounded oc-ml-s">
        <div
          v-if="inputRef?.files?.length"
          class="oc-py-xs oc-px-s oc-text-small oc-flex oc-flex-middle"
        >
          {{ fileNames }}
          <oc-button
            v-if="clearButtonEnabled && inputValue"
            appearance="raw"
            class="oc-file-input-clear raw-hover-surface oc-p-xs oc-ml-xs"
            :aria-label="$gettext('Clear input')"
            @click="onClear"
          >
            <oc-icon name="close" size="small" />
          </oc-button>
        </div>
      </div>
    </div>
    <div
      v-if="showMessageLine"
      class="oc-file-input-message oc-mt-s oc-flex oc-flex-middle"
      :class="{
        'oc-file-input-description': !!descriptionMessage,
        'oc-file-input-danger': !!errorMessage
      }"
    >
      <oc-icon
        v-if="messageText !== null && !!descriptionMessage"
        name="information"
        size="small"
        class="oc-mr-xs"
        fill-type="line"
        accessible-label="info"
        aria-hidden="true"
      />

      <span
        :id="messageId"
        :class="{
          'oc-file-input-description': !!descriptionMessage,
          'oc-file-input-danger': !!errorMessage
        }"
        v-text="messageText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, useAttrs, useTemplateRef, unref, ref } from 'vue'
import { uniqueId } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  /**
   * @docs The label of the input element.
   */
  label: string
  /**
   * @docs The element ID of the input.
   */
  id?: string
  /**
   * @docs The file types that the input should accept. E.g. 'image/*, .pdf'.
   * @default ''
   */
  fileTypes?: string
  /**
   * @docs Determines if the input should accept multiple files.
   * @default false
   */
  multiple?: boolean
  /**
   * @docs Determines if the input should have a clear button. Only gets displayed if the input has a value.
   * @default true
   */
  clearButtonEnabled?: boolean
  /**
   * @docs Determines if the input is disabled.
   * @default false
   */
  disabled?: boolean
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
   * @docs Emitted when the value of the input has updated.
   */
  (e: 'update:modelValue', value: FileList): void
  /**
   * @docs Emitted when the input has been focused.
   */
  (e: 'focus', value: HTMLElement): void
}

export interface Slots {
  /**
   * @docs Can be used to overwrite the default rendering of the label.
   */
  label?: () => unknown
}

const {
  label,
  id = uniqueId('oc-fileinput-'),
  fileTypes = '',
  multiple = false,
  clearButtonEnabled = true,
  disabled = false,
  errorMessage = '',
  fixMessageLine = false,
  descriptionMessage = '',
  requiredMark = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const inputValue = ref('')

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

  return { ...tmpAttrs, ...additionalAttrs }
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

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const inputBtnRef = useTemplateRef<HTMLElement>('inputBtnRef')

const focus = () => {
  unref(inputRef).focus()
}
defineExpose({ focus })

const fileNames = computed(() => {
  if (unref(inputRef)?.files) {
    const files = Array.from(unref(inputRef).files)
    return files.map((file) => file.name).join(', ')
  }
  return ''
})

const addFiles = () => {
  if (unref(inputRef)) {
    unref(inputRef).click()
  }
}

const onClear = () => {
  emit('update:modelValue', null)
  unref(inputRef).value = null
  inputValue.value = ''
}

const onChange = (value: string) => {
  emit('update:modelValue', unref(inputRef).files)
  inputValue.value = value
}

const onFocus = async () => {
  await nextTick()
  unref(inputBtnRef).focus()
  emit('focus', unref(inputBtnRef))
}
</script>

<style scoped lang="scss">
.oc-file-input {
  border: 0;
  padding: 0;
  width: 0;
  height: 0;

  &-files {
    background-color: var(--oc-role-surface-container);
  }

  &-danger,
  &-danger:focus {
    color: var(--oc-role-error) !important;
  }
}
</style>
