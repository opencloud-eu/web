<template>
  <div class="contacts-list-item flex items-center gap-3 px-4 py-3">
    <oc-avatar :user-name="avatarName" />
    <div class="flex-1">
      <div class="truncate font-bold text-lg" v-text="displayName" />
      <div class="truncate text-sm text-role-on-surface-variant" v-text="displayEmail" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Contact } from '../types'
import { getContactNameParts } from '../helpers/contactName'

const { contact } = defineProps<{
  contact: Contact
}>()

const displayName = computed(() => {
  const nameParts = getContactNameParts(contact)
  return `${nameParts.givenName} ${nameParts.surname}`
})

const displayEmail = computed(() => {
  return Object.values(contact.emails || {}).find((entry) => entry?.address)?.address
})

const avatarName = computed(() => {
  return displayName.value || displayEmail.value
})
</script>
