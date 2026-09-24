<template>
  <div class="flex flex-col gap-3 mt-6">
    <oc-section
      ref="presentationSection"
      v-model:expanded="expanded.presentation"
      class="create-space-presentation"
      :title="$gettext('Customize')"
      :subtitle="presentationFields"
      icon="palette"
      title-tag="h3"
      expandable
      @update:expanded="revealSection(presentationSection, $event)"
    >
      <space-image-picker v-if="!encrypted" v-model="image" />
      <oc-text-input
        id="create-space-subtitle-input"
        v-model="subtitle"
        :label="$gettext('Subtitle')"
      />
      <div v-if="!encrypted" class="create-space-description">
        <span class="inline-block mb-0.5" v-text="$gettext('Description')" />
        <div class="border border-role-outline-variant rounded-lg overflow-hidden bg-role-surface">
          <text-editor-provider :editor="descriptionEditor" :teleport="editorTeleportTarget">
            <text-editor-toolbar />
            <text-editor-content class="min-h-40 max-h-72 py-2 overflow-auto" />
          </text-editor-provider>
        </div>
      </div>
    </oc-section>
    <oc-section
      ref="advancedSection"
      v-model:expanded="expanded.advanced"
      class="create-space-advanced"
      :title="$gettext('Advanced')"
      :subtitle="advancedFields"
      icon="settings-3"
      title-tag="h3"
      expandable
      @update:expanded="revealSection(advancedSection, $event)"
    >
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
    </oc-section>
  </div>
</template>

<script setup lang="ts">
import { ComponentPublicInstance, computed, nextTick, ref, toRef, unref, useTemplateRef } from 'vue'
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

const { encrypted = false, editorTeleportTarget = undefined } = defineProps<{
  encrypted?: boolean
  // The editor's drops teleport to the body by default, where the modal's focus
  // trap would pull focus right back out of their inputs.
  editorTeleportTarget?: string
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

const presentationSection = useTemplateRef<ComponentPublicInstance>('presentationSection')
const advancedSection = useTemplateRef<ComponentPublicInstance>('advancedSection')

async function revealSection(section: ComponentPublicInstance, isExpanded: boolean) {
  if (!isExpanded) {
    return
  }

  // The fields only exist once the section has rendered.
  await nextTick()
  section?.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
  autofocus: false,
  excludeActions: ['frontmatter', 'print'],
  // The cloud picker needs somewhere to browse from, and the space has no files yet.
  currentResource: personalSpace,
  onUpdate: (content) => {
    description.value = content
  }
})
</script>
