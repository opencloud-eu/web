<template>
  <div class="flex items-center min-w-0 mb-4">
    <OcAvatar
      class="mr-3 shrink-0"
      :width="40"
      :userid="group.id"
      :user-name="group.displayName"
      background-color="var(--oc-role-secondary)"
    />
    <h2 class="font-semibold m-0 min-w-0 text-base truncate" v-text="group.displayName" />
  </div>
</template>
<script setup lang="ts">
import { Group } from '@opencloud-eu/web-client/graph/generated'

defineProps<{ group: Group }>()
</script>
