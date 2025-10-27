<template>
  <app-loading-spinner v-if="isLoading" />
  <div v-else>
    {{ appointment }}
  </div>
</template>

<script setup lang="ts">
import { MailBodyPart } from '../types'
import { useTask } from 'vue-concurrency'
import { computed, onMounted, ref } from 'vue'
import { AppLoadingSpinner, useClientService, useConfigStore } from '@opencloud-eu/web-pkg/src'
import { urlJoin } from '@opencloud-eu/web-client'
import ICAL from 'ical.js'

const { appointment, accountId } = defineProps<{
  appointment: MailBodyPart
  accountId: string
}>()

const clientService = useClientService()
const configStore = useConfigStore()

const icalComponent = ref<ICAL.Component>()

const isLoading = computed(() => {
  return loadAppointmentTask.isRunning || !loadAppointmentTask.last
})

const loadAppointmentTask = useTask(function* (signal) {
  const url = urlJoin(
    configStore.groupwareUrl,
    `/accounts/${accountId}/blobs/${appointment.blobId}/${encodeURIComponent(appointment.name)}`
  )

  try {
    const { data }: { data: string } = yield clientService.httpAuthenticated.get(url, {
      responseType: 'text'
    })

    const comp = new ICAL.Component(data)
    const vevent = comp.getFirstSubcomponent('vevent')
    const event = new ICAL.Event(vevent)
    const summary = event.summary
    console.log(summary)
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadAppointmentTask.perform()
})
</script>
