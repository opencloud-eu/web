<template>
  <oc-button
    id="oc-notifications-bell"
    v-oc-tooltip="notificationsLabel"
    class="relative"
    appearance="raw-inverse"
    color-role="chrome"
    :aria-label="notificationsLabel"
    no-hover
  >
    <oc-icon class="cursor-pointer flex items-center" name="notification-3" fill-type="line" />
    <span
      v-if="notificationCount"
      :key="notificationCount"
      :class="{ 'animate-shake transform-[translate3d(0, 0, 0)]': animate }"
      class="badge absolute top-[-6px] right-[-9px] p-1 text-xs leading-2 font-light text-center bg-red-600 text-white rounded-4xl box-content min-w-2 h-2 shadow-sm"
      v-text="notificationCountLabel"
    />
  </oc-button>
</template>
<script lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { ref } from 'vue'
import { watch } from 'vue'

export default {
  props: {
    notificationCount: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const { $gettext } = useGettext()
    const animate = ref(false)
    const notificationsLabel = computed(() => $gettext('Notifications'))
    const notificationCountLabel = computed(() => {
      if (props.notificationCount > 99) {
        return '99+'
      }
      return `${props.notificationCount}`
    })

    watch(
      () => props.notificationCount,
      () => {
        animate.value = true
        setTimeout(() => {
          animate.value = false
        }, 600)
      }
    )

    return {
      animate,
      notificationsLabel,
      notificationCountLabel
    }
  }
}
</script>
