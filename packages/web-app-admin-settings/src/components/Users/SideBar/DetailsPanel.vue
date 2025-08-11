<template>
  <div v-if="noUsers" class="oc-flex user-info oc-text-center mt-12">
    <oc-icon name="user" size="xxlarge" />
    <p>{{ $gettext('Select a user to view details') }}</p>
  </div>
  <div v-if="multipleUsers" id="oc-users-details-multiple-sidebar" class="oc-flex user-info">
    <oc-icon name="group" size="xxlarge" />
    <p>{{ multipleUsersSelectedText }}</p>
  </div>
  <div v-if="user" id="oc-user-details-sidebar">
    <UserInfoBox :user="user" />
    <dl
      class="details-list oc-m-rm"
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
      <dt>{{ $gettext('Login') }}</dt>
      <dd>{{ loginDisplayValue }}</dd>
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
import { formatFileSize } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

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
    const currentLanguage = computed(() => {
      return language.current
    })

    return {
      currentLanguage
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
<style lang="scss">
#oc-user-details-sidebar,
#oc-users-details-multiple-sidebar {
  background-color: var(--oc-role-surface-container);
  border-radius: 5px;
  padding: var(--oc-space-medium);
}

.details-table {
  text-align: left;

  tr {
    height: 1.5rem;
  }

  th {
    font-weight: 600;
  }
}
</style>
