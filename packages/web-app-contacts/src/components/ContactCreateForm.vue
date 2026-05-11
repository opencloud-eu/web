<template>
  <div class="flex flex-col gap-4">
    <oc-text-input
      :model-value="modelValue.firstName"
      :label="$gettext('First name')"
      @update:model-value="(value: string) => updateField('firstName', value)"
    />
    <oc-text-input
      :model-value="modelValue.lastName"
      :label="$gettext('Last name')"
      @update:model-value="(value: string) => updateField('lastName', value)"
    />
    <oc-text-input
      :model-value="modelValue.email"
      type="email"
      :label="$gettext('E-Mail')"
      :error-message="
        isContactEmailInvalid(modelValue.email) ? $gettext('Please enter a valid email') : ''
      "
      :fix-message-line="false"
      @update:model-value="(value: string) => updateField('email', value)"
    />
    <oc-text-input
      :model-value="modelValue.phone"
      type="text"
      :label="$gettext('Phone number')"
      @update:model-value="(value: string) => updateField('phone', value)"
    />
  </div>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import { type ContactFormState, isContactEmailInvalid } from '../helpers/contactForm'

const { $gettext } = useGettext()

const props = defineProps<{
  modelValue: ContactFormState
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ContactFormState): void
}>()

const updateField = <K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
