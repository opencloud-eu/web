<template>
  <ul class="oc-list">
    <li
      v-for="member in groupMembers"
      :key="member.id"
      class="flex items-center mb-2"
      data-testid="group-members-list"
    >
      <user-avatar :user-id="member.id" :user-name="member.displayName" class="mr-2" />
      <span class="truncate" :title="member.displayName">
        <oc-filter-highlight :text="member.displayName" :term="term" />
      </span>
    </li>
  </ul>
</template>
<script setup lang="ts">
import { User } from '@opencloud-eu/web-client/graph/generated'
import { UserAvatar } from '@opencloud-eu/web-pkg'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const { groupMembers = [], term = '' } = defineProps<{
  groupMembers?: User[]
  term?: string
}>()
</script>
