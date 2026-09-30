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
<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { SideBarMultipleSelection, SideBarNoSelection } from '@opencloud-eu/web-pkg'

const { groups, groupsCount = 0 } = defineProps<{ groups: Group[]; groupsCount?: number }>()

const { $gettext, $ngettext } = useGettext()

const group = computed(() => (groups.length === 1 ? groups[0] : null))
const noGroups = computed(() => !groups.length)
const multipleGroups = computed(() => groups.length > 1)

const noSelectionDetails = computed(() => [
  {
    term: $gettext('Items'),
    definition: $ngettext('%{count} group', '%{count} groups', groupsCount, {
      count: groupsCount.toString()
    })
  }
])

const multipleGroupsSelectedText = computed(() =>
  $gettext('%{count} groups selected', { count: groups.length.toString() })
)
</script>
