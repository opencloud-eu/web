<template>
  <app-loading-spinner v-if="isLoading" />
  <oc-card
    v-else
    class="bg-role-surface-container rounded-xl mt-4"
    :header-class="['items-start', 'px-3', collapsed ? 'py-2' : 'pt-2 pb-3']"
    :body-class="['px-3', 'pt-1', collapsed ? 'hidden' : '']"
    appearance="outlined"
  >
    <template #header>
      <div class="flex justify-between w-full">
        <div>
          <span class="font-bold text-lg mt-1"><span v-text="icalEvent.summary" /></span>
          <div class="text-sm text-role-on-surface-variant flex items-center gap-2 mt-1">
            <span v-text="startDate" />
            <span v-text="'·'" class="text-xl" />
            <span>
              <span v-text="startTime" />
              <span v-text="'-'" />
              <span v-text="endTime" />
            </span>
          </div>
        </div>
        <oc-button
          class="self-start mt-1"
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
      <div v-if="icalEvent.location" class="flex items-center mt-3 gap-2">
        <oc-icon name="map-pin" size="small" fill-type="line" class="" />
        <span v-text="icalEvent.location" class="truncate" />
      </div>
      <div class="grid grid-cols-[auto_1fr] gap-x-2 items-start mt-3">
        <oc-icon name="user" size="small" fill-type="line" />
        <span class="font-medium" v-text="$gettext('Organizer')" />
        <div class="col-start-2 text-sm">
          <span v-text="icalEvent.organizer.replace(/^mailto:/i, '')" />
        </div>
      </div>
      <div
        v-if="attendees && attendees.length"
        class="grid grid-cols-[auto_1fr] gap-x-2 items-start mt-3"
      >
        <oc-icon name="group" size="small" fill-type="line" />
        <span class="font-medium" v-text="$gettext('Participants')" />
        <oc-list class="col-start-2 mt-1 [&>li:not(:first-child)]:mt-1">
          <li
            v-for="attendee in (attendees || []).slice(0, MAX_ATTENDEES_DISPLAY_COUNT)"
            :key="attendee.email || attendee.name"
            class="text-sm"
          >
            <span v-if="attendee.name" class="mr-1" v-text="attendee.name"></span>
            <span
              v-if="attendee.email"
              v-text="attendee.name ? `<${attendee.email}>` : attendee.email"
            ></span>
          </li>
        </oc-list>
        <div v-if="attendees.length > MAX_ATTENDEES_DISPLAY_COUNT" class="col-start-2 text-sm mt-1">
          <span v-text="attendeeOverflowLabel" />
        </div>
      </div>
      <div v-if="icalEvent.description" class="flex gap-2 mt-3">
        <oc-icon name="sticky-note" size="small" fill-type="line" class="self-starts" />
        <span v-text="icalEvent.description" class="grid grid-cols-[auto_1fr]" />
      </div>
      <div class="mt-6">
        <oc-button class="w-full" appearance="outline" size="large" @click="download">
          <oc-icon class="mr-2" size="medium" name="download-2" fill-type="line" />
          <span v-text="$gettext('Download')" />
        </oc-button>
      </div>
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
  console.log('INFO!!!:', icalEvent.startDate.toJSDate())
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

    const jcalData = ICAL.parse(data)
    const comp = new ICAL.Component(jcalData)

    const vevent = comp.getFirstSubcomponent('vevent')

    const event = new ICAL.Event(vevent)
    icalEvent = event
    console.log(icalEvent)
    console.log('attendees: ', icalEvent.attendees)
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadAppointmentTask.perform()
})
</script>
