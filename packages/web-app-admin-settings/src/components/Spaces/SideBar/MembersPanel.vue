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
    <div ref="membersListRef" data-testid="space-members">
      <div v-if="!filteredPermissions.length">
        <h3 class="font-semibold text-base" v-text="$gettext('No members found')" />
      </div>
      <div v-for="(role, i) in availableRoles" :key="i">
        <div
          v-if="getPermissionsForRole(role).length"
          class="mb-4"
          :data-testid="`space-members-role-${role.displayName}`"
        >
          <h3 class="font-semibold text-base" v-text="role.displayName" />
          <members-role-section :permissions="getPermissionsForRole(role)" />
        </div>
      </div>
      <div v-if="permissionsWithoutRole.length" class="space-members-custom">
        <h3 class="font-semibold text-base" v-text="$gettext('Custom role')" />
        <members-role-section :permissions="permissionsWithoutRole" />
      </div>
    </div>
    <oc-pagination-inline
      v-model:current-page="currentPage"
      class="justify-center mt-2"
      :pages="totalPages"
      :label="$gettext('Member list pagination')"
      data-testid="space-members-pagination"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, unref, useTemplateRef } from 'vue'
import { ShareRole, SpaceResource } from '@opencloud-eu/web-client'
import MembersRoleSection from './MembersRoleSection.vue'
import Fuse from 'fuse.js'
import {
  defaultFuseOptions,
  useFilterHighlight,
  useLocalPagination,
  useSharesStore
} from '@opencloud-eu/web-pkg'
import { Permission } from '@opencloud-eu/web-client/graph/generated'

const sharesStore = useSharesStore()

const resource = inject<SpaceResource>('resource')
const filterTerm = ref('')
const membersListRef = useTemplateRef<HTMLElement>('membersListRef')

const filterMembers = (collection: Permission[], term: string) => {
  if (!(term || '').trim()) {
    return collection
  }

  const searchEngine = new Fuse(collection, {
    ...defaultFuseOptions,
    keys: ['grantedToV2.user.displayName', 'grantedToV2.group.displayName']
  })
  return searchEngine.search(term).map((r) => r.item)
}

const permissions = computed(() => {
  return Object.values(unref(resource).root.permissions)
})

const filteredPermissions = computed(() => {
  return filterMembers(unref(permissions), unref(filterTerm))
})

const availableRoles = computed<ShareRole[]>(() => {
  const permissionsWithRole = unref(permissions).filter((p) => !!p.roles.length)
  const roleIds = [...new Set(permissionsWithRole.map((p) => p.roles).flat())]
  return roleIds
    .map((r) => sharesStore.graphRoles[r])
    .filter(Boolean)
    .sort((a, b) => {
      // sort roles by amount of permissions (most likely translates to manager > editor > viewer)
      const permissionsA = a.rolePermissions.flatMap((r) => r.allowedResourceActions)
      const permissionsB = b.rolePermissions.flatMap((r) => r.allowedResourceActions)
      return permissionsB.length - permissionsA.length
    })
})

// group members by role before paginating, so a role section is not scattered across pages
const sortedPermissions = computed(() => {
  const roleIds = unref(availableRoles).map(({ id }) => id)
  const roleIndex = (permission: Permission) => {
    const index = roleIds.findIndex((id) => permission.roles.includes(id))
    return index === -1 ? roleIds.length : index
  }

  return [...unref(filteredPermissions)].sort((a, b) => roleIndex(a) - roleIndex(b))
})

const {
  currentPage,
  totalPages,
  paginatedItems: paginatedPermissions
} = useLocalPagination({
  items: sortedPermissions,
  perPage: 20,
  resetOn: [filterTerm, resource]
})

const permissionsWithoutRole = computed(() => {
  return unref(paginatedPermissions).filter(({ roles }) => !roles.length)
})

const getPermissionsForRole = (role: ShareRole) => {
  return unref(paginatedPermissions).filter(({ roles }) => roles.includes(role.id))
}

useFilterHighlight({ element: membersListRef, term: filterTerm, items: paginatedPermissions })
</script>
