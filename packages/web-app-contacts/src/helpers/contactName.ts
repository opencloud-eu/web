import type { Contact } from '../types'

export const getContactNameParts = (contact: Contact) => {
  const components = contact.name?.components || []
  const givenName = components.find((component) => component.kind === 'given')?.value?.trim() || ''
  const surname = components.find((component) => component.kind === 'surname')?.value?.trim() || ''

  return {
    givenName,
    surname
  }
}
