<template>
  <div
    v-if="noUsers"
    class="flex flex-col items-center text-center mt-12"
    data-testid="no-users-selected"
  >
    <oc-icon name="user" size="xxlarge" />
    <p>{{ $gettext('Select a user to view details') }}</p>
  </div>
  <div
    v-if="multipleUsers"
    id="oc-users-details-multiple-sidebar"
    class="flex flex-col items-center p-4 bg-role-surface-container rounded-sm"
  >
    <oc-icon name="group" size="xxlarge" />
    <p>{{ multipleUsersSelectedText }}</p>
  </div>
  <div v-if="user" id="oc-user-details-sidebar" class="p-4 bg-role-surface-container rounded-sm">
    <UserInfoBox :user="user" />
    <dl
      class="details-list grid grid-cols-[auto_minmax(0,1fr)] m-0"
      :aria-label="$gettext('Overview of the information about the selected user')"
    >
      <dt>{{ $gettext('User name') }}</dt>
      <dd>{{ user.onPremisesSamAccountName }}</dd>
      <dt>{{ $gettext('First and last name') }}</dt>
      <dd>{{ user.displayName }}</dd>
      <dt>{{ $gettext('Email') }}</dt>
      <dd>{{ user.mail }}</dd>
      <dt>{{ $gettext('Role') }}</dt>
      <dd>
        <span v-if="user.appRoleAssignments" v-text="roleDisplayName" />
        <span v-else>
          <span class="mr-1">-</span>
          <oc-contextual-helper
            :text="
              $gettext(
                'User roles become available once the user has logged in for the first time.'
              )
            "
            :title="$gettext('User role')"
          />
        </span>
      </dd>

      <template v-if="!graphUsersEditLoginAllowedDisabled">
        <dt>{{ $gettext('Login') }}</dt>
        <dd>{{ loginDisplayValue }}</dd>
      </template>

      <dt>{{ $gettext('Quota') }}</dt>
      <dd>
        <span v-if="showUserQuota" v-text="quotaDisplayValue" />
        <span v-else>
          <span class="mr-1">-</span>
          <oc-contextual-helper
            :text="
              $gettext(
                'User quota becomes available once the user has logged in for the first time.'
              )
            "
            :title="$gettext('Quota')"
          />
        </span>
      </dd>
      <dt>{{ $gettext('Groups') }}</dt>
      <dd>
        <span v-if="user.memberOf.length" v-text="groupsDisplayValue" />
        <span v-else>
          <span class="mr-1">-</span>
          <oc-contextual-helper
            :text="$gettext('No groups assigned.')"
            :title="$gettext('Groups')"
          />
        </span>
      </dd>
    </dl>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import UserInfoBox from './UserInfoBox.vue'
import { AppRole, User } from '@opencloud-eu/web-client/graph/generated'
import { formatFileSize, useCapabilityStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

const {
  users,
  roles,
  user = null
} = defineProps<{
  users: User[]
  roles: AppRole[]
  user?: User
}>()

const { current: currentLanguage, $gettext } = useGettext()
const capabilityStore = useCapabilityStore()
const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)

const noUsers = computed(() => !users.length)
const multipleUsers = computed(() => users.length > 1)
const multipleUsersSelectedText = computed(() => {
  return $gettext('%{count} users selected', {
    count: users.length.toString()
  })
})

const roleDisplayName = computed(() => {
  const assignedRole = user.appRoleAssignments[0]

  return (
    $gettext(roles.find((role) => role.id === assignedRole?.appRoleId)?.displayName || '') || '-'
  )
})
const groupsDisplayValue = computed(() => {
  return user.memberOf
    .map((group) => group.displayName)
    .sort()
    .join(', ')
})

const showUserQuota = computed(() => 'total' in (user.drive?.quota || {}))
const quotaDisplayValue = computed(() => {
  return user.drive.quota.total === 0
    ? $gettext('No restriction')
    : formatFileSize(user.drive.quota.total, currentLanguage)
})

const loginDisplayValue = computed(() => {
  return user.accountEnabled === false ? $gettext('Forbidden') : $gettext('Allowed')
})
</script>
