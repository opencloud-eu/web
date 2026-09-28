<template>
  <side-bar-no-selection
    v-if="noGroups"
    img-src="images/empty-states/empty-groups.svg"
    :message="$gettext('Select a group to view details')"
    :details="noSelectionDetails"
  />
  <div
    v-if="multipleGroups"
    id="oc-groups-details-multiple-sidebar"
    class="flex flex-col items-center p-4 bg-role-surface-container rounded-sm"
  >
    <oc-icon name="group-2" size-class="size-22" />
    <p>{{ multipleGroupsSelectedText }}</p>
  </div>
  <div v-if="group" id="oc-group-details-sidebar" class="p-4 bg-role-surface-container rounded-sm">
    <GroupInfoBox :group="group" />
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
import { SideBarNoSelection } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'DetailsPanel',
  components: { SideBarNoSelection },
  props: {
    groups: {
      type: Array as PropType<Group[]>,
      required: true
    },
    groupsCount: {
      type: Number,
      default: 0
    }
  },
  computed: {
    group() {
      return this.groups.length === 1 ? this.groups[0] : null
    },
    noGroups() {
      return !this.groups.length
    },
    noSelectionDetails() {
      return [
        {
          term: this.$gettext('Items'),
          definition: this.$ngettext('%{count} group', '%{count} groups', this.groupsCount, {
            count: this.groupsCount.toString()
          })
        }
      ]
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
