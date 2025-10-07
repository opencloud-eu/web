<template>
  <div v-if="selectedRole" class="flex items-center">
    <span v-if="availableRoles.length === 1">
      <oc-icon v-if="showIcon" :name="selectedRole.icon" class="mr-2" />
      <span v-text="inviteLabel" />
    </span>
    <div v-else v-oc-tooltip="dropButtonTooltip" class="max-w-full">
      <oc-button
        :id="roleButtonId"
        class="files-recipient-role-select-btn max-w-full"
        appearance="raw"
        gap-size="none"
        :disabled="isLocked"
        :aria-label="
          mode === 'create' ? $gettext('Select permission') : $gettext('Edit permission')
        "
      >
        <oc-icon v-if="showIcon" :name="selectedRole.icon" class="mr-2" />
        <span class="truncate" v-text="inviteLabel" />
        <oc-icon name="arrow-down-s" />
      </oc-button>
      <oc-contextual-helper
        v-if="isDisabledRole"
        class="ml-1 files-permission-actions-list"
        :text="customPermissionsText"
        :title="$gettext('Custom permissions')"
      />
    </div>
    <oc-drop
      v-if="availableRoles.length > 1"
      ref="rolesDrop"
      :title="$gettext('Role')"
      :toggle="'#' + roleButtonId"
      mode="click"
      padding-size="small"
      class="files-recipient-role-drop w-md"
      close-on-click
    >
      <oc-list
        class="files-recipient-role-drop-list"
        :aria-label="$gettext('Select role for the invitation')"
      >
        <li v-for="role in availableRoles" :key="role.id">
          <oc-button
            :id="`files-recipient-role-drop-btn-${role.id}`"
            ref="roleSelect"
            class="files-recipient-role-drop-btn p-2"
            :class="{
              selected: isSelectedRole(role)
            }"
            justify-content="space-between"
            :appearance="isSelectedRole(role) ? 'filled' : 'raw-inverse'"
            :color-role="isSelectedRole(role) ? 'secondaryContainer' : 'surface'"
            @click="selectRole(role)"
          >
            <span class="flex items-center">
              <oc-icon :name="role.icon" class="pl-2 pr-4" />
              <role-item :role="role" />
            </span>
            <span class="flex">
              <oc-icon v-if="isSelectedRole(role)" name="check" />
            </span>
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script lang="ts">
import get from 'lodash-es/get'
import { storeToRefs } from 'pinia'
import RoleItem from '../Shared/RoleItem.vue'
import { v4 as uuidV4 } from 'uuid'
import {
  defineComponent,
  inject,
  PropType,
  ComponentPublicInstance,
  computed,
  ref,
  unref,
  Ref,
  watch
} from 'vue'
import { useAbility, useUserStore } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { ShareRole } from '@opencloud-eu/web-client'

