<template>
  <oc-list>
    <li v-for="appointment in appointments" :key="appointment.partId">
      <MailAppointmentItem :account-id="accountId" :appointment="appointment" />
    </li>
  </oc-list>
</template>

<script setup lang="ts">
import { MailBodyPart } from '../types'
import MailAppointmentItem from './MailAppointmentItem.vue'

const { appointments } = defineProps<{
  appointments: MailBodyPart[]
  accountId: string
}>()
</script>
