<template>
  <div class="flex items-center min-w-0 mb-2">
    <OcAvatar
      class="mr-3 shrink-0"
      :width="40"
      :userid="group.id"
      :user-name="group.displayName"
      background-color="var(--oc-role-secondary)"
    />
    <div class="min-w-0">
      <h2 class="font-semibold m-0 text-base truncate" v-text="group.displayName"></h2>
      <span class="block text-role-on-surface-variant truncate" v-text="groupMembersText"></span>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'GroupInfoBox',
  props: {
    group: {
      type: Object as PropType<Group>,
      required: true
    }
  },
  setup(props) {
    const _group = computed<Group>(() => props.group)
    const { $ngettext } = useGettext()
    const groupMembersText = computed(() => {
      return $ngettext(
        '%{groupCount} member',
        '%{groupCount} members',
        unref(_group).members.length,
        {
          groupCount: unref(_group).members.length.toString()
        }
      )
    })

    return {
      groupMembersText
    }
  }
})
</script>
