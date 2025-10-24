<template>
  <div class="mailbox-tree h-full px-1">
    <h1 class="text-lg ml-4" v-text="$gettext('test@setwhenaccloaded.org')" />
    <app-loading-spinner v-if="isMailboxesLoading" />
    <template v-else>
      <no-content-message v-if="!mailboxes.length" icon="folder-reduce" icon-fill-type="line">
        <template #message>
          <span v-text="$gettext('No mailboxes found')" />
        </template>
      </no-content-message>
      <div v-else>
        <oc-list class="mailbox-tree mt-1">
          <li v-for="mailbox in mailboxes" :key="mailbox.key" class="pb-1 px-2">
            <oc-button
              class="w-full p-2 hover:bg-role-surface-container-highest focus:bg-role-surface-container-highest"
              :class="{ '!bg-role-secondary-container': selectedMailbox?.id === mailbox.id }"
              no-hover
              justify-content="left"
              appearance="raw"
              size="small"
              @click="$emit('select', mailbox)"
            >
              <oc-icon name="folder" class="mr-2" fill-type="line" />
              <span v-text="mailbox.name" />
            </oc-button>
          </li>
        </oc-list>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref } from 'vue'
import { NoContentMessage, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { $gettext } from '@opencloud-eu/web-pkg/src/router/utils'
import { urlJoin } from '@opencloud-eu/web-client'
import { Mailbox, MailboxSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'
import { useTask } from 'vue-concurrency'

const { selectedMailbox = {} } = defineProps<{
  selectedMailbox?: Mailbox
}>()
defineEmits<{
  (e: 'select', payload: Mailbox): void
}>()

const clientService = useClientService()
const configStore = useConfigStore()
const groupwareBaseUrl = computed(() => configStore.groupwareUrl)

const isMailboxesLoading = computed(() => loadMailboxesTask.isRunning || !loadMailboxesTask.last)

const mailboxes = ref<any>(null)

const loadMailboxesTask = useTask(function* (signal) {
  try {
    // We need to send the real account id (as soon we have an account tree)
    const { data }: { data: { mailboxes: Mailbox[] } } = yield clientService.httpAuthenticated.get(
      urlJoin(unref(groupwareBaseUrl), 'accounts/b/mailboxes')
    )
    console.log(data)
    mailboxes.value = MailboxSchema.array().parse(data)
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadMailboxesTask.perform()
})
</script>
