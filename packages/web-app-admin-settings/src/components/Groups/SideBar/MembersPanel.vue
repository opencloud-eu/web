<template>
  <div class="oc-ml-s">
    <oc-text-input
      v-model="filterTerm"
      class="oc-mr-s oc-mt-m"
      :label="$gettext('Filter members')"
    />
    <div ref="membersListRef" data-testid="space-members">
      <div v-if="!filteredGroupMembers.length">
        <h3 class="oc-text-bold oc-text-medium" v-text="$gettext('No members found')" />
      </div>
      <div v-if="filteredGroupMembers.length" class="oc-mb-m" data-testid="group-members">
        <h3 class="oc-text-bold oc-text-medium" v-text="$gettext('Members')" />
        <members-role-section :group-members="filteredGroupMembers" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, inject, ref, watch, unref, Ref } from 'vue'
import MembersRoleSection from '../../Groups/SideBar/MembersRoleSection.vue'
import Fuse from 'fuse.js'
import Mark from 'mark.js'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { defaultFuseOptions } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'GroupsMembersPanel',
  components: { MembersRoleSection },
  setup() {
    const group = inject<Ref<Group>>('group')
    const filterTerm = ref('')
    const markInstance = ref(null)
    const membersListRef = ref(null)

    const filterMembers = (collection: User[], term: string) => {
      if (!(term || '').trim()) {
        return collection
      }

      const searchEngine = new Fuse(collection, { ...defaultFuseOptions, keys: ['displayName'] })
      return searchEngine.search(term).map((r) => r.item)
    }

    const members = computed(() => {
      if (group) {
        return unref(group).members.sort((a, b) => a.displayName.localeCompare(b.displayName))
      }
      return []
    })

    const filteredGroupMembers = computed(() => {
      return filterMembers(unref(members), unref(filterTerm))
    })

    watch(filterTerm, () => {
      if (unref(membersListRef)) {
        markInstance.value = new Mark(unref(membersListRef))
        unref(markInstance).unmark()
        const searchTermRegex = unref(filterTerm)
        unref(markInstance).mark(searchTermRegex, {
          element: 'span',
          className: 'mark-highlight'
        })
      }
    })

    return {
      filterTerm,
      membersListRef,
      members,
      filteredGroupMembers
    }
  }
})
</script>
