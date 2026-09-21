<template>
  <div class="flex flex-col gap-3 mt-6">
    <section class="create-space-presentation rounded-lg bg-role-surface-container p-3">
      <oc-button
        class="create-space-presentation-toggle w-full"
        gap-size="xsmall"
        appearance="raw"
        justify-content="space-between"
        no-hover
        :aria-expanded="expanded.presentation"
        @click="toggleSection('presentation', $event)"
      >
        <span class="flex flex-row items-center gap-4">
          <oc-icon
            name="image"
            fill-type="line"
            size-class="size-5"
            color="var(--oc-role-on-surface)"
          />
          <span class="flex flex-col items-start">
            <span class="font-semibold text-role-on-surface" v-text="$gettext('Presentation')" />
            <span class="text-sm text-role-on-surface-variant" v-text="presentationFields" />
          </span>
        </span>
        <oc-icon
          :name="expanded.presentation ? 'arrow-up-s' : 'arrow-down-s'"
          fill-type="line"
          size-class="size-5"
          color="var(--oc-role-on-surface)"
        />
      </oc-button>
      <div v-if="expanded.presentation" class="flex flex-col gap-4 pt-4 pl-9">
        <space-image-picker v-if="!encrypted" v-model="image" />
        <oc-text-input
          id="create-space-subtitle-input"
          v-model="subtitle"
          :label="$gettext('Subtitle')"
        />
        <div v-if="!encrypted" class="create-space-description">
          <span class="inline-block mb-0.5" v-text="$gettext('Description')" />
          <div
            class="border border-role-outline-variant rounded-lg overflow-hidden bg-role-surface"
          >
            <text-editor-provider :editor="descriptionEditor">
              <text-editor-toolbar />
              <text-editor-content class="min-h-40 max-h-72 py-2 overflow-auto" />
            </text-editor-provider>
          </div>
        </div>
      </div>
    </section>
    <section class="create-space-advanced rounded-lg bg-role-surface-container p-3">
      <oc-button
        class="create-space-advanced-toggle w-full"
        gap-size="xsmall"
        appearance="raw"
        justify-content="space-between"
        no-hover
        :aria-expanded="expanded.advanced"
        @click="toggleSection('advanced', $event)"
      >
        <span class="flex flex-row items-center gap-4">
          <oc-icon
            name="settings-3"
            fill-type="line"
            size-class="size-5"
            color="var(--oc-role-on-surface)"
          />
          <span class="flex flex-col items-start">
            <span class="font-semibold text-role-on-surface" v-text="$gettext('Advanced')" />
            <span class="text-sm text-role-on-surface-variant" v-text="advancedFields" />
          </span>
        </span>
        <oc-icon
          :name="expanded.advanced ? 'arrow-up-s' : 'arrow-down-s'"
          fill-type="line"
          size-class="size-5"
          color="var(--oc-role-on-surface)"
        />
      </oc-button>
      <div v-if="expanded.advanced" class="flex flex-col gap-4 pt-4 pl-9">
        <quota-select
          v-if="canSetQuota"
          id="create-space-quota-input"
          class="create-space-quota"
          :total-quota="quota"
          :max-quota="spacesMaxQuota"
          :position-fixed="true"
          @selected-option-change="quota = $event.value"
        />
        <space-member-select v-model="members" v-model:role-id="memberRoleId" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import {
  QuotaSelect,
  SpaceMemberInvite,
  useAbility,
  useCapabilityStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/web-pkg/editor'
import SpaceImagePicker from './SpaceImagePicker.vue'
import SpaceMemberSelect from './SpaceMemberSelect.vue'

const { encrypted = false } = defineProps<{
  encrypted?: boolean
}>()

const quota = defineModel<number>('quota', { default: 0 })
const subtitle = defineModel<string>('subtitle', { default: '' })
const description = defineModel<string>('description', { default: '' })
const image = defineModel<ArrayBuffer>('image', { default: null })
const members = defineModel<SpaceMemberInvite[]>('members', { default: () => [] })
const memberRoleId = defineModel<string>('memberRoleId', { default: '' })

const { $gettext } = useGettext()
const { can } = useAbility()
const capabilityStore = useCapabilityStore()
const spacesStore = useSpacesStore()
const { spacesMaxQuota } = storeToRefs(capabilityStore)
const { personalSpace } = storeToRefs(spacesStore)

const expanded = ref({ presentation: true, advanced: false })

const canSetQuota = computed(() => can('set-quota-all', 'Drive'))

async function toggleSection(name: 'presentation' | 'advanced', event: MouseEvent) {
  // Captured now - `currentTarget` is gone by the time the render settles.
  const section = (event.currentTarget as HTMLElement).closest('section')
  expanded.value[name] = !unref(expanded)[name]

  if (!unref(expanded)[name]) {
    return
  }

  // The fields only exist once the section has rendered.
  await nextTick()
  section?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

const presentationFields = computed(() =>
  [!encrypted && $gettext('Image'), $gettext('Subtitle'), !encrypted && $gettext('Description')]
    .filter(Boolean)
    .join(', ')
)
const advancedFields = computed(() =>
  [unref(canSetQuota) && $gettext('Quota'), $gettext('Members')].filter(Boolean).join(', ')
)

const descriptionEditor = useTextEditor({
  contentType: 'markdown',
  modelValue: toRef(() => unref(description)),
  ariaLabel: $gettext('Space description'),
  // The cloud picker needs somewhere to browse from, and the space has no files yet.
  currentResource: personalSpace,
  onUpdate: (content) => {
    description.value = content
  }
})
</script>
