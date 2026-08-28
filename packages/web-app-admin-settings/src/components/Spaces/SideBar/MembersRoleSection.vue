<template>
  <ul class="oc-list">
    <li
      v-for="m in permissions"
      :key="getId(m)"
      class="flex items-center mb-2"
      data-testid="space-members-list"
    >
      <user-avatar
        v-if="m.grantedToV2.user"
        :user-id="m.grantedToV2.user.id"
        :user-name="getDisplayName(m)"
        class="mr-2"
      />
      <oc-avatar-item
        v-else
        :width="36"
        icon-size="medium"
        :icon="ShareTypes.group.icon"
        name="group"
        class="mr-2"
      />
      <span class="truncate" :title="getDisplayName(m)">
        <filter-highlight :text="getDisplayName(m)" :term="term" />
      </span>
    </li>
  </ul>
</template>
<script setup lang="ts">
import { ShareTypes } from '@opencloud-eu/web-client'
import { Permission } from '@opencloud-eu/web-client/graph/generated'
import { FilterHighlight, UserAvatar } from '@opencloud-eu/web-pkg'

const { permissions, term = '' } = defineProps<{ permissions: Permission[]; term?: string }>()

const getDisplayName = (permission: Permission) => {
  return permission.grantedToV2.user?.displayName || permission.grantedToV2.group?.displayName || ''
}

const getId = (permission: Permission) => {
  return permission.grantedToV2.user?.id || permission.grantedToV2.group?.id || permission.id
}
</script>
