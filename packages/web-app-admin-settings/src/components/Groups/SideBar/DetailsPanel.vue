<template>
  <side-bar-no-selection
    v-if="noGroups"
    img-src="images/illustrations/groups.svg"
    :message="$gettext('Select a group to view details')"
    :details="noSelectionDetails"
  />
  <side-bar-multiple-selection
    v-if="multipleGroups"
    id="oc-groups-details-multiple-sidebar"
    img-src="images/illustrations/groups.svg"
    :message="multipleGroupsSelectedText"
  />
  <div v-if="group" id="oc-group-details-sidebar" class="p-2">
    <div
      class="flex justify-center items-center h-[192px] p-4 mb-4 bg-role-surface-container rounded-xl"
    >
      <oc-avatar
        :width="80"
        :userid="group.id"
        :user-name="group.displayName"
        background-color="var(--oc-role-secondary)"
      />
    </div>
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
import { SideBarMultipleSelection, SideBarNoSelection } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'DetailsPanel',
  components: { SideBarMultipleSelection, SideBarNoSelection },
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
