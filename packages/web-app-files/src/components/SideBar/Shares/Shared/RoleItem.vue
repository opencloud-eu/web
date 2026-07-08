<template>
  <span :id="`files-role-${(role as ShareRole).id}`" class="roles-select-role-item text-left">
    <span
      class="font-semibold block w-full leading-4"
      v-text="$gettext((role as ShareRole).displayName)"
    />
    <span class="m-0 text-sm block leading-4" v-text="$gettext((role as ShareRole).description)" />
  </span>
</template>

<script setup lang="ts">
import { ShareRole } from '@opencloud-eu/web-client'

const { role } = defineProps<{
  role: ShareRole
}>()
</script>
