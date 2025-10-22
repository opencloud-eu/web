<template>
  <div class="mail-indicators ml-2 flex items-center">
    <oc-tag v-if="mail.threadSize > 1" class="!py-[1px] items-center" size="small">
      <oc-icon size="xsmall" name="arrow-go-back" fill-type="line" />
      <span v-text="mail.threadSize" />
    </oc-tag>
    <oc-icon v-if="mail.hasAttachment" size="small" name="attachment-2" fill-type="none" />
    <oc-icon v-if="mail.keywords?.['$draft']" size="small" name="pencil" fill-type="line" />
    <oc-icon v-if="mail.keywords?.['$flagged']" size="small" name="flag" fill-type="fill" />
    <oc-icon v-if="mail.keywords?.['$answered']" size="small" name="reply" fill-type="fill" />
    <oc-icon
      v-if="mail.keywords?.['$forwarded']"
      class="rotate-180 scale-y-[-1]"
      size="small"
      name="reply"
      fill-type="fill"
    />
    <oc-tag
      v-if="mail?.keywords?.['$phishing'] || mail?.keywords?.['$junk']"
      class="mail-spam-indicator"
      size="small"
      appearance="filled"
    >
      <oc-icon size="small" name="spam" fill-type="fill" color="#996102" />
      <span v-text="$gettext('Spam')" />
    </oc-tag>
  </div>
</template>

<script setup lang="ts">
import { Mail } from '../types'

const { mail } = defineProps<{
  mail: Mail
}>()
</script>

<style scoped>
.mail-spam-indicator {
  background-color: #fff0d7 !important;
  border-color: #fff0d7 !important;
  color: #996102 !important;
}
</style>
