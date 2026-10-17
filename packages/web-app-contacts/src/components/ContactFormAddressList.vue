<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 font-bold" v-text="$gettext('Addresses')" />
    <div
      v-for="(address, index) in addresses"
      :key="address.key"
      class="flex items-start gap-2"
      :data-testid="`contact-form-address-${address.key}`"
    >
      <div class="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <oc-select
          class="md:col-span-2 md:w-36"
          :model-value="contextOptions.find(({ value }) => value === address.context)"
          :label="$gettext('Type')"
          :options="contextOptions"
          option-label="label"
          :clearable="false"
          :searchable="false"
          @update:model-value="
            (option: (typeof contextOptions)[number]) =>
              updateAddress(index, { context: option.value })
          "
        />
        <oc-text-input
          class="md:col-span-2"
          :model-value="address.street"
          :label="$gettext('Street')"
          @update:model-value="(value: string) => updateAddress(index, { street: value })"
        />
        <oc-text-input
          :model-value="address.postcode"
          :label="$gettext('Postal code')"
          @update:model-value="(value: string) => updateAddress(index, { postcode: value })"
        />
        <oc-text-input
          :model-value="address.locality"
          :label="$gettext('City')"
          @update:model-value="(value: string) => updateAddress(index, { locality: value })"
        />
        <oc-text-input
          :model-value="address.region"
          :label="$gettext('State / region')"
          @update:model-value="(value: string) => updateAddress(index, { region: value })"
        />
        <oc-text-input
          :model-value="address.country"
          :label="$gettext('Country')"
          @update:model-value="(value: string) => updateAddress(index, { country: value })"
        />
      </div>
      <oc-button
        class="mt-2 shrink-0"
        appearance="raw"
        :aria-label="$gettext('Remove address')"
        @click="removeAddress(index)"
      >
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </div>
    <div>
      <oc-button appearance="raw" size="small" @click="addAddress">
        <oc-icon name="add" fill-type="line" size="small" />
        <span v-text="$gettext('Add address')" />
      </oc-button>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  createEmptyAddress,
  type ContactFormAddress,
  type ContactFormContext
} from '../helpers/contactForm'

const { addresses } = defineProps<{
  addresses: ContactFormAddress[]
}>()

const emit = defineEmits<{
  'update:addresses': [addresses: ContactFormAddress[]]
}>()

const { $gettext } = useGettext()

const contextOptions: { value: ContactFormContext; label: string }[] = [
  { value: 'private', label: $gettext('Private') },
  { value: 'work', label: $gettext('Work') },
  { value: 'other', label: $gettext('Other') }
]

function updateAddress(index: number, changes: Partial<ContactFormAddress>) {
  emit(
    'update:addresses',
    addresses.map((address, i) => (i === index ? { ...address, ...changes } : address))
  )
}

function addAddress() {
  emit('update:addresses', [...addresses, createEmptyAddress()])
}

function removeAddress(index: number) {
  emit(
    'update:addresses',
    addresses.filter((_, i) => i !== index)
  )
}
</script>
