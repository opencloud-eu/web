import type { Contact } from '../types'
import * as EmailValidator from 'email-validator'

export type ContactFormContext = 'private' | 'work' | 'other'
export type ContactFormPhoneContext = ContactFormContext | 'mobile'

export type ContactFormEntry<C extends string> = {
  key: string
  value: string
  context: C
}

export type ContactFormEmail = ContactFormEntry<ContactFormContext>
export type ContactFormPhone = ContactFormEntry<ContactFormPhoneContext>

export type ContactFormAddress = {
  key: string
  street: string
  postcode: string
  locality: string
  region: string
  country: string
  context: ContactFormContext
}

export type ContactFormState = {
  firstName: string
  lastName: string
  nickname: string
  emails: ContactFormEmail[]
  phones: ContactFormPhone[]
  addresses: ContactFormAddress[]
  organization: string
  department: string
  jobTitle: string
  note: string
}

export type CreateContactPayload = Partial<Omit<Contact, 'id'>>

type AddressField = 'street' | 'postcode' | 'locality' | 'region' | 'country'

// JSContact address component kind for each address form field
export const addressComponentKinds: Record<AddressField, string> = {
  street: 'name',
  postcode: 'postcode',
  locality: 'locality',
  region: 'region',
  country: 'country'
}

const addressFields = Object.keys(addressComponentKinds) as AddressField[]

let entryKeyCounter = 0

/**
 * JSContact stores emails, phones and addresses as maps. New form entries need a key that is
 * unique within the form, the server keeps it as the map key.
 */
export const createEntryKey = (prefix: string) => {
  entryKeyCounter += 1
  return `${prefix}${entryKeyCounter}`
}

export const createEmptyEmail = (): ContactFormEmail => ({
  key: createEntryKey('e'),
  value: '',
  context: 'private'
})

export const createEmptyPhone = (): ContactFormPhone => ({
  key: createEntryKey('p'),
  value: '',
  context: 'mobile'
})

export const createEmptyAddress = (): ContactFormAddress => ({
  key: createEntryKey('a'),
  street: '',
  postcode: '',
  locality: '',
  region: '',
  country: '',
  context: 'private'
})

export const createEmptyContactFormState = (): ContactFormState => ({
  firstName: '',
  lastName: '',
  nickname: '',
  emails: [createEmptyEmail()],
  phones: [createEmptyPhone()],
  addresses: [],
  organization: '',
  department: '',
  jobTitle: '',
  note: ''
})

const isFilled = (value: string) => value.trim().length > 0

const isAddressFilled = (address: ContactFormAddress) => {
  return addressFields.some((field) => isFilled(address[field]))
}

export const hasContactFormValue = (state: ContactFormState) => {
  return (
    [
      state.firstName,
      state.lastName,
      state.nickname,
      state.organization,
      state.department,
      state.jobTitle,
      state.note
    ].some(isFilled) ||
    state.emails.some(({ value }) => isFilled(value)) ||
    state.phones.some(({ value }) => isFilled(value)) ||
    state.addresses.some(isAddressFilled)
  )
}

export const isContactEmailInvalid = (email: string) => {
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    return false
  }

  return !EmailValidator.validate(trimmedEmail)
}

export const hasInvalidContactEmail = (state: ContactFormState) => {
  return state.emails.some(({ value }) => isContactEmailInvalid(value))
}

const getContexts = (context: ContactFormPhoneContext) => {
  if (context !== 'private' && context !== 'work') {
    return {}
  }
  return { contexts: { [context]: true } }
}

const toRecord = <T extends { key: string }, R>(entries: T[], mapper: (entry: T) => R) => {
  return Object.fromEntries(entries.map((entry) => [entry.key, mapper(entry)]))
}

export const createContactPayload = (
  state: ContactFormState,
  addressBookId: string
): CreateContactPayload => {
  const firstName = state.firstName.trim()
  const lastName = state.lastName.trim()
  const nickname = state.nickname.trim()
  const organization = state.organization.trim()
  const department = state.department.trim()
  const jobTitle = state.jobTitle.trim()
  const note = state.note.trim()

  const emails = state.emails.filter(({ value }) => isFilled(value))
  const phones = state.phones.filter(({ value }) => isFilled(value))
  const addresses = state.addresses.filter(isAddressFilled)

  const nameComponents = [
    ...(firstName ? [{ kind: 'given', value: firstName }] : []),
    ...(lastName ? [{ kind: 'surname', value: lastName }] : [])
  ]

  return {
    addressBookIds: {
      [addressBookId]: true
    },
    kind: 'individual',
    ...(nameComponents.length ? { name: { components: nameComponents } } : {}),
    ...(nickname ? { nicknames: { k1: { name: nickname } } } : {}),
    ...(emails.length
      ? {
          emails: toRecord(emails, ({ value, context }) => ({
            address: value.trim(),
            ...getContexts(context)
          }))
        }
      : {}),
    ...(phones.length
      ? {
          phones: toRecord(phones, ({ value, context }) => ({
            number: value.trim(),
            ...getContexts(context),
            ...(context === 'mobile' ? { features: { mobile: true } } : {})
          }))
        }
      : {}),
    ...(addresses.length
      ? {
          addresses: toRecord(addresses, (address) => ({
            components: addressFields
              .map((field) => ({
                kind: addressComponentKinds[field],
                value: address[field].trim()
              }))
              .filter(({ value }) => value),
            ...getContexts(address.context)
          }))
        }
      : {}),
    ...(organization || department
      ? {
          organizations: {
            o1: {
              name: organization,
              ...(department ? { units: [{ name: department }] } : {})
            }
          }
        }
      : {}),
    ...(jobTitle ? { titles: { t1: { name: jobTitle, kind: 'title' } } } : {}),
    ...(note ? { notes: { n1: { note } } } : {})
  }
}
