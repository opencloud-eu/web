<template>
  <oc-drop mode="click" padding-size="small" class="min-w-56">
    <ul class="m-0 list-none p-0">
      <li>
        <oc-button
          type="button"
          appearance="raw-inverse"
          color-role="surface"
          justify-content="left"
          gap-size="large"
          class="w-full hover:bg-role-surface-container focus-visible:bg-role-surface-container"
          @click="openCreateModal"
        >
          <oc-icon name="calendar-event" fill-type="line" />
          <span v-text="$gettext('Appointment')" />
        </oc-button>
      </li>
      <li class="mx-4 border-t border-role-outline-variant" />
      <li>
        <oc-button
          type="button"
          appearance="raw-inverse"
          color-role="surface"
          justify-content="left"
          gap-size="large"
          class="w-full"
          disabled
        >
          <oc-icon name="calendar-todo" fill-type="line" />
          <span v-text="$gettext('Reminder')" />
        </oc-button>
      </li>
    </ul>
  </oc-drop>
</template>

<script setup lang="ts">
import { useAppointmentsStore } from '../composables/piniaStores/appointments'

const { openCreateModal } = useAppointmentsStore()
</script>
