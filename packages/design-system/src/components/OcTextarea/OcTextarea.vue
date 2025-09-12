<template>
  <div>
    <label class="inline-block mb-0.5" :for="id" v-text="label" />
    <textarea
      :id="id"
      v-bind="additionalAttributes"
      ref="textareaRef"
      v-model="model"
      class="oc-textarea"
      :class="{
        'oc-textarea-danger text-role-on-error focus:text-role-on-error border-role-error':
          !!errorMessage
      }"
      :aria-invalid="ariaInvalid"
    />
    <div v-if="showMessageLine" class="oc-textarea-message flex items-center mt-1 min-h-4.5">
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
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-textarea {
    @apply rounded-sm m-0 py-1 border border-role-outline w-full max-w-full overflow-auto opacity-70 px-2 align-top bg-role-surface;
  }
  .oc-textarea::placeholder {
    @apply opacity-100;
  }
}
</style>
