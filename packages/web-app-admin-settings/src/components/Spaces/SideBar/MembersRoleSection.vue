<template>
  <ul class="oc-list">
    <li
      v-for="(m, index) in permissions"
      :key="index"
      class="oc-flex oc-flex-middle oc-mb-s"
      data-testid="space-members-list"
    >
      <oc-avatar
        v-if="m.grantedToV2.user"
        :user-name="getDisplayName(m)"
        :width="36"
        class="oc-mr-s"
      /><oc-avatar-item
        v-else
        :width="36"
        icon-size="medium"
        :icon="ShareTypes.group.icon"
        name="group"
        class="oc-mr-s"
      />
      {{ getDisplayName(m) }}
    </li>
  </ul>
</template>
<script setup lang="ts">
import { ShareTypes } from '@opencloud-eu/web-client'
import { Permission } from '@opencloud-eu/web-client/graph/generated'

const { permissions } = defineProps<{ permissions: Permission[] }>()

const getDisplayName = (permission: Permission) => {
  return permission.grantedToV2.user?.displayName || permission.grantedToV2.group?.displayName || ''
}
</script>
