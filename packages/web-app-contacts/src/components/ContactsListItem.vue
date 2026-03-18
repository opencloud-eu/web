<template>
  <div class="contacts-list-item flex items-center gap-3 px-4 py-3">
    <oc-avatar :user-name="avatarName" :width="36" />
    <div class="flex-1">
      <div class="truncate font-semibold" v-text="displayName" />
      <div class="truncate text-sm text-role-on-surface-variant" v-text="displayEmail" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Contact } from '../types'

const { contact } = defineProps<{
  contact: Contact
}>()

const displayName = computed(() => {
  const nameParts =
    contact.name?.components
      ?.map((component) => component.value?.trim())
      .filter((value): value is string => Boolean(value)) || []

  return nameParts.join(' ')
})

const displayEmail = computed(() => {
  return Object.values(contact.emails || {}).find((entry) => entry?.address)?.address || ''
})

const avatarName = computed(() => {
  return displayName.value || displayEmail.value || contact.id
})
</script>
