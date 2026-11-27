<template>
  <oc-modal
    :title="appointment.title || $gettext('Untitled appointment')"
    :hide-actions="true"
    data-testid="appointment-details-modal"
    @cancel="$emit('close')"
  >
    <template #content>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm text-role-on-surface">
        <dt class="font-bold" v-text="$gettext('When')" />
        <dd class="m-0">
          <span v-text="formatWhen(occurrence)" />
          <span
            v-if="appointment.allDay"
            class="ml-2 text-role-on-surface-variant"
            v-text="$gettext('All day')"
          />
        </dd>

        <template v-if="calendar">
          <dt class="font-bold" v-text="$gettext('Calendar')" />
          <dd class="m-0 flex min-w-0 items-center gap-2">
            <span
              v-if="calendar.color"
              class="size-3 shrink-0 rounded-full"
              :style="{ backgroundColor: calendar.color }"
              aria-hidden="true"
            />
            <span class="truncate" v-text="calendar.name" />
          </dd>
        </template>

        <template v-if="appointment.location">
          <dt class="font-bold" v-text="$gettext('Location')" />
          <dd class="m-0 wrap-anywhere" v-text="appointment.location" />
        </template>

        <template v-if="appointment.description">
          <dt class="font-bold" v-text="$gettext('Description')" />
          <dd class="m-0 whitespace-pre-wrap wrap-anywhere" v-text="appointment.description" />
        </template>

        <template v-if="appointment.organizer">
          <dt class="font-bold" v-text="$gettext('Organizer')" />
          <dd class="m-0" v-text="formatParticipant(appointment.organizer)" />
        </template>

        <template v-if="appointment.participants.length">
          <dt class="font-bold" v-text="$gettext('Participants')" />
          <dd class="m-0">
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <li
                v-for="(participant, index) in appointment.participants"
                :key="participant.id || participant.email || index"
                v-text="formatParticipant(participant)"
              />
            </ul>
          </dd>
        </template>

        <template v-if="appointment.status">
          <dt class="font-bold" v-text="$gettext('Status')" />
          <dd class="m-0" v-text="formatStatus(appointment.status)" />
        </template>

        <template v-if="appointment.privacy">
          <dt class="font-bold" v-text="$gettext('Visibility')" />
          <dd class="m-0" v-text="formatPrivacy(appointment.privacy)" />
        </template>

        <template v-if="appointment.timeZone && !appointment.allDay">
          <dt class="font-bold" v-text="$gettext('Time zone')" />
          <dd class="m-0" v-text="appointment.timeZone" />
        </template>

        <template v-if="appointment.hasRecurrence">
          <dt class="font-bold" v-text="$gettext('Recurrence')" />
          <dd class="m-0" v-text="$gettext('Recurring appointment')" />
        </template>

        <template v-if="appointment.hasReminder">
          <dt class="font-bold" v-text="$gettext('Reminder')" />
          <dd class="m-0" v-text="$gettext('Reminder configured')" />
        </template>
      </dl>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppointmentPresentation } from '../composables/useAppointmentPresentation'
import type { AppointmentOccurrence, Calendar } from '../types'

const props = defineProps<{
  occurrence: AppointmentOccurrence
  calendar?: Calendar
}>()

defineEmits<{
  close: []
}>()

const appointment = computed(() => props.occurrence.appointment)
const { formatParticipant, formatPrivacy, formatStatus, formatWhen } = useAppointmentPresentation()
</script>
