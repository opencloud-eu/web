<template>
  <section
    class="oc-support-card flex flex-col gap-3 p-3 rounded-xl bg-role-tertiary-container text-role-on-tertiary-container"
    :aria-label="$gettext('Support OpenCloud')"
  >
    <div class="flex items-center gap-3">
      <span
        class="relative inline-flex items-center justify-center shrink-0 size-9 rounded-full bg-role-surface"
        :class="{ 'oc-support-card-animated': animate }"
        aria-hidden="true"
      >
        <oc-icon
          name="heart"
          fill-type="fill"
          color="var(--oc-role-tertiary)"
          class="oc-support-card-heart"
        />
        <oc-icon
          v-for="(floatingHeart, index) in floatingHearts"
          :key="index"
          name="heart"
          fill-type="fill"
          color="var(--oc-role-tertiary)"
          :size-class="floatingHeart.sizeClass"
          class="oc-support-card-floating-heart absolute bottom-5 opacity-0 pointer-events-none"
          :style="{ left: floatingHeart.left, animationDelay: floatingHeart.delay }"
        />
      </span>
      <div class="flex flex-col gap-0.5">
        <span class="font-bold" v-text="$gettext('Support OpenCloud')" />
        <span
          class="text-xs text-role-on-surface-variant"
          v-text="$gettext('Donate or get professional support')"
        />
      </div>
    </div>
    <oc-button
      :id="toggleId"
      appearance="filled"
      color-role="tertiary"
      class="oc-support-card-toggle w-full"
    >
      <span v-text="$gettext('Support us')" />
      <oc-icon name="arrow-down-s" fill-type="line" />
    </oc-button>
    <oc-drop
      :toggle="`#${toggleId}`"
      mode="click"
      position="top-start"
      padding-size="small"
      close-on-click
      enforce-drop-on-mobile
      class="w-auto min-w-48"
    >
      <oc-list>
        <li>
          <oc-button
            type="a"
            :href="donateUrl"
            target="_blank"
            rel="noopener noreferrer"
            appearance="raw"
            justify-content="left"
            class="oc-support-card-donate"
          >
            <oc-icon name="heart" fill-type="line" />
            <span v-text="$gettext('Donate')" />
          </oc-button>
        </li>
        <li>
          <oc-button
            type="a"
            :href="buySupportUrl"
            target="_blank"
            rel="noopener noreferrer"
            appearance="raw"
            justify-content="left"
            class="oc-support-card-buy-support"
          >
            <oc-icon name="customer-service" fill-type="line" />
            <span v-text="$gettext('Buy support')" />
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </section>
</template>

<script lang="ts">
let hasAnimated = false
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { uniqueId } from '@opencloud-eu/design-system/helpers'

const language = useGettext()

const toggleId = uniqueId('oc-support-card-toggle-')

const donateUrl = 'https://github.com/sponsors/opencloud-eu'

const buySupportUrl = computed(() => {
  const lang = language.current.toLowerCase().startsWith('de') ? 'de' : 'en'
  const url = new URL(`https://opencloud.eu/${lang}/node/2256`)
  url.search = new URLSearchParams({
    mtm_campaign: 'subscription_support',
    mtm_source: 'opencloud_web',
    mtm_medium: 'in_app',
    mtm_content: 'buy_button'
  }).toString()
  return url.toString()
})

const floatingHearts = [
  { left: '4px', delay: '500ms', sizeClass: 'size-2.5' },
  { left: '22px', delay: '850ms', sizeClass: 'size-2' },
  { left: '13px', delay: '1150ms', sizeClass: 'size-2.5' }
]

const animate = !hasAnimated
hasAnimated = true
</script>

<style>
@keyframes oc-support-card-beat {
  0%,
  100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.22);
  }
  50% {
    transform: scale(1);
  }
  75% {
    transform: scale(1.12);
  }
}

@keyframes oc-support-card-float {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-34px) scale(1);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .oc-support-card-animated .oc-support-card-heart {
    animation: oc-support-card-beat 1.1s ease-in-out 0.5s 1;
  }

  .oc-support-card-animated .oc-support-card-floating-heart {
    animation: oc-support-card-float 1s ease-out 1 backwards;
  }
}
</style>
