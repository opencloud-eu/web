import type { Contact } from '../types'

export const getContactPrimaryEmail = (contact: Contact) => {
  return Object.values(contact.emails || {}).find((entry) => entry?.address)?.address
}

export const getContactDisplayName = (contact: Contact) => {
  const fullName = contact.name?.full?.trim() || ''
  if (fullName) {
    return fullName
  }

  const components = contact.name?.components || []
  const separator = contact.name?.defaultSeparator || ' '
  const combinedComponents = components
    .map((component) => component.value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(separator)
    .trim()

  return combinedComponents
}
