<template>
  <section
    ref="section"
    tabindex="-1"
    class="oc-support-card relative isolate text-role-on-tertiary-container focus-visible:outline-0! focus-visible:shadow-none!"
    :class="{
      'oc-support-card-collapsed': isCollapsed,
      [`oc-support-card-animate-${heartAnimation}`]: heartAnimation
    }"
    :aria-label="$gettext('Support OpenCloud')"
  >
    <span
      ref="backdrop"
      class="oc-support-card-backdrop absolute inset-y-0 start-0 -z-10 bg-role-tertiary-container"
      :class="isCollapsed ? 'w-12 rounded-[24px]' : 'w-full rounded-xl'"
      aria-hidden="true"
    />
    <oc-button
      v-if="isCollapsed"
      ref="expandButton"
      v-oc-tooltip="$gettext('Support OpenCloud')"
      appearance="raw"
      no-hover
      class="oc-support-card-expand absolute top-0 start-0 z-10 size-12 rounded-full"
      :aria-label="$gettext('Support OpenCloud')"
      :aria-controls="contentId"
      aria-expanded="false"
      @click.stop="setCollapsed(false, $event)"
    />
    <oc-button
      v-else
      ref="collapseButton"
      appearance="raw"
      no-hover
      class="oc-support-card-collapse absolute top-1 end-1 z-10 p-1"
      :aria-label="$gettext('Collapse support card')"
      :aria-controls="contentId"
      aria-expanded="true"
      @click.stop="setCollapsed(true, $event)"
    >
      <oc-icon name="arrow-down-s" fill-type="line" size-class="size-4" />
    </oc-button>
    <div
      :id="contentId"
      class="oc-support-card-content flex flex-col"
      :class="isCollapsed ? 'p-1.5' : 'px-3 pt-3 pb-2'"
    >
      <div class="flex items-center gap-3">
        <span
          ref="heart"
          class="oc-support-card-heart-circle relative inline-flex items-center justify-center shrink-0 size-9 rounded-full bg-role-surface"
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
        <div
          class="oc-support-card-collapsible grid min-w-0"
          :class="collapsibleClasses"
          :inert="isCollapsed"
        >
          <div class="flex flex-col gap-0.5 min-h-0 overflow-hidden">
            <span class="font-bold pe-5" v-text="$gettext('Support OpenCloud')" />
            <span
              class="text-xs text-role-on-surface-variant"
              v-text="$gettext('Donate or get professional support')"
            />
          </div>
        </div>
      </div>
      <div
        class="oc-support-card-collapsible grid"
        :class="collapsibleClasses"
        :inert="isCollapsed"
      >
        <div class="min-h-0 overflow-hidden -mx-1">
          <div class="flex flex-wrap gap-2 px-1 pt-3 pb-1">
            <oc-button
              type="a"
              :href="donateUrl"
              target="_blank"
              rel="noopener noreferrer"
              appearance="outline"
              color-role="tertiary"
              class="oc-support-card-donate flex-1"
            >
              <span v-text="$gettext('Donate')" />
            </oc-button>
            <oc-button
              type="a"
              :href="buySupportUrl"
              target="_blank"
              rel="noopener noreferrer"
              appearance="filled"
              color-role="tertiary"
              class="oc-support-card-buy-support flex-1 whitespace-nowrap"
            >
              <span v-text="$gettext('Buy support')" />
            </oc-button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
let hasAnimated = false
</script>

