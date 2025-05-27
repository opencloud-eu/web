<template>
  <ul class="oc-list">
    <li
      v-for="(m, index) in members"
      :key="index"
      class="oc-flex oc-flex-middle oc-mb-s"
      data-testid="space-members-list"
    >
      <user-avatar
        v-if="m.grantedTo.user"
        :user-id="m.grantedTo.user.id"
        :user-name="m.grantedTo.user.displayName"
        class="oc-mr-s"
      />
      <oc-avatar-item
        v-else
        :width="36"
        icon-size="medium"
        :icon="groupIcon"
        name="group"
        class="oc-mr-s"
      />
      {{ (m.grantedTo.user || m.grantedTo.group).displayName }}
    </li>
  </ul>
</template>
<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { ShareTypes, SpaceMember } from '@opencloud-eu/web-client'
import UserAvatar from '@opencloud-eu/web-pkg/src/components/Avatars/UserAvatar.vue'

export default defineComponent({
  name: 'MembersRoleSection',
  components: { UserAvatar },
  props: {
    members: {
      type: Array as PropType<SpaceMember[]>,
      required: true
    }
  },
  setup() {
    const groupIcon = computed(() => {
      return ShareTypes.group.icon
    })
    return { groupIcon }
  }
})
</script>
