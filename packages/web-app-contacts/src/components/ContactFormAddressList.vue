<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 font-bold" v-text="$gettext('Addresses')" />
    <div
      v-for="(address, index) in addresses"
      :key="address.key"
      class="flex items-start gap-2"
      role="group"
      :aria-label="$gettext('Address %{position}', { position: (index + 1).toString() })"
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
          :ref="(el) => setStreetInputRef(address.key, el)"
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
        class="contact-form-address-remove mt-6 shrink-0"
        appearance="raw"
        :aria-label="$gettext('Remove address %{position}', { position: (index + 1).toString() })"
        @click="removeAddress(index)"
      >
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </div>
    <div ref="addButtonWrapper">
      <oc-button appearance="raw" size="small" @click="addAddress">
        <oc-icon name="add" fill-type="line" size="small" />
        <span v-text="$gettext('Add address')" />
      </oc-button>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { nextTick, unref, useTemplateRef } from 'vue'
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

type FocusableInput = { focus: () => void }

const addButtonWrapper = useTemplateRef<HTMLElement>('addButtonWrapper')
const streetInputRefs = new Map<string, FocusableInput>()

function setStreetInputRef(key: string, el: unknown) {
  if (el) {
    streetInputRefs.set(key, el as FocusableInput)
    return
  }
  streetInputRefs.delete(key)
}

async function focusAddress(key: string | undefined) {
  await nextTick()
  const input = key ? streetInputRefs.get(key) : undefined
  if (input) {
    input.focus()
    return
  }
  unref(addButtonWrapper)?.querySelector('button')?.focus()
}

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
  const address = createEmptyAddress()
  emit('update:addresses', [...addresses, address])
  focusAddress(address.key)
}

function removeAddress(index: number) {
  // keep the focus in the list, the removed address' button is gone afterwards
  const neighbor = addresses[index - 1] || addresses[index + 1]
  emit(
    'update:addresses',
    addresses.filter((_, i) => i !== index)
  )
  focusAddress(neighbor?.key)
}
</script>
