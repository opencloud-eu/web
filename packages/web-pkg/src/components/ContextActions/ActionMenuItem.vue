<template>
  <li v-oc-tooltip="componentProps.disabled ? action.disabledTooltip?.(actionOptions) : ''">
    <oc-button
      v-oc-tooltip="showTooltip || action.hideLabel ? action.label(actionOptions) : ''"
      :type="componentType"
      v-bind="componentProps"
      :class="[action.class, 'action-menu-item', 'align-middle', 'w-full', ...buttonClasses]"
      :aria-label="
        componentProps.disabled
          ? (action.disabledTooltip?.(actionOptions) ?? action.label(actionOptions))
          : action.label(actionOptions)
      "
      data-testid="action-handler"
      :size="size"
      justify-content="left"
      v-on="componentListeners"
    >
      <oc-image
        v-if="action.img"
        data-testid="action-img"
        :src="action.img"
        alt=""
        class="oc-icon oc-icon-m"
      />
      <oc-image
        v-else-if="hasExternalImageIcon"
        data-testid="action-img"
        :src="actionIcon"
        alt=""
        class="oc-icon oc-icon-m"
      />
      <oc-icon
        v-else-if="actionIcon"
        data-testid="action-icon"
        :name="actionIcon"
        :fill-type="action.iconFillType || 'line'"
        :size="size"
      />
      <span
        v-if="!action.hideLabel"
        class="oc-files-context-action-label flex flex-col"
        data-testid="action-label"
      >
        <span v-text="action.label(actionOptions)" />
      </span>
      <span
        v-if="action.shortcut && shortcutHint"
        class="text-sm flex-row-reverse"
        v-text="action.shortcut"
      />
    </oc-button>
  </li>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { Action, ActionOptions, useConfigStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'

export default defineComponent({
  name: 'ActionMenuItem',
  props: {
    action: {
      type: Object as PropType<Action>,
      required: true
    },
    actionOptions: {
      type: Object as PropType<ActionOptions>,
      required: true
    },
    size: {
      type: String as PropType<'small' | 'medium' | 'large'>,
      required: false,
      default: 'medium'
    },
    appearance: {
      type: String as PropType<AppearanceType>,
      default: 'raw'
    },
    shortcutHint: {
      type: Boolean,
      default: true,
      required: false
    },
    showTooltip: {
      type: Boolean,
      default: false,
      required: false
    },
    buttonClasses: {
      type: Array as PropType<string[]>,
      default: (): string[] => []
    }
  },
  setup(props) {
    const configStore = useConfigStore()
    const { options } = storeToRefs(configStore)

    const componentType = computed<'a' | 'button' | 'router-link'>(() => {
      if (Object.hasOwn(props.action, 'route')) {
        return 'router-link'
      }
      if (Object.hasOwn(props.action, 'href')) {
        return 'a'
      }
      if (Object.hasOwn(props.action, 'handler')) {
        return 'button'
      }
      console.warn(
        'ActionMenuItem: No handler, route or href callback found in action',
        props.action
      )
      return 'button'
    })

    const componentProps = computed(() => {
      const properties = {
        appearance: props.action.appearance || props.appearance,
        ...(props.action.isDisabled && {
          disabled: props.action.isDisabled(props.actionOptions)
        }),
        ...(props.action.id && { id: props.action.id })
      }

      return {
        ...properties,
        ...(unref(componentType) === 'router-link' && {
          to: props.action.route(props.actionOptions)
        }),
        ...(unref(componentType) === 'a' && {
          href: props.action.href(props.actionOptions)
        }),
        ...(['router-link', 'a'].includes(unref(componentType)) && {
          target: options.value.cernFeatures ? ('_blank' as const) : ('_self' as const)
        })
      }
    })

    const actionIcon = computed(() => {
      return typeof props.action.icon === 'function'
        ? props.action.icon(props.actionOptions)
        : props.action.icon
    })

    return {
      componentType,
      componentProps,
      actionIcon
    }
  },
  computed: {
    hasExternalImageIcon() {
      return this.actionIcon && /^https?:\/\//i.test(this.actionIcon)
    },
    componentListeners() {
      if (typeof this.action.handler !== 'function') {
        return {}
      }

      const callback = () =>
        this.action.handler({
          ...this.actionOptions
        })
      if (this.action.keepOpen) {
        return {
          click: (event: Event) => {
            event.stopPropagation()
            callback()
          }
        }
      }
      return {
        click: callback
      }
    }
  }
})
</script>
