<template>
  <div class="space-y-4">
    <oc-card
      title="contact-header"
      appearance="outlined"
      header-class="hidden"
      :body-class="['rounded-2xl', 'bg-role-surface-container', 'p-6']"
    >
      <div class="flex flex-col items-center text-center">
        <oc-avatar class="mb-4" :user-name="displayName" :src="photoUrl" />
        <h2 class="text-xl font-bold" v-text="displayName" />
        <div class="mt-1 text-role-on-surface-variant" v-text="primaryEmail" />
      </div>
    </oc-card>
    <oc-card
      v-for="section in sections"
      :key="section.key"
      :title="section.key"
      appearance="outlined"
      header-class="hidden"
      :body-class="['rounded-2xl', 'bg-role-surface-container', 'p-0', 'overflow-hidden']"
      :data-testid="`contact-details-section-${section.key}`"
    >
      <div class="flex items-center px-4 py-4">
        <div class="flex items-center gap-2">
          <oc-icon :name="section.icon" :fill-type="'line'" />
          <span class="font-bold" v-text="section.title" />
        </div>
        <oc-button
          class="ml-auto"
          appearance="raw"
          no-hover
          :aria-label="collapsed[section.key] ? $gettext('Expand') : $gettext('Collapse')"
          @click="collapsed[section.key] = !collapsed[section.key]"
        >
          <oc-icon
            :name="collapsed[section.key] ? 'arrow-down-s' : 'arrow-up-s'"
            fill-type="line"
          />
        </oc-button>
      </div>
      <oc-list v-if="!collapsed[section.key]" class="m-0">
        <li
          v-for="(row, index) in section.rows"
          :key="`${section.key}-${index}`"
          class="border-t border-role-outline-variant bg-role-surface-container px-4 py-3 first:border-t-0"
        >
          <div class="text-sm text-role-on-surface-variant" v-text="row.label" />
          <div class="mt-1 whitespace-pre-line break-words font-medium" v-text="row.value" />
          <div
            v-if="row.secondary"
            class="mt-1 text-sm text-role-on-surface-variant"
            v-text="row.secondary"
          />
        </li>
      </oc-list>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, toRef } from 'vue'
import { Contact } from '../types'
import { getContactDisplayName, getContactPrimaryEmail } from '../helpers'
import { useContactDetailSections } from '../composables/useContactDetailSections'
import { useContactPhoto } from '../composables/useContactPhoto'

const props = defineProps<{
  contact: Contact
}>()

const contact = toRef(props, 'contact')
const { sections } = useContactDetailSections(contact)
const { photoUrl } = useContactPhoto(contact)

const collapsed = reactive<Record<string, boolean>>({
  basic: false,
  emails: false,
  phones: false,
  addresses: false,
  links: false,
  onlineServices: false,
  organization: true
})

const displayName = computed(() => getContactDisplayName(props.contact) || '')
const primaryEmail = computed(() => getContactPrimaryEmail(props.contact) || '')
</script>
