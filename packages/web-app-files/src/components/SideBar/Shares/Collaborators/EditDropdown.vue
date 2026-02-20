<template>
  <div class="flex items-center">
    <oc-button
      :id="editShareBtnId"
      v-oc-tooltip="dropButtonTooltip"
      class="collaborator-edit-dropdown-options-btn raw-hover-surface p-1"
      :aria-label="
        isLocked ? dropButtonTooltip : $gettext('Open context menu with share editing options')
      "
      appearance="raw"
      :disabled="isLocked"
    >
      <oc-icon name="more-2" />
    </oc-button>
    <oc-drop
      ref="expirationDateDrop"
      :title="$gettext('Edit share')"
      :toggle="'#' + editShareBtnId"
      mode="click"
      padding-size="small"
      close-on-click
    >
      <oc-list class="collaborator-edit-dropdown-options-list" :aria-label="shareEditOptions">
        <li v-for="(option, i) in options" :key="i">
          <context-menu-item :option="option" />
        </li>
        <li v-if="sharedParentRoute">
          <context-menu-item :option="navigateToParentOption" />
        </li>
      </oc-list>
      <oc-list
        v-if="canRemove"
        class="collaborator-edit-dropdown-options-list collaborator-edit-dropdown-options-list-remove pt-2 mt-2 border-t"
      >
        <li>
          <context-menu-item :option="removeShareOption" />
        </li>
      </oc-list>
    </oc-drop>
    <oc-info-drop
      ref="accessDetailsDrop"
      :toggle="'#' + editShareBtnId"
      class="share-access-details-drop [&_dl]:grid [&_dl]:gap-x-4 [&_dl]:gap-y-1 [&_dl]:grid-cols-[max-content_auto] [&_dt]:col-start-1 [&_dd]:col-start-2"
      v-bind="{
        title: $gettext('Access details'),
        list: accessDetails
      }"
      mode="manual"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, PropType, Ref, unref, useTemplateRef } from 'vue'
import { DateTime } from 'luxon'
import { ContextualHelperDataListItem, uniqueId } from '@opencloud-eu/design-system/helpers'
import { OcDrop, OcInfoDrop } from '@opencloud-eu/design-system/components'
import { Resource } from '@opencloud-eu/web-client'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { useConfigStore, useModals, DatePickerModal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { RouteLocationNamedRaw } from 'vue-router'
import ContextMenuItem from './ContextMenuItem.vue'

export type EditOption = {
  icon: string
  title: string
  additionalAttributes?: Record<string, string>
  class?: string
  isChecked?: Ref<boolean>
  method?: () => void
  to?: RouteLocationNamedRaw
}

export default defineComponent({
  name: 'EditDropdown',
  components: { ContextMenuItem },
  props: {
    expirationDate: {
      type: String,
      required: false,
      default: undefined
    },
    shareCategory: {
      type: String,
      required: false,
      default: null,
      validator: function (value: string) {
        return ['user', 'group'].includes(value) || !value
      }
    },
    canEdit: {
      type: Boolean,
      required: true
    },
    canRemove: {
      type: Boolean,
      required: true
    },
    accessDetails: {
      type: Array as PropType<ContextualHelperDataListItem[]>,
      required: true
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    sharedParentRoute: {
      type: Object as PropType<RouteLocationNamedRaw>,
      default: undefined
    }
  },
  emits: ['expirationDateChanged', 'removeShare', 'notifyShare'],
  setup(props, { emit }) {
    const language = useGettext()
    const { $gettext } = language
    const configStore = useConfigStore()
    const { dispatchModal } = useModals()
    const expirationDateDrop = useTemplateRef<typeof OcDrop>('expirationDateDrop')
    const accessDetailsDrop = useTemplateRef<typeof OcInfoDrop>('accessDetailsDrop')

    const resource = inject<Ref<Resource>>('resource')

    const dropButtonTooltip = computed(() => {
      if (props.isLocked) {
        return $gettext('Resource is temporarily locked, unable to manage share')
      }

      return ''
    })

    const navigateToParentOption = computed<EditOption>(() => {
      return {
        title: $gettext('Navigate to parent'),
        icon: 'folder-shared',
        class: 'navigate-to-parent',
        to: props.sharedParentRoute
      }
    })

    const removeShareOption = computed<EditOption>(() => {
      return {
        title: isProjectSpaceResource(unref(resource))
          ? $gettext('Remove member')
          : $gettext('Remove share'),
        method: () => {
          emit('removeShare')
        },
        class: 'remove-share',
        icon: 'delete-bin-5',
        additionalAttributes: {
          'data-testid': 'collaborator-remove-share-btn'
        }
      }
    })

    return {
      configStore,
      resource,
      expirationDateDrop,
      accessDetailsDrop,
      dropButtonTooltip,
      dispatchModal,
      navigateToParentOption,
      removeShareOption
    }
  },
  computed: {
    options(): EditOption[] {
      const result: EditOption[] = [
        {
          title: this.$gettext('Access details'),
          method: () => this.accessDetailsDrop.$refs.drop.show(),
          icon: 'information',
          class: 'show-access-details'
        }
      ]

      if (this.canEdit && this.isExpirationSupported) {
        result.push({
          title: this.isExpirationDateSet
            ? this.$gettext('Edit expiration date')
            : this.$gettext('Set expiration date'),
          class: 'set-expiration-date recipient-datepicker-btn',
          icon: 'calendar-event',
          method: this.showDatePickerModal
        })
      }

      if (this.isRemoveExpirationPossible) {
        result.push({
          title: this.$gettext('Remove expiration date'),
          class: 'remove-expiration-date',
          icon: 'calendar-close',
          method: this.removeExpirationDate
        })
      }

      if (this.configStore.options.isRunningOnEos) {
        result.push({
          title: this.$gettext('Notify via mail'),
          method: () => this.$emit('notifyShare'),
          icon: 'mail',
          class: 'notify-via-mail'
        })
      }

      return result
    },

    editShareBtnId() {
      return uniqueId('files-collaborators-edit-button-')
    },
    shareEditOptions() {
      return this.$gettext('Context menu of the share')
    },

    editingUser() {
      return this.shareCategory === 'user'
    },

    editingGroup() {
      return this.shareCategory === 'group'
    },

    isExpirationSupported() {
      return this.editingUser || this.editingGroup
    },

    isExpirationDateSet() {
      return !!this.expirationDate
    },

    isRemoveExpirationPossible() {
      return this.canEdit && this.isExpirationSupported && this.isExpirationDateSet
    }
  },
  methods: {
    removeExpirationDate() {
      this.$emit('expirationDateChanged', { expirationDateTime: null })
      this.expirationDateDrop.hide()
    },
    showDatePickerModal() {
      const currentDate = DateTime.fromISO(this.expirationDate)

      this.dispatchModal({
        title: this.$gettext('Set expiration date'),
        hideActions: true,
        customComponent: DatePickerModal,
        customComponentAttrs: () => ({
          currentDate: currentDate.isValid ? currentDate : null,
          minDate: DateTime.now()
        }),
        onConfirm: (expirationDateTime: DateTime) => {
          this.$emit('expirationDateChanged', {
            expirationDateTime
          })
        }
      })
    }
  }
})
</script>
