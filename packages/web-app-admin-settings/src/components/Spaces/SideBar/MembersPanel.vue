<template>
  <div class="ml-2">
    <oc-text-input v-model="filterTerm" class="mr-2 mt-4" :label="$gettext('Filter members')" />
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
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, watch, unref, useTemplateRef } from 'vue'
import { ShareRole, SpaceResource } from '@opencloud-eu/web-client'
import MembersRoleSection from './MembersRoleSection.vue'
import Fuse from 'fuse.js'
import Mark from 'mark.js'
import { defaultFuseOptions, useSharesStore } from '@opencloud-eu/web-pkg'
import { Permission } from '@opencloud-eu/web-client/graph/generated'

const sharesStore = useSharesStore()

const resource = inject<SpaceResource>('resource')
const filterTerm = ref('')
const membersListRef = useTemplateRef('membersListRef')

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

const permissionsWithoutRole = computed(() => {
  return unref(filteredPermissions).filter(({ roles }) => !roles.length)
})

const getPermissionsForRole = (role: ShareRole) => {
  return unref(filteredPermissions).filter(({ roles }) => roles.includes(role.id))
}

let markInstance: Mark | undefined
watch(filterTerm, () => {
  if (unref(membersListRef)) {
    markInstance = new Mark(unref(membersListRef))
    markInstance.unmark()
    markInstance.mark(unref(filterTerm), {
      element: 'span',
      className: 'mark-highlight'
    })
  }
})
</script>
