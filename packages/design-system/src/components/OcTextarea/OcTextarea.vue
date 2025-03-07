<template>
  <div>
    <label class="oc-label" :for="id" v-text="label" />
    <textarea
      :id="id"
      v-bind="additionalAttributes"
      ref="textareaRef"
      v-model="model"
      class="oc-textarea oc-rounded"
      :class="{
        'oc-textarea-warning': !!warningMessage,
        'oc-textarea-danger': !!errorMessage
      }"
      :aria-invalid="ariaInvalid"
    />
    <div v-if="showMessageLine" class="oc-textarea-message">
      <span
        :id="messageId"
        :class="{
          'oc-textarea-description': !!descriptionMessage,
          'oc-textarea-warning': !!warningMessage,
          'oc-textarea-danger': !!errorMessage
        }"
        v-text="messageText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, HTMLAttributes, unref, useAttrs, useTemplateRef } from 'vue'
import { uniqueId } from '../../helpers'

export interface Props {
  /**
   * @docs The ID attribute of the textarea.
   */
  id?: string
  /**
   * @docs The label of the textarea.
   */
  label: string
  /**
   * @docs The warning message to be displayed below the textarea.
   */
  warningMessage?: string
  /**
   * @docs The error message to be displayed below the textarea.
   */
  errorMessage?: string
  /**
   * @docs The description message to be displayed below the textarea.
   */
  descriptionMessage?: string
  /**
   * @docs Determines if the message line should be fixed.
   * @default false
   */
  fixMessageLine?: boolean
}

const {
  id = uniqueId('oc-textarea-'),
  label,
  warningMessage,
  errorMessage,
  descriptionMessage,
  fixMessageLine = false
} = defineProps<Props>()
const model = defineModel<string>({ default: '' })

const showMessageLine = computed(() => {
  return fixMessageLine || !!warningMessage || !!errorMessage || !!descriptionMessage
})

const messageId = computed(() => `${id}-message`)

const attrs = useAttrs()
const additionalAttributes = computed(() => {
  const additionalAttrs: Record<string, unknown> = {}
  if (!!warningMessage || !!errorMessage || !!descriptionMessage) {
    additionalAttrs['aria-describedby'] = messageId.value
  }
  return { ...attrs, ...additionalAttrs }
})

const ariaInvalid = computed(() => {
  return (!!errorMessage).toString() as HTMLAttributes['aria-invalid']
})

const messageText = computed(() => {
  if (errorMessage) {
    return errorMessage
  }
  if (warningMessage) {
    return warningMessage
  }
  return descriptionMessage
})

const textareaRef = useTemplateRef<HTMLInputElement>('textareaRef')
const focus = () => {
  unref(textareaRef).focus()
}
defineExpose({ focus })
</script>

<style lang="scss">
.oc-textarea {
  padding-bottom: var(--oc-space-xsmall);
  padding-top: var(--oc-space-xsmall);
  box-sizing: border-box;
  background: var(--oc-role-surface-container);
  border: 1px solid var(--oc-role-outline);
  margin: 0;
  max-width: 100%;
  width: 100%;
  overflow: auto;

  &:disabled {
    opacity: 0.7;
  }

  &-warning,
  &-warning:focus {
    border-color: var(--oc-color-swatch-warning-default);
    color: var(--oc-color-swatch-warning-default);
  }

  &-danger,
  &-danger:focus {
    border-color: var(--oc-color-swatch-danger-default);
    color: var(--oc-color-swatch-danger-default);
  }

  &-description {
    color: var(--oc-color-text-muted);
  }

  &-message {
    display: flex;
    align-items: center;
    margin-top: var(--oc-space-xsmall);

    min-height: $oc-font-size-default * 1.5;
  }
}
</style>
