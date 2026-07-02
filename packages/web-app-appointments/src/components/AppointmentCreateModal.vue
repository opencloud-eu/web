<template>
  <oc-modal
    v-if="isCreateModalOpen"
    element-class="appointment-create-modal"
    :title="$gettext('New appointment')"
    :hide-actions="true"
    hide-cancel-button
  >
    <template #headerActions>
      <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="closeCreateModal">
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </template>

    <template #content>
      <form class="flex min-h-0 flex-1 flex-col gap-4" @submit.prevent="submitAppointment">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="flex min-w-0 flex-col gap-1 md:col-span-2">
            <span class="text-sm font-semibold" v-text="$gettext('Title')" />
            <input
              v-model="title"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
              required
            />
          </label>

          <label class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-semibold" v-text="$gettext('Calendar')" />
            <select
              v-model="calendarId"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
              required
            >
              <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
                {{ calendar.name }}
              </option>
            </select>
          </label>

          <label class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-semibold" v-text="$gettext('Location')" />
            <input
              v-model="location"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
            />
          </label>

          <label class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-semibold" v-text="$gettext('Start date')" />
            <input
              v-model="startDate"
              type="date"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
              required
            />
          </label>

          <label class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-semibold" v-text="$gettext('Start time')" />
            <input
              v-model="startTime"
              type="time"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
              :disabled="allDay"
              required
            />
          </label>

          <label class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-semibold" v-text="$gettext('End date')" />
            <input
              v-model="endDate"
              type="date"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
              required
            />
          </label>

          <label class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-semibold" v-text="$gettext('End time')" />
            <input
              v-model="endTime"
              type="time"
              class="rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
              :disabled="allDay"
              required
            />
          </label>

          <label class="flex items-center gap-2 md:col-span-2">
            <input v-model="allDay" type="checkbox" class="size-4" />
            <span v-text="$gettext('All day')" />
          </label>

          <label class="flex min-w-0 flex-col gap-1 md:col-span-2">
            <span class="text-sm font-semibold" v-text="$gettext('Description')" />
            <textarea
              v-model="description"
              class="min-h-24 rounded border border-role-outline bg-role-surface px-3 py-2 text-role-on-surface"
            />
          </label>
        </div>

        <p v-if="error" class="m-0 text-sm text-role-error" v-text="error.message" />

        <div class="flex justify-end gap-3">
          <oc-button appearance="outline" type="button" @click="closeCreateModal">
            <span v-text="$gettext('Cancel')" />
          </oc-button>
          <oc-button appearance="filled" :disabled="isSubmitDisabled" @click="submitAppointment">
            <span v-text="$gettext('Save')" />
          </oc-button>
        </div>
      </form>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'
import { useAppointmentsStore } from '../composables/piniaStores/appointments'
import { useLoadAppointments } from '../composables/useLoadAppointments'

const accountsStore = useGroupwareAccountsStore()
const appointmentsStore = useAppointmentsStore()
const { createAppointment } = useLoadAppointments()
const { currentAccount } = storeToRefs(accountsStore)
const { calendars, error, isCreateModalOpen, selectedCalendarId, selectedDate } =
  storeToRefs(appointmentsStore)
const { closeCreateModal } = appointmentsStore

const title = ref('')
const calendarId = ref('')
const location = ref('')
const startDate = ref('')
const startTime = ref('09:00')
const endDate = ref('')
const endTime = ref('10:00')
const allDay = ref(false)
const description = ref('')

const currentAccountId = computed(() => {
  return (unref(currentAccount) as { accountId?: string } | undefined)?.accountId
})

const isSubmitDisabled = computed(() => {
  return !unref(title).trim() || !unref(calendarId) || !unref(currentAccountId)
})

watch(
  isCreateModalOpen,
  (isOpen) => {
    if (!isOpen) {
      return
    }

    const date = unref(selectedDate)
    startDate.value = toInputDate(date)
    endDate.value = toInputDate(date)
    startTime.value = '09:00'
    endTime.value = '10:00'
    calendarId.value = unref(selectedCalendarId) || unref(calendars)[0]?.id || ''
  },
  { immediate: true }
)

watch(allDay, (value) => {
  if (value) {
    startTime.value = '00:00'
    endTime.value = '23:59'
  }
})

const submitAppointment = async () => {
  const accountId = unref(currentAccountId)
  if (!accountId || unref(isSubmitDisabled)) {
    return
  }

  await createAppointment(accountId, {
    calendarId: unref(calendarId),
    title: unref(title).trim(),
    start: toIsoDateTime(unref(startDate), unref(startTime)),
    duration: toIsoDuration(
      unref(startDate),
      unref(startTime),
      unref(endDate),
      unref(endTime),
      unref(allDay)
    ),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    description: unref(description).trim() || undefined,
    location: unref(location).trim() || undefined,
    allDay: unref(allDay)
  })

  resetForm()
}

const resetForm = () => {
  title.value = ''
  location.value = ''
  description.value = ''
  allDay.value = false
}

const toInputDate = (date: Date) => {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

const toIsoDateTime = (date: string, time: string) => {
  return new Date(`${date}T${time || '00:00'}`).toISOString()
}

const toIsoDuration = (
  startDateValue: string,
  startTimeValue: string,
  endDateValue: string,
  endTimeValue: string,
  isAllDay: boolean
) => {
  const start = new Date(`${startDateValue}T${isAllDay ? '00:00' : startTimeValue || '00:00'}`)
  const end = new Date(`${endDateValue}T${isAllDay ? '23:59' : endTimeValue || '00:00'}`)
  const durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 15)
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}`
}
</script>

<style>
.appointment-create-modal {
  width: min(90vw, 44rem);
  max-width: 44rem;
}
</style>
