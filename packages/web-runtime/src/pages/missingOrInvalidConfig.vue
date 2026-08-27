<template>
  <plain-shell :title="$gettext('Error')">
    <plain-card
      class="w-full max-w-md"
      icon="error-warning"
      :title="$gettext('Missing or invalid config')"
      :description="$gettext('Please check if the OpenCloud server is configured correctly.')"
    >
      <p
        class="my-0 text-role-on-surface-variant"
        v-text="$gettext('Also, make sure to check the browser console for more information.')"
      />
    </plain-card>
  </plain-shell>
</template>

<script setup lang="ts">
import PlainCard from '../components/PlainCard.vue'
import PlainShell from '../components/PlainShell.vue'
</script>
