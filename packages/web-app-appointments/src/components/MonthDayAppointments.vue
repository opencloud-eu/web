<template>
  <div class="flex min-h-0 flex-col gap-1 overflow-y-auto">
    <button
      v-for="occurrence in visibleOccurrences"
      :key="occurrence.id"
      type="button"
      class="grid w-full shrink-0 grid-cols-[1fr_auto] gap-2 truncate rounded border-l-4 bg-role-surface-container px-2 py-1 text-left text-xs text-role-on-surface hover:bg-role-surface-container-highest"
      :style="{
        borderColor: resolveAppointmentColor(
          occurrence.appointment,
          calendarColorById[occurrence.calendarId || '']
        )
      }"
      :title="occurrence.appointment.title"
      :data-testid="`calendar-appointment-${occurrence.id}`"
      @click.stop="$emit('select-appointment', occurrence.id)"
    >
      <span
        class="truncate"
        v-text="occurrence.appointment.title || $gettext('Untitled appointment')"
      />
      <span
        class="truncate text-role-on-surface-variant"
        v-text="formatOccurrenceTime(occurrence)"
      />
    </button>

    <button
      v-if="hiddenOccurrenceCount"
      type="button"
      class="w-fit shrink-0 truncate rounded px-2 py-1 text-left text-xs text-role-on-surface-variant hover:bg-role-surface-container-highest"
      :aria-expanded="isExpanded"
      :data-testid="`calendar-day-more-${dayKey}`"
      @click.stop="toggleExpanded"
      v-text="
        isExpanded
          ? $gettext('Show fewer')
          : $gettext('+%{count} more', { count: hiddenOccurrenceCount })
      "
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { resolveAppointmentColor } from '../helpers/color'
import { formatOccurrenceTimeRange } from '../helpers/date'
import type { AppointmentOccurrence } from '../types'

const MAX_OCCURRENCES_PER_DAY = 3

const { occurrences, calendarColorById } = defineProps<{
  dayKey: string
  occurrences: AppointmentOccurrence[]
  calendarColorById: Record<string, string | undefined>
}>()

defineEmits<{
  'select-appointment': [id: string]
}>()

const { $gettext, current: currentLanguage } = useGettext()
const isExpanded = ref(false)

const hiddenOccurrenceCount = computed(() => {
  return Math.max(occurrences.length - MAX_OCCURRENCES_PER_DAY, 0)
})

const visibleOccurrences = computed(() => {
  if (unref(isExpanded)) {
    return occurrences
  }

  return occurrences.slice(0, MAX_OCCURRENCES_PER_DAY)
})

function toggleExpanded() {
  isExpanded.value = !unref(isExpanded)
}

function formatOccurrenceTime(occurrence: AppointmentOccurrence) {
  if (occurrence.appointment.allDay) {
    return $gettext('All day')
  }

  return formatOccurrenceTimeRange(occurrence, currentLanguage)
}
</script>
