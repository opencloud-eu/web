<template>
  <div class="space-y-4">
    <oc-card
      title="contact-header"
      appearance="outlined"
      header-class="hidden"
      :body-class="['rounded-2xl', 'bg-role-surface-container', 'p-6']"
    >
      <div class="flex flex-col items-center text-center">
        <oc-avatar class="mb-4" :user-name="displayName" />
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
    >
      <div class="flex items-center justify-between px-4 py-4">
        <span class="font-bold" v-text="section.title" />
        <oc-button
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
          v-for="row in section.rows"
          :key="`${section.key}-${row.label}-${row.value}`"
          class="border-t border-role-outline-variant bg-role-surface-container px-4 py-3 first:border-t-0"
        >
          <div class="text-sm text-role-on-surface-variant" v-text="row.label" />
          <div class="mt-1 break-words font-medium" v-text="row.value" />
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
import { computed, reactive } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Contact } from '../types'
import { getContactDisplayName, getContactPrimaryEmail } from '../helpers'

const { $gettext } = useGettext()

const props = defineProps<{
  contact: Contact
}>()

type DetailRow = {
  label: string
  value: string
  secondary?: string
}

type DetailSection = {
  key: string
  title: string
  rows: DetailRow[]
}

const collapsed = reactive<Record<string, boolean>>({
  basic: false,
  emails: false,
  phones: false,
  addresses: true,
  organization: true
})

const displayName = getContactDisplayName(props.contact) || ''
const primaryEmail = getContactPrimaryEmail(props.contact) || ''

const sections = computed<DetailSection[]>(() => {
  const birth = Object.values(props.contact.anniversaries || {}).find(
    (entry) => entry.kind === 'birth'
  )
  const birthday = [birth?.date?.day, birth?.date?.month, birth?.date?.year]
    .filter(Boolean)
    .join('.')

  const firstOrganization = Object.values(props.contact.organizations || {})[0]
  const firstTitle = Object.values(props.contact.titles || {})[0]

  return [
    {
      key: 'basic',
      title: $gettext('Basic information'),
      rows: [
        { label: $gettext('First name'), value: getNameComponent('given') },
        { label: $gettext('Last name'), value: getNameComponent('surname') },
        {
          label: $gettext('Nickname'),
          value: Object.values(props.contact.nicknames || {})[0]?.name || ''
        },
        { label: $gettext('Birthday'), value: birthday },
        { label: $gettext('Note'), value: Object.values(props.contact.notes || {})[0]?.note || '' }
      ].filter((row) => row.value)
    },
    {
      key: 'emails',
      title: $gettext('Email addresses'),
      rows: Object.values(props.contact.emails || {})
        .map(
          (entry): DetailRow => ({
            label: $gettext('Email'),
            value: entry.address
          })
        )
        .filter((row) => row.value)
    },
    {
      key: 'phones',
      title: $gettext('Phone numbers'),
      rows: Object.values(props.contact.phones || {})
        .map(
          (entry): DetailRow => ({
            label: $gettext('Phone'),
            value: entry.number
          })
        )
        .filter((row) => row.value)
    },
    {
      key: 'addresses',
      title: $gettext('Addresses'),
      rows: Object.values(props.contact.addresses || {})
        .map(
          (entry): DetailRow => ({
            label: $gettext('Address'),
            value: (entry.components || [])
              .map((component) => component.value)
              .filter(Boolean)
              .join(', '),
            secondary: entry.countryCode || ''
          })
        )
        .filter((row) => row.value)
    },
    {
      key: 'organization',
      title: $gettext('Organization'),
      rows: [
        { label: $gettext('Organization'), value: firstOrganization?.name || '' },
        {
          label: $gettext('Department'),
          value: firstOrganization?.units?.map((unit) => unit.name).join(', ') || ''
        },
        { label: $gettext('Job title'), value: firstTitle?.name || '' }
      ].filter((row) => row.value)
    }
  ].filter((section) => section.rows.length)
})

function getNameComponent(kind: string) {
  return props.contact.name?.components?.find((component) => component.kind === kind)?.value || ''
}
</script>
