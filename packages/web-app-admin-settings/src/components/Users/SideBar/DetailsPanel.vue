<template>
  <div v-if="noUsers" class="flex flex-col items-center text-center mt-12">
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
<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import UserInfoBox from './UserInfoBox.vue'
import { AppRole, User } from '@opencloud-eu/web-client/graph/generated'
import { formatFileSize, useCapabilityStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'DetailsPanel',
  components: {
    UserInfoBox
  },
  props: {
    user: {
      type: Object as PropType<User>,
      required: false,
      default: null
    },
    users: {
      type: Array as PropType<User[]>,
      required: true
    },
    roles: {
      type: Array as PropType<AppRole[]>,
      required: true
    }
  },
  setup() {
    const language = useGettext()
    const currentLanguage = computed(() => language.current)

    const capabilityStore = useCapabilityStore()
    const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)

    return {
      currentLanguage,
      graphUsersEditLoginAllowedDisabled
    }
  },
  computed: {
    noUsers() {
      return !this.users.length
    },
    multipleUsers() {
      return this.users.length > 1
    },
    multipleUsersSelectedText() {
      return this.$gettext('%{count} users selected', {
        count: this.users.length.toString()
      })
    },
    roleDisplayName() {
      const assignedRole = this.user.appRoleAssignments[0]

      return (
        this.$gettext(
          this.roles.find((role) => role.id === assignedRole?.appRoleId)?.displayName || ''
        ) || '-'
      )
    },
    groupsDisplayValue() {
      return this.user.memberOf
        .map((group) => group.displayName)
        .sort()
        .join(', ')
    },
    showUserQuota() {
      return 'total' in (this.user.drive?.quota || {})
    },
    quotaDisplayValue() {
      return this.user.drive.quota.total === 0
        ? this.$gettext('No restriction')
        : formatFileSize(this.user.drive.quota.total, this.currentLanguage)
    },
    loginDisplayValue() {
      return this.user.accountEnabled === false
        ? this.$gettext('Forbidden')
        : this.$gettext('Allowed')
    }
  }
})
</script>
