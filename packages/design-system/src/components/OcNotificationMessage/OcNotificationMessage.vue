<template>
  <div
    class="oc-fade-in oc-flex oc-flex-wrap oc-notification-message oc-box-shadow-medium oc-rounded p-4"
    :class="classes"
  >
    <div class="oc-flex oc-flex-wrap oc-flex-middle oc-flex-1" :role="role" :aria-live="ariaLive">
      <div class="oc-flex oc-flex-middle oc-flex-between oc-width-1-1">
        <div class="oc-flex oc-flex-middle">
          <oc-icon name="information" fill-type="line" class="mr-2" />
          <div class="oc-notification-message-title">
            {{ title }}
          </div>
        </div>
        <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="close">
          <oc-icon name="close" />
        </oc-button>
      </div>
      <div v-if="message || errorLogContent" class="oc-flex oc-flex-between oc-width-1-1 mt-2">
        <span
          v-if="message"
          class="oc-notification-message-content oc-text-muted mr-2"
          v-text="message"
        />
        <oc-button
          v-if="errorLogContent"
          class="oc-notification-message-error-log-toggle-button"
          gap-size="none"
          appearance="raw"
          @click="showErrorLog = !showErrorLog"
        >
          <span v-text="$gettext('Details')"></span>
          <oc-icon :name="showErrorLog ? 'arrow-up-s' : 'arrow-down-s'" />
        </oc-button>
      </div>
      <oc-error-log v-if="showErrorLog" class="mt-4" :content="errorLogContent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, unref } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcButton from '../OcButton/OcButton.vue'
import OcErrorLog from '../OcErrorLog/OcErrorLog.vue'

export interface Props {
  /**
   * @docs The title of the notification message.
   */
  title: string
  /**
   * @docs The content of the error log that can be copied.
   */
  errorLogContent?: string
  /**
   * @docs The message of the notification.
   */
  message?: string
  /**
   * @docs The status of the notification message.
   * @default passive
   */
  status?: 'passive' | 'primary' | 'success' | 'warning' | 'danger'
  /**
   * @docs The timeout in seconds after which the notification message will be closed.
   * @default 5
   */
  timeout?: number
}

export interface Emits {
  /**
   * @docs Emitted when the notification message has been closed.
   */
  (e: 'close'): void
}

const { title, errorLogContent, message, status = 'passive', timeout = 5 } = defineProps<Props>()

const emit = defineEmits<Emits>()

const showErrorLog = ref(false)

const classes = computed(() => `oc-notification-message-${status}`)
const isStatusDanger = computed(() => status === 'danger')
const role = computed(() => (unref(isStatusDanger) ? 'alert' : 'status'))
const ariaLive = computed(() => (unref(isStatusDanger) ? 'assertive' : 'polite'))

const close = () => {
  emit('close')
}

onMounted(() => {
  if (timeout !== 0) {
    setTimeout(() => {
      close()
    }, timeout * 1000)
  }
})
</script>

<style lang="scss">
.oc-notification-message {
  background-color: var(--oc-role-surface) !important;
  margin-top: var(--oc-space-small);
  position: relative;
  word-break: break-word;

  &-title {
    font-size: 1.15rem;
  }

  &-error-log-toggle-button {
    word-break: keep-all;
  }
}
</style>
