<template>
  <div class="contacts-list-item flex min-w-0 w-full items-center gap-3">
    <oc-avatar :user-name="getContactDisplayName(contact)" />
    <div class="flex-1 min-w-0">
      <div class="truncate font-bold text-lg" v-text="getContactDisplayName(contact)" />
      <div
        class="truncate text-sm text-role-on-surface-variant"
        v-text="getContactPrimaryEmail(contact)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Contact } from '../types'
import { getContactDisplayName, getContactPrimaryEmail } from '../helpers'

const { contact } = defineProps<{
  contact: Contact
}>()
</script>
