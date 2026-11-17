<template>
  <div class="flex">
    <oc-button
      id="universal-access-toggle"
      v-oc-tooltip="$gettext('Easy and sign language')"
      appearance="raw-inverse"
      color-role="chrome"
      :aria-label="$gettext('Easy and sign language')"
      class="p-0.5 -m-0.5"
      no-hover
    >
      <oc-icon name="accessibility" fill-type="line" />
    </oc-button>
    <oc-drop
      :title="$gettext('Easy and sign language')"
      drop-id="universal-access-drop"
      toggle="#universal-access-toggle"
      mode="click"
      close-on-click
      padding-size="small"
      class="w-auto min-w-3xs"
    >
      <oc-list>
        <li v-if="currentTheme.urls?.easyLanguage" class="universal-access-easy-language">
          <oc-button
            appearance="raw"
            type="a"
            :href="currentTheme.urls.easyLanguage"
            target="_blank"
            rel="noopener noreferrer"
            justify-content="left"
          >
            <oc-icon name="easy-language" fill-type="line" />
            <span v-text="$gettext('Easy Language')" />
          </oc-button>
        </li>
        <li v-if="currentTheme.urls?.signLanguage" class="universal-access-sign-language">
          <oc-button
            appearance="raw"
            type="a"
            :href="currentTheme.urls.signLanguage"
            target="_blank"
            rel="noopener noreferrer"
            justify-content="left"
          >
            <oc-icon name="sign-language" fill-type="line" />
            <span v-text="$gettext('Sign Language')" />
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@opencloud-eu/web-pkg'

const { currentTheme } = storeToRefs(useThemeStore())
</script>
