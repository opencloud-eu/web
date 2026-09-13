<template>
  <div class="relative h-full">
    <MonthView
      :days="monthDays"
      :current-month="currentMonth"
      :occurrences-by-day="occurrencesByDay"
      :calendar-color-by-id="calendarColorById"
      :is-loading="isCalendarLoading"
      :error="calendarLoadError"
      @previous="goToPreviousMonth"
      @next="goToNextMonth"
      @today="goToToday"
      @select-date="setSelectedDate"
      @select-appointment="setSelectedOccurrence"
    />
    <AppointmentDetailsModal
      v-if="selectedOccurrence"
      :occurrence="selectedOccurrence"
      :calendar="selectedOccurrenceCalendar"
      @close="setSelectedOccurrence()"
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
const { clearAppointments, loadAppointments, loadCalendars, isLoading, error } =
  useLoadAppointments()

const { currentAccount, isLoading: isLoadingAccounts } = storeToRefs(accountsStore)
const {
  calendarColorById,
  calendarIds,
  calendarsById,
  currentMonth,
  currentMonthRange,
  monthDays,
  occurrencesByDay,
  selectedOccurrence
} = storeToRefs(appointmentsStore)
const { goToNextMonth, goToPreviousMonth, goToToday, setSelectedDate, setSelectedOccurrence } =
  appointmentsStore

const currentAccountIdQuery = useRouteQuery('accountId')
const isInitializing = ref(true)
const accountError = ref<Error>()
const loadedAccountId = ref<string>()

const currentAccountId = computed(() => unref(currentAccount)?.accountId)

const selectedOccurrenceCalendar = computed(() => {
  const occurrence = unref(selectedOccurrence)
  return occurrence?.calendarId ? unref(calendarsById)[occurrence.calendarId] : undefined
})

const isCalendarLoading = computed(() => {
  return unref(isInitializing) || unref(isLoadingAccounts) || unref(isLoading)
})

const calendarLoadError = computed(() => unref(accountError) || unref(error))

// Load errors are logged and exposed via `error` by the loading tasks already.
const ignoreHandledError = () => {}

const loadVisibleAppointments = async () => {
  const accountId = unref(currentAccountId)

  if (!accountId || !unref(calendarIds).length) {
    clearAppointments()
    return
  }

  await loadAppointments(accountId, unref(currentMonthRange), unref(calendarIds))
}

const loadAccountCalendars = async () => {
  const accountId = unref(currentAccountId)
  loadedAccountId.value = undefined
  appointmentsStore.setActiveAccountId(accountId)

  if (!accountId) {
    clearAppointments()
    return
  }

  await loadCalendars(accountId)
  if (unref(currentAccountId) !== accountId) {
    return
  }

  loadedAccountId.value = accountId
  await loadVisibleAppointments()
}

watch(currentMonthRange, () => {
  if (unref(loadedAccountId) !== unref(currentAccountId)) {
    return
  }

  loadVisibleAppointments().catch(ignoreHandledError)
})

watch(
  currentAccountId,
  (accountId) => {
    if (accountId || !unref(isInitializing)) {
      currentAccountIdQuery.value = accountId || null
    }

    loadAccountCalendars().catch(ignoreHandledError)
  },
  { immediate: true }
)

onMounted(() => {
  loadCurrentAccount({
    client: httpAuthenticated,
    query: queryItemAsString(unref(currentAccountIdQuery)) || undefined
  })
    .catch((e: unknown) => {
      accountError.value = e instanceof Error ? e : new Error(String(e))
    })
    .finally(() => {
      isInitializing.value = false
    })
})
</script>
