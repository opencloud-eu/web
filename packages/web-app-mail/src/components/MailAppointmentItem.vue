<template>
  <app-loading-spinner v-if="isLoading" />
  <oc-card
    v-else
    class="bg-role-surface-container rounded-xl mt-4"
    :header-class="['px-4', collapsed ? 'pb-4' : '']"
    :body-class="[collapsed ? 'hidden' : '']"
  >
    <template #header>
      <div class="flex justify-between w-full text-role-on-surface-variant">
        <div>
          <span class="font-bold text-lg" v-text="icalEvent.summary" />
          <div class="text-sm mt-1">
            <span v-text="startDate" />
            <span v-text="'·'" />
            <span>
              <span v-text="startTime" />
              <span v-text="'-'" />
              <span v-text="endTime" />
            </span>
          </div>
        </div>
        <oc-button
          appearance="raw"
          no-hover
          :aria-expanded="!collapsed"
          :aria-label="$gettext('Toggle details')"
          @click="collapsed = !collapsed"
        >
          <oc-icon :name="collapsed ? 'arrow-down-s' : 'arrow-up-s'" fill-type="line" />
        </oc-button>
      </div>
    </template>
    <div class="mail-appointment-list-body text-role-on-surface-variant">
      <div v-if="icalEvent.location" class="flex items-center gap-2">
        <oc-icon name="map-pin" size="small" fill-type="line" />
        <span class="truncate" v-text="icalEvent.location" />
      </div>
      <div class="grid grid-cols-[auto_1fr] gap-x-2 mt-3">
        <oc-icon name="user" size="small" fill-type="line" />
        <span class="font-medium" v-text="$gettext('Organizer')" />
        <div class="col-start-2 text-sm">
          <span v-text="icalEvent.organizer.replace(/^mailto:/i, '')" />
        </div>
      </div>
      <div v-if="attendees && attendees.length" class="grid grid-cols-[auto_1fr] gap-x-2 mt-3">
        <oc-icon name="group" size="small" fill-type="line" />
        <span class="font-medium" v-text="$gettext('Participants')" />
        <oc-list class="col-start-2">
          <li
            v-for="attendee in (attendees || []).slice(0, MAX_ATTENDEES_DISPLAY_COUNT)"
            :key="attendee.email || attendee.name"
            class="text-sm mt-1"
          >
            <span v-text="attendee.email || attendee.name"></span>
          </li>
        </oc-list>
        <div v-if="attendees.length > MAX_ATTENDEES_DISPLAY_COUNT" class="col-start-2 text-sm mt-1">
          <span v-text="attendeeOverflowLabel" />
        </div>
      </div>
      <div v-if="icalEvent.description" class="flex gap-2 mt-3">
        <oc-icon name="sticky-note" size="small" fill-type="line" />
        <span class="grid grid-cols-[auto_1fr]" v-text="icalEvent.description" />
      </div>
      <oc-button class="w-full mt-4" appearance="outline" size="large" @click="download">
        <oc-icon size="medium" name="download-2" fill-type="line" />
        <span v-text="$gettext('Download')" />
      </oc-button>
    </div>
  </oc-card>
</template>

<script setup lang="ts">
import { MailBodyPart } from '../types'
import { useTask } from 'vue-concurrency'
import { computed, onMounted, ref, unref } from 'vue'
import {
  AppLoadingSpinner,
  formatDateFromJSDate,
  useClientService,
  useConfigStore,
  useMessages
} from '@opencloud-eu/web-pkg/src'
import { urlJoin } from '@opencloud-eu/web-client'
import ICAL from 'ical.js'
import { useGettext } from 'vue3-gettext'
import { DateTime } from 'luxon'

const { appointment, accountId } = defineProps<{
  appointment: MailBodyPart
  accountId: string
}>()

const clientService = useClientService()
const configStore = useConfigStore()
const { $gettext } = useGettext()
const { showErrorMessage } = useMessages()
const { current: currentLanguage } = useGettext()

const MAX_ATTENDEES_DISPLAY_COUNT = 5
const collapsed = ref(true)

let icalEvent: ICAL.Event = null

const isLoading = computed(() => {
  return loadAppointmentTask.isRunning || !loadAppointmentTask.last
})

const startDate = computed(() => {
  return formatDateFromJSDate(icalEvent.startDate.toJSDate(), currentLanguage, DateTime.DATE_MED)
})

const startTime = computed(() => {
  return formatDateFromJSDate(icalEvent.startDate.toJSDate(), currentLanguage, DateTime.TIME_SIMPLE)
})

const endTime = computed(() => {
  return formatDateFromJSDate(icalEvent.endDate.toJSDate(), currentLanguage, DateTime.TIME_SIMPLE)
})

const attendeeOverflow = computed(() =>
  Math.max(attendees.value.length - MAX_ATTENDEES_DISPLAY_COUNT, 0)
)

const attendeeOverflowLabel = computed(() =>
  unref(attendeeOverflow)
    ? $gettext('+%{attendeeCount} more', { attendeeCount: unref(attendeeOverflow).toString() })
    : ''
)

const attendees = computed(() => {
  return icalEvent.component
    .getAllProperties('attendee')
    .map((att) => ({
      email: att
        .getFirstValue()
        .toString()
        .replace(/^mailto:/i, ''),
      name: att.getParameter('cn') || null,
      role: att.getParameter('role') || null,
      status: att.getParameter('parstat') || null,
      cutype: att.getParameter('cutype') || null
    }))
    .filter((a) => (a.email || a.name) && a.cutype != 'RESOURCE')
})

const download = async () => {
  const url = urlJoin(
    configStore.groupwareUrl,
    `/accounts/${accountId}/blobs/${appointment.blobId}/${encodeURIComponent(appointment.name)}`
  )

  try {
    const { data }: { data: Blob } = await clientService.httpAuthenticated.get(url, {
      responseType: 'blob'
    })

    const objectUrl = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = appointment.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to download %{name}', { name: appointment.name }),
      errors: [e]
    })
  }
}

const loadAppointmentTask = useTask(function* (signal) {
  const url = urlJoin(
    configStore.groupwareUrl,
    `/accounts/${accountId}/blobs/${appointment.blobId}/${encodeURIComponent(appointment.name)}?type=${appointment.type}`
  )

  try {
    const { data }: { data: string } = yield clientService.httpAuthenticated.get(url, {
      responseType: 'text'
    })

    console.log('ical', data)

    const jcalData = ICAL.parse(data)
    const comp = new ICAL.Component(jcalData)

    const vevent = comp.getFirstSubcomponent('vevent')

    const event = new ICAL.Event(vevent)
    icalEvent = event
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadAppointmentTask.perform()
})
</script>
