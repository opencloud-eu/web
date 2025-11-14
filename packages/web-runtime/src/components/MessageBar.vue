<template>
  <oc-notifications :class="{ 'mb-2': limitedMessages.length }">
    <oc-notification-message
      v-for="item in limitedMessages"
      :key="item.id"
      :title="item.title"
      :message="item.desc"
      :status="item.status"
      :timeout="item.timeout"
      :error-log-content="item.errorLogContent"
      :show-info-icon="false"
      @close="deleteMessage(item)"
    >
      <template #actions>
        <oc-list v-if="getVisibleActions(item).length" class="flex gap-2 mt-3 w-full">
          <action-menu-item
            v-for="(action, index) in getVisibleActions(item)"
            :key="index"
            :action="action"
            :action-options="item.actionOptions"
            size="small"
            appearance="outline"
            :shortcut-hint="false"
          />
        </oc-list>
      </template>
    </oc-notification-message>
  </oc-notifications>
</template>

<script setup lang="ts">
import { Message, useMessages, ActionMenuItem } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

const messageStore = useMessages()

const limitedMessages = computed(() => {
  return messageStore.messages ? messageStore.messages.slice(0, 5) : []
})

const deleteMessage = (message: Message) => {
  messageStore.removeMessage(message)
}

const getVisibleActions = (item: Message) => {
  return item.actions?.filter((action) => action.isVisible(item.actionOptions)) || []
}
</script>
