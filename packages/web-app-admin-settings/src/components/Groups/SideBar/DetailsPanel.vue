<template>
  <div v-if="noGroups" class="flex flex-col items-center text-center mt-12">
    <oc-icon name="group-2" size="xxlarge" />
    <p v-text="$gettext('Select a group to view details')" />
  </div>
  <div
    v-if="multipleGroups"
    id="oc-groups-details-multiple-sidebar"
    class="flex flex-col items-center p-4 bg-role-surface-container rounded-sm"
  >
    <oc-icon name="group-2" size="xxlarge" />
    <p>{{ multipleGroupsSelectedText }}</p>
  </div>
  <div v-if="group" id="oc-group-details-sidebar" class="p-4 bg-role-surface-container rounded-sm">
    <dl
      class="details-list"
      :aria-label="$gettext('Overview of the information about the selected group')"
    >
      <dt>{{ $gettext('Group name') }}</dt>
      <dd>{{ group.displayName }}</dd>
    </dl>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'

export default defineComponent({
  name: 'DetailsPanel',
  props: {
    groups: {
      type: Array as PropType<Group[]>,
      required: true
    }
  },
  computed: {
    group() {
      return this.groups.length === 1 ? this.groups[0] : null
    },
    noGroups() {
      return !this.groups.length
    },
    multipleGroups() {
      return this.groups.length > 1
    },
    multipleGroupsSelectedText() {
      return this.$gettext('%{count} groups selected', {
        count: this.groups.length.toString()
      })
    }
  }
})
</script>
