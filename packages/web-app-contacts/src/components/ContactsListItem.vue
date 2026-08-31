<template>
  <div class="contacts-list-item flex min-w-0 w-full items-center gap-3">
    <oc-avatar :user-name="getContactDisplayName(contact)" />
    <div class="flex-1 min-w-0">
      <div class="truncate font-bold text-lg">
        <oc-filter-highlight :text="getContactDisplayName(contact)" :term="term" />
      </div>
      <div class="truncate text-sm text-role-on-surface-variant">
        <oc-filter-highlight :text="getContactPrimaryEmail(contact)" :term="term" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Contact } from '../types'
import { getContactDisplayName, getContactPrimaryEmail } from '../helpers'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const { contact, term = '' } = defineProps<{
  contact: Contact
  term?: string
}>()
</script>
