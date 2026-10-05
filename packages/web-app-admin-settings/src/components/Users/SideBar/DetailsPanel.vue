<template>
  <side-bar-no-selection
    v-if="noUsers"
    data-testid="no-users-selected"
    img-src="images/illustrations/users.svg"
    :message="$gettext('Select a user to view details')"
    :details="noSelectionDetails"
  />
  <side-bar-multiple-selection
    v-if="multipleUsers"
    id="oc-users-details-multiple-sidebar"
    img-src="images/illustrations/users.svg"
    :message="multipleUsersSelectedText"
  />
  <div v-if="user" id="oc-user-details-sidebar" class="p-2">
    <div
      class="flex justify-center items-center h-[192px] p-4 mb-4 bg-role-surface-container rounded-xl"
    >
      <user-avatar :width="80" :user-id="user.id" :user-name="user.displayName" />
    </div>
    <dl
      class="details-list"
      :aria-label="$gettext('Overview of the information about the selected user')"
    >
      <dt>{{ $gettext('User name') }}</dt>
      <dd>{{ user.onPremisesSamAccountName }}</dd>
      <dt>{{ $gettext('First and last name') }}</dt>
      <dd>{{ user.displayName }}</dd>
      <dt>{{ $gettext('Email') }}</dt>
      <dd>{{ user.mail }}</dd>
      <template v-if="!graphUsersEditLoginAllowedDisabled">
        <dt>{{ $gettext('Login') }}</dt>
        <dd>{{ loginDisplayValue }}</dd>
      </template>
      <dt>{{ $gettext('Role') }}</dt>
      <dd>
        <span v-if="user.appRoleAssignments" v-text="roleDisplayName" />
        <span v-else>
          <span class="me-1">-</span>
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

      <dt>{{ $gettext('Personal quota') }}</dt>
      <dd>
        <space-quota v-if="showUserQuota" :space-quota="user.drive.quota" />
        <span v-else>
          <span class="me-1">-</span>
          <oc-contextual-helper
            :text="
              $gettext(
                'User quota becomes available once the user has logged in for the first time.'
              )
            "
            :title="$gettext('Personal quota')"
          />
        </span>
      </dd>
      <dt>{{ $gettext('Groups') }}</dt>
      <dd>
        <span v-if="user.memberOf?.length" v-text="groupsDisplayValue" />
        <span v-else>
          <span class="me-1">-</span>
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
import { AppRole, User } from '@opencloud-eu/web-client/graph/generated'
import {
  SideBarMultipleSelection,
  SideBarNoSelection,
  SpaceQuota,
  UserAvatar,
  useCapabilityStore
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

const {
  users,
  usersCount = 0,
  roles,
  user = null
} = defineProps<{
  users: User[]
  usersCount?: number
  roles: AppRole[]
  user?: User
}>()

const { $gettext, $ngettext } = useGettext()
const capabilityStore = useCapabilityStore()
const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)

const noUsers = computed(() => !users.length)
const noSelectionDetails = computed(() => {
  return [
    {
      term: $gettext('Items'),
      definition: $ngettext('%{count} user', '%{count} users', usersCount, {
        count: usersCount.toString()
      })
    }
  ]
})
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

const loginDisplayValue = computed(() => {
  return user.accountEnabled === false ? $gettext('Forbidden') : $gettext('Allowed')
})
</script>
