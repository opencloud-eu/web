<template>
  <div class="flex flex-col gap-6">
    <fieldset class="flex flex-col gap-4">
      <legend class="mb-2 font-bold" v-text="$gettext('Name')" />
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
        :model-value="modelValue.nickname"
        :label="$gettext('Nickname')"
        @update:model-value="(value: string) => updateField('nickname', value)"
      />
    </fieldset>

    <ContactFormEntryList
      :entries="modelValue.emails"
      :context-options="emailContextOptions"
      :create-entry="createEmptyEmail"
      :title="$gettext('Email addresses')"
      :input-label="$gettext('Email')"
      :add-label="$gettext('Add email address')"
      :get-row-label="
        (position: number) =>
          $gettext('Email address %{position}', { position: position.toString() })
      "
      :get-remove-label="
        (position: number) =>
          $gettext('Remove email address %{position}', { position: position.toString() })
      "
      input-type="email"
      :get-error-message="getEmailErrorMessage"
      @update:entries="(value: ContactFormEmail[]) => updateField('emails', value)"
    />

    <ContactFormEntryList
      :entries="modelValue.phones"
      :context-options="phoneContextOptions"
      :create-entry="createEmptyPhone"
      :title="$gettext('Phone numbers')"
      :input-label="$gettext('Phone number')"
      :add-label="$gettext('Add phone number')"
      :get-row-label="
        (position: number) =>
          $gettext('Phone number %{position}', { position: position.toString() })
      "
      :get-remove-label="
        (position: number) =>
          $gettext('Remove phone number %{position}', { position: position.toString() })
      "
      @update:entries="(value: ContactFormPhone[]) => updateField('phones', value)"
    />

    <ContactFormAddressList
      :addresses="modelValue.addresses"
      @update:addresses="(value: ContactFormAddress[]) => updateField('addresses', value)"
    />

    <fieldset class="flex flex-col gap-4">
      <legend class="mb-2 font-bold" v-text="$gettext('Organization')" />
      <oc-text-input
        :model-value="modelValue.organization"
        :label="$gettext('Organization')"
        @update:model-value="(value: string) => updateField('organization', value)"
      />
      <oc-text-input
        :model-value="modelValue.department"
        :label="$gettext('Department')"
        @update:model-value="(value: string) => updateField('department', value)"
      />
      <oc-text-input
        :model-value="modelValue.jobTitle"
        :label="$gettext('Job title')"
        @update:model-value="(value: string) => updateField('jobTitle', value)"
      />
    </fieldset>

    <oc-textarea
      :model-value="modelValue.note"
      :label="$gettext('Note')"
      @update:model-value="(value: string) => updateField('note', value)"
    />
  </div>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import ContactFormEntryList from './ContactFormEntryList.vue'
import ContactFormAddressList from './ContactFormAddressList.vue'
import {
  createEmptyEmail,
  createEmptyPhone,
  isContactEmailInvalid,
  type ContactFormAddress,
  type ContactFormContext,
  type ContactFormEmail,
  type ContactFormPhone,
  type ContactFormPhoneContext,
  type ContactFormState
} from '../helpers/contactForm'

const { modelValue } = defineProps<{
  modelValue: ContactFormState
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ContactFormState]
}>()

const { $gettext } = useGettext()

const emailContextOptions: { value: ContactFormContext; label: string }[] = [
  { value: 'private', label: $gettext('Private') },
  { value: 'work', label: $gettext('Work') },
  { value: 'other', label: $gettext('Other') }
]

const phoneContextOptions: { value: ContactFormPhoneContext; label: string }[] = [
  { value: 'mobile', label: $gettext('Mobile') },
  ...emailContextOptions
]

function getEmailErrorMessage(value: string) {
  return isContactEmailInvalid(value) ? $gettext('Please enter a valid email') : ''
}

function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
  emit('update:modelValue', { ...modelValue, [key]: value })
}
</script>
