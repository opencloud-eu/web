<template>
  <div class="flex flex-col items-center mb-6">
    <OcAvatar
      class="mb-4"
      :width="80"
      :userid="group.id"
      :user-name="group.displayName"
      background-color="var(--oc-role-secondary)"
    />
    <span class="text-role-on-surface-variant text-2xl" v-text="group.displayName"></span>
    <span class="text-role-on-surface-variant" v-text="groupMembersText"></span>
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
