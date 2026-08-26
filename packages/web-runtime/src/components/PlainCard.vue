<template>
  <oc-card class="w-full rounded-xl shadow-md dark:border" body-class="p-6 sm:p-8">
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4">
        <span
          v-if="icon"
          class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-role-secondary-container"
        >
          <oc-icon
            :name="icon"
            :fill-type="iconFillType"
            size-class="size-5"
            color="var(--oc-role-on-secondary-container)"
          />
        </span>
        <div class="flex flex-col gap-1">
          <h2 class="my-0 text-2xl font-bold" v-text="title" />
          <p v-if="description" class="my-0 text-role-on-surface-variant" v-text="description" />
        </div>
      </div>
      <slot />
    </div>
  </oc-card>
</template>

<script setup lang="ts">
import { FillType } from '@opencloud-eu/design-system/helpers'
// import ods components explicitly, ods is not initialized on all pages using this component
import { OcCard, OcIcon } from '@opencloud-eu/design-system/components'

const {
  title,
  description = undefined,
  icon = undefined,
  iconFillType = 'line'
} = defineProps<{
  title: string
  description?: string
  icon?: string
  iconFillType?: FillType
}>()

defineSlots<{
  default?: () => unknown
}>()
</script>
