<template>
  <div class="mailbox-tree h-full">
    <no-content-message v-if="0" icon="folder-reduce" icon-fill-type="line">
      <template #message>
        <span v-text="$gettext('No accounts found')" />
      </template>
    </no-content-message>
    <div v-else>
      <span class="mailbox-name text-role-on-surface-variant" v-text="'test@asd.org'" />

      <oc-list class="mailbox-tree mt-1">
        <li class="pl-2 pr-4 py-2">
          <oc-button
            class="w-full justify-start rounded-xl"
            appearance="raw"
            size="large"
            @click="emitSelectedMailbox('', 'all', $gettext('All emails'))"
          >
            <oc-icon name="folder" class="" fill-type="fill" />
            <span class="ml-2" v-text="$gettext('All emails')" />
          </oc-button>
        </li>
        <li
          v-for="mb in mailboxes"
          :key="mb.key"
          class="mailbox-tree-item rounded-xl bg-role-surface-container-lowest pl-2 pr-4 py-2"
        >
          <oc-button
            appearance="raw"
            size="small"
            @click="emitSelectedMailbox(mb.accountId, mb.id, mb.name)"
          >
            <oc-icon name="folder" class="mr-2" fill-type="line" />
            <span v-text="mb.name" />
          </oc-button>
        </li>
      </oc-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref } from 'vue'
import { NoContentMessage, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { $gettext } from '@opencloud-eu/web-pkg/src/router/utils'
import { urlJoin } from '@opencloud-eu/web-client'

const emit = defineEmits<{
  (e: 'select', payload: { accountId: string; mailboxId: string; mailboxName: string }): void
}>()

const emitSelectedMailbox = (accountId: string, mailboxId: string, mailboxName: string) => {
  emit('select', { accountId, mailboxId, mailboxName })
}

const clientService = useClientService()
const configStore = useConfigStore()
const groupwareBaseUrl = computed(() => configStore.groupwareUrl)

const loadedData = ref<any>(null)

type UiMailbox = {
  accountId: string
  id: string
  name: string
  role?: string | null
  unreadEmails?: number
  key: string
}

const mailboxes = computed<UiMailbox[]>(() => {
  if (
    !unref(loadedData) ||
    typeof unref(loadedData) !== 'object' ||
    Array.isArray(unref(loadedData))
  )
    return []

  return Object.entries<any>(unref(loadedData)).flatMap(([accId, payload]) =>
    Array.isArray(payload?.mailboxes)
      ? payload.mailboxes.map(
          (mb: any): UiMailbox => ({
            accountId: String(accId),
            id: String(mb.id),
            name: String(mb.name ?? mb.role ?? 'Mailbox'),
            role: mb.role ?? null,
            unreadEmails: typeof mb.unreadEmails === 'number' ? mb.unreadEmails : undefined,
            key: `${accId}:${mb.id}`
          })
        )
      : []
  )
})

const loadMailboxes = async () => {
  try {
    const { data } = await clientService.httpAuthenticated.get(
      urlJoin(unref(groupwareBaseUrl), 'accounts/all/mailboxes')
    )
    loadedData.value = data
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadMailboxes()
})
</script>
