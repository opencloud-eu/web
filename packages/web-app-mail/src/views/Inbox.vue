<template>MOIN MOIN</template>

<script lang="ts">
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { defineComponent, onMounted } from 'vue'
import { useTask } from 'vue-concurrency'

const configStore = useConfigStore()
const clientService = useClientService()

const loadAllMailsTask = useTask(function* (signal) {
  try {
    const mails = yield clientService.httpAuthenticated.get(
      urlJoin(configStore.groupwareUrl, 'accounts/all/emails/latest/summary'),
      {
        signal
      }
    )
    console.log(mails)
  } catch (e) {
    console.error(e)
  }
})

onMounted(() => {
  loadAllMailsTask.perform()
  console.log('Inbox mounted')
})
</script>
