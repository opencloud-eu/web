<template>
  <div class="ml-2">
    <oc-text-input v-model="filterTerm" class="mr-2 mt-4" :label="$gettext('Filter members')" />
    <div ref="membersListRef" data-testid="space-members">
      <div v-if="!filteredGroupMembers.length">
        <h3 class="font-semibold text-base" v-text="$gettext('No members found')" />
      </div>
      <div v-if="filteredGroupMembers.length" class="mb-4" data-testid="group-members">
        <h3 class="font-semibold text-base" v-text="$gettext('Members')" />
        <members-role-section :group-members="filteredGroupMembers" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, inject, ref, watch, unref, Ref, useTemplateRef } from 'vue'
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
    const membersListRef = useTemplateRef('membersListRef')

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

    let markInstance: Mark | undefined
    watch(filterTerm, () => {
      if (unref(membersListRef)) {
        markInstance = new Mark(unref(membersListRef))
        markInstance.unmark()
        const searchTermRegex = unref(filterTerm)
        markInstance.mark(searchTermRegex, {
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