export default defineComponent({
  name: 'RoleDropdown',
  components: { RoleItem },
  props: {
    existingShareRole: {
      type: Object as PropType<ShareRole>,
      required: false,
      default: undefined
    },
    existingSharePermissions: {
      type: Array as PropType<string[]>,
      required: false,
      default: (): string[] => []
    },
    domSelector: {
      type: String,
      required: false,
      default: undefined
    },
    mode: {
      type: String,
      required: false,
      default: 'create'
    },
    showIcon: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    // only show external share roles
    isExternal: {
      type: Boolean,
      default: false
    }
  },
  emits: ['optionChange'],
  setup(props, { emit }) {
    const ability = useAbility()
    const userStore = useUserStore()
    const { user } = storeToRefs(userStore)
    const { $gettext } = useGettext()

    const dropButtonTooltip = computed(() => {
      if (props.isLocked) {
        return $gettext('Resource is temporarily locked, unable to manage share')
      }

      return ''
    })
    const customPermissionsText = computed(() =>
      $gettext(
        'Dear user, please replace this legacy role with one of the currently available roles'
      )
    )

    const availableInternalRoles = inject<Ref<ShareRole[]>>('availableInternalShareRoles')
    const availableExternalRoles = inject<Ref<ShareRole[]>>('availableExternalShareRoles')
    const availableRoles = computed(() => {
      let roles = availableInternalRoles
      if (props.isExternal) {
        roles = availableExternalRoles
      }

      return unref(roles)
    })

    let initialSelectedRole: ShareRole
    const hasExistingShareRole = computed(() => !!props.existingShareRole)
    const hasExistingSharePermissions = computed(() => !!props.existingSharePermissions.length)
    const isDisabledRole = computed(
      () => !unref(hasExistingShareRole) && unref(hasExistingSharePermissions)
    )
    switch (true) {
      // if no role is set and no permissions are set, we use the first available role as the default
      case !unref(hasExistingShareRole) && !unref(hasExistingSharePermissions):
        initialSelectedRole = unref(availableRoles)[0]
        break
      // in the rare case that a role is disabled and permissions are set aka a disabled unified role ...
      case unref(isDisabledRole):
        // ... we need to create a fake role as an indicator that the permissions are custom
        initialSelectedRole = {
          displayName: $gettext('Custom permissions')
        }
        break
      default:
        initialSelectedRole = props.existingShareRole
        break
    }

    const selectedRole = ref<ShareRole>(initialSelectedRole)
    const isSelectedRole = (role: ShareRole) => {
      return unref(selectedRole).id === role.id
    }

    const selectRole = (role: ShareRole) => {
      selectedRole.value = role
      emit('optionChange', unref(selectedRole))
    }

    watch(
      () => props.isExternal,
      () => {
        if (!unref(hasExistingShareRole)) {
          // when no role exists and the external flag changes, we need to reset the selected role
          selectedRole.value = unref(availableRoles)[0]
        }
      }
    )

    return {
      ability,
      user,
      dropButtonTooltip,
      customPermissionsText,
      resource: inject<Resource>('resource'),
      selectedRole,
      availableRoles,
      isSelectedRole,
      selectRole,
      isDisabledRole
    }
  },
  computed: {
    roleButtonId() {
      if (this.domSelector) {
        return `files-collaborators-role-button-${this.domSelector}-${uuidV4()}`
      }
      return 'files-collaborators-role-button-new'
    },
    inviteLabel() {
      return this.$gettext(this.selectedRole?.displayName || '')
    }
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.cycleRoles)
  },

  mounted() {
    window.addEventListener('keydown', this.cycleRoles)
  },

  methods: {
    cycleRoles(event: KeyboardEvent) {
      // events only need to be captured if the roleSelect element is visible
      if (!get(this.$refs.rolesDrop, 'tippy.state.isShown', false)) {
        return
      }

      const { code } = event
      const isArrowUp = code === 'ArrowUp'
      const isArrowDown = code === 'ArrowDown'

      // to cycle through the list of roles only up and down keyboard events are allowed
      // if this is not the case we can return early and stop the script execution from here
      if (!isArrowUp && !isArrowDown) {
        return
      }

      // if there is only 1 or no roleSelect we can early return
      // it does not make sense to cycle through it if value is less than 1
      const roleSelect = (this.$refs.roleSelect as ComponentPublicInstance[]) || []

      if (roleSelect.length <= 1) {
        return
      }

      // obtain active role select in following priority chain:
      // first try to get the focused select
      // then try to get the selected select
      // and if none of those applies we fall back to the first role select
      const activeRoleSelect =
        roleSelect.find((rs) => rs.$el === document.activeElement) ||
        roleSelect.find((rs) => rs.$el.classList.contains('selected')) ||
        roleSelect[0]
      const activeRoleSelectIndex = roleSelect.indexOf(activeRoleSelect)
      const activateRoleSelect = (idx: number) => roleSelect[idx].$el.focus()

      // if the event key is arrow up
      // and the next active role select index would be less than 0
      // then activate the last available role select
      if (isArrowUp && activeRoleSelectIndex - 1 < 0) {
        activateRoleSelect(roleSelect.length - 1)

        return
      }

      // if the event key is arrow down
      // and the next active role select index would be greater or even to the available amount of role selects
      // then activate the first available role select
      if (isArrowDown && activeRoleSelectIndex + 1 >= roleSelect.length) {
        activateRoleSelect(0)

        return
      }

      // the only missing part is to navigate up or down, this only happens if:
      // the next active role index is greater than 0
      // the next active role index is less than the amount of all available role selects
      activateRoleSelect(activeRoleSelectIndex + (isArrowUp ? -1 : 1))
    }
  }
})
</script>
