<template>
  <div class="relative h-full">
    <MonthView
      v-if="viewMode === 'month'"
      :days="monthDays"
      :current-month="currentMonth"
      :selected-date="selectedDate"
      :appointments="appointments"
      :appointments-by-day="appointmentsByDay"
      :is-loading="isLoading"
      :error="error"
      :view-mode="viewMode"
      @previous="onPreviousMonth"
      @next="onNextMonth"
      @today="onToday"
      @select-date="setSelectedDate"
    />
    <TimeGridView
      v-else-if="['day', '3-day', 'week'].includes(viewMode)"
      :current-month="currentMonth"
      :selected-date="selectedDate"
      :appointments-by-day="appointmentsByDay"
      :is-loading="isLoading"
      :error="error"
      :view-mode="viewMode"
      @previous="onPreviousRange"
      @next="onNextRange"
      @today="onToday"
    />
    <AgendaView
      v-else
      :current-month="currentMonth"
      :appointments="appointments"
      @previous="onPreviousRange"
      @next="onNextRange"
      @today="onToday"
    />
    <AppointmentCreateModal />
  </div>
</template>

<script setup lang="ts">
import {
  queryItemAsString,
  useClientService,
  useGroupwareAccountsStore,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
import { computed, onMounted, unref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import MonthView from '../components/MonthView.vue'
import TimeGridView from '../components/TimeGridView.vue'
import AgendaView from '../components/AgendaView.vue'
import AppointmentCreateModal from '../components/AppointmentCreateModal.vue'
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
const {
  appointments,
  appointmentsByDay,
  currentMonth,
  selectedDate,
  selectedCalendarIds,
  viewMode,
  isLoading,
  error
} = storeToRefs(appointmentsStore)
const { goToNextMonth, goToPreviousMonth, goToToday, setCurrentMonth, setSelectedDate } =
  appointmentsStore

const currentAccountIdQuery = useRouteQuery('accountId')

const monthDays = computed(() => getMonthGridDays(unref(currentMonth)))

const visibleRange = computed(() => {
  if (unref(viewMode) !== 'month') {
    const range = getVisibleRangeForCurrentView()
    return {
      start: formatDateForApi(range.start),
      end: formatDateForApi(range.end)
    }
  }

  const range = getMonthGridRange(unref(currentMonth))
  return {
    start: formatDateForApi(range.start),
    end: formatDateForApi(range.end)
  }
})

const currentAccountId = computed(() => {
  return (unref(currentAccount) as { accountId?: string } | undefined)?.accountId
})

const ignoreLoadError = (): void => undefined

const loadVisibleAppointments = async () => {
  appointmentsStore.setVisibleDateRange(unref(visibleRange))

  if (!unref(currentAccountId)) {
    appointmentsStore.setAppointments([])
    return
  }

  if (!unref(selectedCalendarIds).length) {
    appointmentsStore.setAppointments([])
    return
  }

  await loadAppointments(unref(currentAccountId), unref(visibleRange), unref(selectedCalendarIds))
}

const loadAccountCalendars = async () => {
  if (!unref(currentAccountId)) {
    appointmentsStore.setCalendars([])
    appointmentsStore.setAppointments([])
    return
  }

  await loadCalendars(unref(currentAccountId))
  await loadVisibleAppointments()
}

const onPreviousMonth = () => {
  goToPreviousMonth()
}

const onNextMonth = () => {
  goToNextMonth()
}

const onToday = () => {
  goToToday()
}

const onPreviousRange = () => {
  moveSelectedDate(-getRangeStep())
}

const onNextRange = () => {
  moveSelectedDate(getRangeStep())
}

const moveSelectedDate = (amount: number) => {
  const next = new Date(unref(selectedDate))
  next.setDate(next.getDate() + amount)
  setSelectedDate(next)
  setCurrentMonth(next)
}

const getRangeStep = () => {
  if (unref(viewMode) === 'day') {
    return 1
  }
  if (unref(viewMode) === '3-day') {
    return 3
  }
  return 7
}

const getVisibleRangeForCurrentView = () => {
  const start = new Date(unref(selectedDate))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)

  if (unref(viewMode) === 'week' || unref(viewMode) === 'agenda') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  } else if (unref(viewMode) === '3-day') {
    end.setDate(end.getDate() + 2)
  }

  end.setHours(23, 59, 59, 999)
  return { start, end }
}

accountsStore.$onAction(({ after, name }) => {
  after(() => {
    if (['loadCurrentAccount', 'setCurrentAccount'].includes(name) && unref(currentAccountId)) {
      currentAccountIdQuery.value = unref(currentAccountId)
      loadAccountCalendars().catch(ignoreLoadError)
    }
  })
})

watch([visibleRange, selectedCalendarIds], () => {
  loadVisibleAppointments().catch(ignoreLoadError)
})

onMounted(() => {
  loadCurrentAccount({
    client: httpAuthenticated,
    query: queryItemAsString(unref(currentAccountIdQuery)) || undefined
  })
})
</script>
