<template>
  <div class="ml-2">
    <oc-search-bar
      v-model="filterTerm"
      class="mr-2 mt-4"
      :label="$gettext('Filter members')"
      :placeholder="$gettext('Search for members')"
      button-hidden
      :is-rounded="false"
    />
    <div v-if="!loadMembersTask.isRunning" data-testid="space-members">
      <div v-if="!filteredGroupMembers.length">
        <h3 class="font-semibold text-base" v-text="$gettext('No members found')" />
      </div>
      <div v-if="filteredGroupMembers.length" class="mb-4" data-testid="group-members">
        <h3 class="font-semibold text-base" v-text="$gettext('Members')" />
        <members-role-section :group-members="paginatedMembers" :term="filterTerm" />
        <oc-pagination-inline
          v-model:current-page="currentPage"
          class="justify-center mt-2"
          :pages="totalPages"
          :label="$gettext('Member list pagination')"
          data-testid="group-members-pagination"
        />
      </div>
    </div>
    <div v-else class="flex justify-center items-center mt-8">
      <oc-spinner :aria-label="$gettext('Loading members')" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, watch, unref, Ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { call } from '@opencloud-eu/web-client'
import MembersRoleSection from '../../Groups/SideBar/MembersRoleSection.vue'
import Fuse from 'fuse.js'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import {
  defaultFuseOptions,
  useClientService,
  useLocalPagination,
  useMessages
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

const { graphAuthenticated } = useClientService()
const { showErrorMessage } = useMessages()
const { $gettext } = useGettext()

const group = inject<Ref<Group>>('group')
const filterTerm = ref('')
const members = ref<User[]>([])

const filterMembers = (collection: User[], term: string) => {
  if (!(term || '').trim()) {
    return collection
  }

  const searchEngine = new Fuse(collection, { ...defaultFuseOptions, keys: ['displayName'] })
  return searchEngine.search(term).map((r) => r.item)
}

const filteredGroupMembers = computed(() => {
  return filterMembers(unref(members), unref(filterTerm))
})

const {
  currentPage,
  totalPages,
  paginatedItems: paginatedMembers
} = useLocalPagination({
  items: filteredGroupMembers,
  perPage: 20,
  resetOn: [filterTerm, group]
})

const loadMembersTask = useTask(function* (signal) {
  members.value = []

  try {
    const loadedGroup = yield* call(
      graphAuthenticated.groups.getGroup(unref(group).id, { expand: ['members'] }, { signal })
    )
    members.value = [...(loadedGroup.members || [])].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    )
  } catch (error) {
    console.error(error)
    showErrorMessage({
      title: $gettext('Failed to load group members'),
      errors: [error]
    })
  }
}).restartable()

watch(
  () => unref(group),
  () => {
    if (unref(group)) {
      loadMembersTask.perform()
    }
  },
  { immediate: true }
)
</script>
