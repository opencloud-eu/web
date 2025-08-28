<template>
  <div class="w-full oc-height-1-1">
    <app-loading-spinner />
  </div>
</template>

<script lang="ts">
import { authService } from '../services/auth'
import { queryItemAsString, useRouteQuery } from '@opencloud-eu/web-pkg'
import { defineComponent, unref } from 'vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'LoginPage',
  components: {
    AppLoadingSpinner
  },
  setup() {
    const redirectUrl = useRouteQuery('redirectUrl')
    authService.loginUser(queryItemAsString(unref(redirectUrl)))

    return {}
  }
})
</script>
