<template>
  <div class="relative h-full">
    <MonthView
      :days="monthDays"
      :current-month="currentMonth"
      :visible-occurrences="visibleOccurrences"
      :occurrences-by-day="occurrencesByDay"
      :calendar-color-by-id="calendarColorById"
      :is-loading="isCalendarLoading"
      :error="calendarLoadError"
      @previous="onPreviousMonth"
      @next="onNextMonth"
      @today="onToday"
      @select-date="setSelectedDate"
      @select-appointment="setSelectedOccurrence"
    />
    <AppointmentDetailsModal
      v-if="selectedOccurrence"
      :occurrence="selectedOccurrence"
      :calendar="selectedOccurrenceCalendar"
      @close="setSelectedOccurrence(null)"
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
import AppointmentDetailsModal from '../components/AppointmentDetailsModal.vue'
import { useAppointmentsStore } from '../composables/piniaStores/appointments'
import { useLoadAppointments } from '../composables/useLoadAppointments'

defineOptions({
  name: 'AppointmentsApp'
})

const accountsStore = useGroupwareAccountsStore()
const appointmentsStore = useAppointmentsStore()
const { loadCurrentAccount } = accountsStore
const { httpAuthenticated } = useClientService()
const { loadAppointments, loadCalendars } = useLoadAppointments()

const { currentAccount, isLoading: isLoadingAccounts } = storeToRefs(accountsStore)
const {
  calendarError,
  calendarColorById,
  calendarsById,
  currentMonthRange,
  currentMonth,
  error,
  isLoading: isLoadingAppointments,
  isLoadingCalendars,
  monthDays,
  occurrencesByDay,
  selectedCalendarIds,
  selectedOccurrence,
  visibleOccurrences
} = storeToRefs(appointmentsStore)
const { goToNextMonth, goToPreviousMonth, goToToday, setSelectedDate, setSelectedOccurrence } =
  appointmentsStore

const currentAccountIdQuery = useRouteQuery('accountId')
const isInitializing = ref(true)
const loadedAccountId = ref<string>()

const currentAccountId = computed(() => {
  return unref(currentAccount)?.accountId
})
const selectedOccurrenceCalendar = computed(() => {
  const occurrence = unref(selectedOccurrence)
  return occurrence?.calendarId ? unref(calendarsById)[occurrence.calendarId] : undefined
})
const isCalendarLoading = computed(() => {
  return (
    unref(isInitializing) ||
    unref(isLoadingAccounts) ||
    unref(isLoadingCalendars) ||
    unref(isLoadingAppointments)
  )
})
const calendarLoadError = computed(() => unref(calendarError) || unref(error))

function ignoreLoadError(): void {}

async function loadVisibleAppointments() {
  appointmentsStore.setVisibleDateRange(unref(currentMonthRange))

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

  await loadAppointments(
    unref(currentAccountId),
    unref(currentMonthRange),
    unref(selectedCalendarIds)
  )
}

async function loadAccountCalendars() {
  const accountId = unref(currentAccountId)
  loadedAccountId.value = undefined

  if (!accountId) {
    appointmentsStore.setActiveAccountId(null)
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

watch([currentMonthRange, selectedCalendarIds], () => {
  if (unref(loadedAccountId) !== unref(currentAccountId)) {
    return
  }

  loadVisibleAppointments().catch(ignoreLoadError)
})

watch(
  currentAccountId,
  (accountId) => {
    if (accountId || !unref(isInitializing)) {
      currentAccountIdQuery.value = accountId || null
    }
    loadAccountCalendars().catch(ignoreLoadError)
  },
  { immediate: true }
)

onMounted(() => {
  loadCurrentAccount({
    client: httpAuthenticated,
    query: queryItemAsString(unref(currentAccountIdQuery)) || undefined
  })
    .catch((error) => {
      appointmentsStore.setCalendarError(error instanceof Error ? error : new Error(String(error)))
    })
    .finally(() => {
      isInitializing.value = false
    })
})
</script>