<script setup lang="ts">
import { ComponentPublicInstance, computed, nextTick, ref, unref, useId, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'

type HeartAnimation = 'beat' | 'celebrate'

const collapsedStorageKey = 'oc_supportCardCollapsed'
const dismissedStorageKey = 'oc_supportCardDismissed'

const language = useGettext()
const contentId = `oc-support-card-content-${useId()}`

const expandButton = useTemplateRef<ComponentPublicInstance>('expandButton')
const collapseButton = useTemplateRef<ComponentPublicInstance>('collapseButton')
const heart = useTemplateRef<HTMLElement>('heart')
const section = useTemplateRef<HTMLElement>('section')
const backdrop = useTemplateRef<HTMLElement>('backdrop')

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

function loadCollapsed() {
  // the card was dismissable before, a dismissed card starts collapsed now
  if (window.localStorage.getItem(dismissedStorageKey) === 'true') {
    window.localStorage.setItem(collapsedStorageKey, 'true')
  }
  window.localStorage.removeItem(dismissedStorageKey)
  return window.localStorage.getItem(collapsedStorageKey) === 'true'
}

const isCollapsed = ref(loadCollapsed())

const heartAnimation = ref<HeartAnimation>(null)
if (!hasAnimated) {
  heartAnimation.value = unref(isCollapsed) ? 'beat' : 'celebrate'
}
hasAnimated = true

const collapsibleClasses = computed(() =>
  unref(isCollapsed) ? 'grid-rows-[0fr] opacity-0 invisible' : 'grid-rows-[1fr]'
)

async function playHeartAnimation(animation: HeartAnimation) {
  heartAnimation.value = null
  await nextTick()
  // force a style recalc without the animation, so the same one can start again
  unref(heart)?.getBoundingClientRect()
  heartAnimation.value = animation
}

async function setCollapsed(collapsed: boolean, event: MouseEvent) {
  const hadVisibleFocus = (event.currentTarget as HTMLElement).matches(':focus-visible')
  // the clicked toggle gets removed, keep the focus in the card (e.g. for the mobile menu dialog)
  unref(section).focus()

  isCollapsed.value = collapsed
  if (collapsed) {
    window.localStorage.setItem(collapsedStorageKey, 'true')
  } else {
    window.localStorage.removeItem(collapsedStorageKey)
  }
  playHeartAnimation(collapsed ? 'beat' : 'celebrate')

  // keyboard users continue on the other toggle once the card has its new size,
  // the tooltip of the expand button gets positioned only when it shows
  if (!hadVisibleFocus) {
    return
  }
  await nextTick()
  await Promise.allSettled(
    unref(backdrop)
      .getAnimations()
      .map(({ finished }) => finished)
  )
  if (document.activeElement !== unref(section)) {
    return
  }
  unref(collapsed ? expandButton : collapseButton)?.$el.focus()
}
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

@keyframes oc-support-card-fade-in {
  0% {
    opacity: 0;
  }
}

@keyframes oc-support-card-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (prefers-reduced-motion: no-preference) {
  /* expanding grows the card before the content fades in, collapsing fades it out first */
  .oc-support-card-backdrop {
    transition:
      width 0.3s ease-out,
      border-radius 0.3s ease-out;
  }

  .oc-support-card-content {
    transition: padding 0.3s ease-out;
  }

  .oc-support-card-collapsible {
    transition:
      grid-template-rows 0.3s ease-out,
      opacity 0.2s ease-out 0.15s;
  }

  .oc-support-card-collapsed :is(.oc-support-card-backdrop, .oc-support-card-content) {
    transition-delay: 0.1s;
  }

  .oc-support-card-collapsed .oc-support-card-collapsible {
    transition:
      grid-template-rows 0.3s ease-out 0.1s,
      opacity 0.1s ease-out,
      visibility 0s 0.4s;
  }

  .oc-support-card-animate-celebrate .oc-support-card-collapse {
    animation: oc-support-card-fade-in 0.2s ease-out 0.15s 1 backwards;
  }

  .oc-support-card-animate-celebrate .oc-support-card-heart {
    animation: oc-support-card-beat 1.1s ease-in-out 0.5s 1;
  }

  .oc-support-card-animate-celebrate .oc-support-card-floating-heart {
    animation: oc-support-card-float 1s ease-out 1 backwards;
  }

  .oc-support-card-animate-beat .oc-support-card-heart {
    animation: oc-support-card-beat 1.1s ease-in-out 0.3s 1;
  }

  .oc-support-card-expand:is(:hover, :focus-visible) ~ * .oc-support-card-heart-circle {
    animation: oc-support-card-pulse 0.6s ease-in-out 1;
  }
}
</style>
