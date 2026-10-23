import { computed, unref, type MaybeRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Contact, ContactAddress } from '../types'

export type ContactDetailRow = {
  label: string
  value: string
  secondary?: string
}

export type ContactDetailSection = {
  key: string
  icon: string
  title: string
  rows: ContactDetailRow[]
}

const addressLines = [['name', 'number'], ['postcode', 'locality'], ['region'], ['country']]

const getAddressComponents = (address: ContactAddress, kinds: string[]) => {
  return (address.components || [])
    .filter(({ kind }) => kinds.includes(kind))
    .map(({ value }) => value?.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Formats an address in multiple lines: street, postal code and city, region, country.
 * Components of other kinds (e.g. post office box, district) are added in an extra line, so no
 * information is hidden. Addresses without components fall back to the full address.
 */
export const formatContactAddress = (address: ContactAddress) => {
  const knownKinds = ['separator', ...addressLines.flat()]
  const otherComponents = (address.components || [])
    .filter(({ kind }) => !knownKinds.includes(kind))
    .map(({ value }) => value?.trim())
    .filter(Boolean)
    .join(', ')

  const lines = [
    ...addressLines.map((kinds) => getAddressComponents(address, kinds)),
    otherComponents
  ].filter(Boolean)

  if (lines.length) {
    return lines.join('\n')
  }

  return typeof address.full === 'string' ? address.full : ''
}

export const useContactDetailSections = (contact: MaybeRef<Contact>) => {
  const { $gettext } = useGettext()

  const getContextLabel = (contexts: Record<string, boolean> = {}, fallback: string) => {
    if (contexts.work) {
      return $gettext('Work')
    }
    if (contexts.private) {
      return $gettext('Private')
    }
    return fallback
  }

  const getNameComponent = (kind: string) => {
    return unref(contact).name?.components?.find((component) => component.kind === kind)?.value
  }

  const sections = computed<ContactDetailSection[]>(() => {
    const { anniversaries, nicknames, notes, emails, phones, addresses, links, onlineServices } =
      unref(contact)

    const birth = Object.values(anniversaries || {}).find((entry) => entry.kind === 'birth')
    const birthday = [birth?.date?.day, birth?.date?.month, birth?.date?.year]
      .filter(Boolean)
      .join('.')

    const detailSections: ContactDetailSection[] = [
      {
        key: 'basic',
        icon: 'account-circle',
        title: $gettext('Basic information'),
        rows: [
          { label: $gettext('First name'), value: getNameComponent('given') },
          { label: $gettext('Last name'), value: getNameComponent('surname') },
          { label: $gettext('Nickname'), value: Object.values(nicknames || {})[0]?.name },
          { label: $gettext('Birthday'), value: birthday },
          { label: $gettext('Note'), value: Object.values(notes || {})[0]?.note }
        ]
      },
      {
        key: 'emails',
        icon: 'mail',
        title: $gettext('Email addresses'),
        rows: Object.values(emails || {}).map((entry) => ({
          label: getContextLabel(entry.contexts, $gettext('Email')),
          value: entry.address
        }))
      },
      {
        key: 'phones',
        icon: 'phone',
        title: $gettext('Phone numbers'),
        rows: Object.values(phones || {}).map((entry) => ({
          label: entry.features?.mobile
            ? $gettext('Mobile')
            : getContextLabel(entry.contexts, $gettext('Phone')),
          value: entry.number
        }))
      },
      {
        key: 'addresses',
        icon: 'home-2',
        title: $gettext('Addresses'),
        rows: Object.values(addresses || {}).map((entry) => ({
          label: getContextLabel(entry.contexts, $gettext('Address')),
          value: formatContactAddress(entry),
          secondary: entry.countryCode
        }))
      },
      {
        key: 'links',
        icon: 'global',
        title: $gettext('Websites'),
        rows: Object.values(links || {}).map((entry) => ({
          label: entry.label || getContextLabel(entry.contexts, $gettext('Website')),
          value: entry.uri
        }))
      },
      {
        key: 'onlineServices',
        icon: 'links',
        title: $gettext('Online services'),
        rows: Object.values(onlineServices || {}).map((entry) => ({
          label: entry.service || $gettext('Online service'),
          value: entry.uri || entry.user
        }))
      },
      {
        key: 'organization',
        icon: 'briefcase-4',
        title: $gettext('Organization'),
        rows: [
          ...Object.values(unref(contact).organizations || {}).map((organization) => ({
            label: $gettext('Organization'),
            value: organization.name,
            secondary: organization.units?.map((unit) => unit.name).join(', ')
          })),
          ...Object.values(unref(contact).titles || {}).map((title) => ({
            label: title.kind === 'role' ? $gettext('Role') : $gettext('Job title'),
            value: title.name
          }))
        ]
      }
    ]

    return detailSections
      .map((section) => ({ ...section, rows: section.rows.filter((row) => row.value) }))
      .filter((section) => section.rows.length)
  })

  return { sections }
}
