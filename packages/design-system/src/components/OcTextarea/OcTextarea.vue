<template>
  <div>
    <label class="oc-label" :for="id" v-text="label" />
    <textarea
      :id="id"
      v-bind="additionalAttributes"
      ref="textareaRef"
      v-model="model"
      class="oc-textarea rounded-sm m-0 py-1 border border-role-outline"
      :class="{
        'oc-textarea-danger text-role-on-error focus:text-role-on-error border-role-error':
          !!errorMessage
      }"
      :aria-invalid="ariaInvalid"
    />
    <div v-if="showMessageLine" class="oc-textarea-message flex items-center mt-1">
      <span
        :id="messageId"
        :class="{
          'oc-textarea-description text-role-on-surface-variant': !!descriptionMessage,
          'oc-textarea-danger text-role-on-error focus:text-role-on-error border-role-error':
            !!errorMessage
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
  errorMessage,
  descriptionMessage,
  fixMessageLine = false
} = defineProps<Props>()
const model = defineModel<string>({ default: '' })

const showMessageLine = computed(() => {
  return fixMessageLine || !!errorMessage || !!descriptionMessage
})

const messageId = computed(() => `${id}-message`)

const attrs = useAttrs()
const additionalAttributes = computed(() => {
  const additionalAttrs: Record<string, unknown> = {}
  if (!!errorMessage || !!descriptionMessage) {
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
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  overflow: auto;

  &:disabled {
    opacity: 0.7;
  }

  &-message {
    min-height: $oc-font-size-default * 1.5;
  }
}
</style>
