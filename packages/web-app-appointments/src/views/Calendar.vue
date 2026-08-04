<template>
  <div class="relative h-full">
    <MonthView
      :days="monthDays"
      :current-month="currentMonth"
      :appointments="appointments"
      :appointments-by-day="appointmentsByDay"
      :is-loading="isLoading"
      :error="error"
      @previous="onPreviousMonth"
      @next="onNextMonth"
      @today="onToday"
      @select-date="setSelectedDate"
    />
  </div>
</template>

<script setup lang="ts">
import {
  queryItemAsString,
  useClientService,
  useGroupwareAccountsStore,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
import { computed, onMounted, ref, unref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import MonthView from '../components/MonthView.vue'
import { useAppointmentsStore } from '../composables/piniaStores/appointments'
import { useLoadAppointments } from '../composables/useLoadAppointments'
import { formatDateForApi, getMonthGridDays, getMonthGridRange } from '../helpers/date'

defineOptions({
  name: 'AppointmentsApp'
})

const accountsStore = useGroupwareAccountsStore()
const appointmentsStore = useAppointmentsStore()
const { loadCurrentAccount } = accountsStore
const { httpAuthenticated } = useClientService()
const { loadAppointments, loadCalendars } = useLoadAppointments()

const { currentAccount } = storeToRefs(accountsStore)
const { appointments, appointmentsByDay, currentMonth, selectedCalendarIds, isLoading, error } =
  storeToRefs(appointmentsStore)
const { goToNextMonth, goToPreviousMonth, goToToday, setSelectedDate } = appointmentsStore

const currentAccountIdQuery = useRouteQuery('accountId')
const loadedAccountId = ref<string>()

const monthDays = computed(() => getMonthGridDays(unref(currentMonth)))

const visibleRange = computed(() => {
  const range = getMonthGridRange(unref(currentMonth))
  return {
    start: formatDateForApi(range.start),
    end: formatDateForApi(range.end)
  }
})

const currentAccountId = computed(() => {
  return unref(currentAccount)?.accountId
})

function ignoreLoadError(): void {}

async function loadVisibleAppointments() {
  appointmentsStore.setVisibleDateRange(unref(visibleRange))

  if (!unref(currentAccountId)) {
    appointmentsStore.setError(null)
    appointmentsStore.setAppointments([])
    return
  }

  if (!unref(selectedCalendarIds).length) {
    appointmentsStore.setError(null)
    appointmentsStore.setAppointments([])
    return
  }

  await loadAppointments(unref(currentAccountId), unref(visibleRange), unref(selectedCalendarIds))
}

async function loadAccountCalendars() {
  const accountId = unref(currentAccountId)
  loadedAccountId.value = undefined

  if (!accountId) {
    appointmentsStore.setCalendars([])
    appointmentsStore.setAppointments([])
    return
  }

  await loadCalendars(accountId)
  if (unref(currentAccountId) !== accountId) {
    return
  }

  loadedAccountId.value = accountId
  await loadVisibleAppointments()
}

function onPreviousMonth() {
  goToPreviousMonth()
}

function onNextMonth() {
  goToNextMonth()
}

function onToday() {
  goToToday()
}

watch([visibleRange, selectedCalendarIds], () => {
  if (unref(loadedAccountId) !== unref(currentAccountId)) {
    return
  }

  loadVisibleAppointments().catch(ignoreLoadError)
})

watch(currentAccountId, (accountId) => {
  currentAccountIdQuery.value = accountId || null
  loadAccountCalendars().catch(ignoreLoadError)
})

onMounted(() => {
  loadCurrentAccount({
    client: httpAuthenticated,
    query: queryItemAsString(unref(currentAccountIdQuery)) || undefined
  }).catch((error) => {
    appointmentsStore.setCalendarError(error instanceof Error ? error : new Error(String(error)))
  })
})
</script>
