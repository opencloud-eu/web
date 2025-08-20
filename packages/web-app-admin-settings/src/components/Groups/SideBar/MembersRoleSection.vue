<template>
  <ul class="oc-list">
    <li
      v-for="(member, index) in groupMembers"
      :key="index"
      class="flex items-center mb-2"
      data-testid="group-members-list"
    >
      <user-avatar :user-id="member.id" :user-name="member.displayName" class="mr-2" />
      <span class="oc-text-truncate" :title="member.displayName">
        {{ member.displayName }}
      </span>
    </li>
  </ul>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { UserAvatar } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'MembersRoleSection',
  components: { UserAvatar },
  props: {
    groupMembers: {
      type: Array as PropType<User[]>,
      required: false,
      default: (): User[] => []
    }
  }
})
</script>
