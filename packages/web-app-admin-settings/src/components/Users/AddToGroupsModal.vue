<template>
  <group-select
    :selected-groups="selectedOptions"
    :group-options="availableGroups"
    :position-fixed="true"
    required-mark
    @selected-option-change="changeSelectedGroupOption"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, Ref, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import GroupSelect from './GroupSelect.vue'
import { useClientService, Modal, useMessages } from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../composables/stores/userSettings'

export default defineComponent({
  name: 'AddToGroupsModal',
  components: { GroupSelect },
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    groups: {
      type: Array as PropType<Group[]>,
      required: true
    },
    users: {
      type: Array as PropType<User[]>,
      required: true
    }
  },
  emits: ['update:confirmDisabled'],
  setup(props, { emit, expose }) {
    const { showMessage, showErrorMessage } = useMessages()
    const clientService = useClientService()
    const { $gettext, $ngettext } = useGettext()
    const userSettingsStore = useUserSettingsStore()

    const selectedOptions: Ref<Group[]> = ref([])
    const changeSelectedGroupOption = (options: Group[]) => {
      selectedOptions.value = options
    }

    const availableGroups = computed(() => {
      if (props.users.length > 1) {
        // return all groups if multiple users are selected since we don't want to compute the intersection
        return props.groups
      }
      return props.groups.filter(
        (group) => !props.users.some((user) => user.memberOf.some(({ id }) => id === group.id))
      )
    })

    watch(
      selectedOptions,
      () => {
        emit('update:confirmDisabled', !unref(selectedOptions).length)
      },
      { immediate: true }
    )

    const onConfirm = async () => {
      const client = clientService.graphAuthenticated
      const usersToFetch: string[] = []
      const promises = unref(selectedOptions).reduce((acc, group) => {
        for (const user of props.users) {
          if (!user.memberOf.find((userGroup) => userGroup.id === group.id)) {
            acc.push(client.groups.addMember(group.id, user.id))
            if (!usersToFetch.includes(user.id)) {
              usersToFetch.push(user.id)
            }
          }
        }
        return acc
      }, [])

      if (!promises.length) {
        const title = $ngettext(
          'Group assignment already added',
          'Group assignments already added',
          props.users.length * unref(selectedOptions).length
        )
        showMessage({ title })
        return
      }

      const results = await Promise.allSettled(promises)

      const succeeded = results.filter((r) => r.status === 'fulfilled')
      if (succeeded.length) {
        const title =
          succeeded.length === 1 && unref(selectedOptions).length === 1 && props.users.length === 1
            ? $gettext('Group assignment "%{group}" was added successfully', {
                group: unref(selectedOptions)[0].displayName
              })
            : $ngettext(
                '%{groupAssignmentCount} group assignment was added successfully',
                '%{groupAssignmentCount} group assignments were added successfully',
                succeeded.length,
                { groupAssignmentCount: succeeded.length.toString() },
                true
              )
        showMessage({ title })
      }

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length) {
        failed.forEach(console.error)

        const title =
          failed.length === 1 && unref(selectedOptions).length === 1 && props.users.length === 1
            ? $gettext('Failed to add group assignment "%{group}"', {
                group: unref(selectedOptions)[0].displayName
              })
            : $ngettext(
                'Failed to add %{groupAssignmentCount} group assignment',
                'Failed to add %{groupAssignmentCount} group assignments',
                failed.length,
                { groupAssignmentCount: failed.length.toString() },
                true
              )
        showErrorMessage({
          title,
          errors: (failed as PromiseRejectedResult[]).map((f) => f.reason)
        })
      }

      try {
        const usersResponse = await Promise.all(
          usersToFetch.map((userId) => client.users.getUser(userId))
        )

        usersResponse.forEach((user) => {
          userSettingsStore.upsertUser(user)
        })
      } catch (e) {
        console.error(e)
      }
    }

    expose({ onConfirm })

    return {
      selectedOptions,
      changeSelectedGroupOption,
      availableGroups,

      // unit tests
      onConfirm
    }
  }
})
</script>
