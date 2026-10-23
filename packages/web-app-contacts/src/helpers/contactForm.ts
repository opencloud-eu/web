import { isEqual, omit, pick } from 'lodash-es'
import type { Contact, ContactAddress, ContactName } from '../types'
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
const entryKeySession = Date.now().toString(36)

/**
 * JSContact stores emails, phones and addresses as maps. New form entries need a key that is
 * unique within the contact, the server keeps it as the map key. A plain counter would restart
 * with every page load and could hit a key a saved contact already uses, so the key also
 * contains the time of the page load.
 */
export const createEntryKey = (prefix: string) => {
  entryKeyCounter += 1
  return `${prefix}-${entryKeySession}-${entryKeyCounter.toString(36)}`
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
              ...(organization ? { name: organization } : {}),
              ...(department ? { units: [{ name: department }] } : {})
            }
          }
        }
      : {}),
    ...(jobTitle
      ? {
          titles: {
            t1: {
              name: jobTitle,
              kind: 'title',
              // links the job title to the organization, like "job title at organization"
              ...(organization || department ? { organizationId: 'o1' } : {})
            }
          }
        }
      : {}),
    ...(note ? { notes: { n1: { note } } } : {})
  }
}

export type UpdateContactPayload = Partial<Omit<Contact, 'id'>>

type ContactContexts = Record<string, boolean>

const getFormContext = (contexts: ContactContexts = {}): ContactFormContext => {
  if (contexts.work) {
    return 'work'
  }
  return contexts.private ? 'private' : 'other'
}

// street and house number are separate components in JSContact, the form has one street field
const streetComponentKinds = ['name', 'number']

const getAddressComponent = (address: ContactAddress, kinds: string[]) => {
  return (address.components || [])
    .filter(({ kind }) => kinds.includes(kind))
    .map(({ value }) => value)
    .join(' ')
}

const getFirstEntry = <T>(record: Record<string, T> = {}) => {
  const [key, value] = Object.entries(record)[0] || []
  return { key, value }
}

export const createContactFormState = (contact: Contact): ContactFormState => {
  const nameComponents = contact.name?.components || []
  const getNameComponent = (kind: string) => {
    return nameComponents.find((component) => component.kind === kind)?.value || ''
  }
  const firstName = getNameComponent('given')
  const lastName = getNameComponent('surname')
  const organization = getFirstEntry(contact.organizations).value

  const emails = Object.entries(contact.emails || {}).map(([key, email]): ContactFormEmail => ({
    key,
    value: email.address,
    context: getFormContext(email.contexts)
  }))
  const phones = Object.entries(contact.phones || {}).map(([key, phone]): ContactFormPhone => ({
    key,
    value: phone.number,
    context: phone.features?.mobile ? 'mobile' : getFormContext(phone.contexts)
  }))
  const addresses = Object.entries(contact.addresses || {}).map(
    ([key, address]): ContactFormAddress => ({
      key,
      street: getAddressComponent(address, streetComponentKinds),
      postcode: getAddressComponent(address, ['postcode']),
      locality: getAddressComponent(address, ['locality']),
      region: getAddressComponent(address, ['region']),
      country: getAddressComponent(address, ['country']),
      context: getFormContext(address.contexts)
    })
  )

  return {
    // contacts without name components only have a full name
    firstName: firstName || lastName ? firstName : contact.name?.full || '',
    lastName,
    nickname: getFirstEntry(contact.nicknames).value?.name || '',
    emails: emails.length ? emails : [createEmptyEmail()],
    phones: phones.length ? phones : [createEmptyPhone()],
    addresses,
    organization: organization?.name || '',
    department: organization?.units?.[0]?.name || '',
    jobTitle: getFirstEntry(contact.titles).value?.name || '',
    note: getFirstEntry(contact.notes).value?.note || ''
  }
}

/**
 * Replaces the private and work contexts with the selected one, other contexts are kept.
 */
const mergeContexts = (contexts: ContactContexts = {}, context: ContactFormPhoneContext) => {
  const result = { ...omit(contexts, ['private', 'work']), ...getContexts(context).contexts }
  return Object.keys(result).length ? { contexts: result } : {}
}

/**
 * Builds the JSContact map of a list property. Entries the user didn't touch are kept as they
 * are, changed entries are merged into the existing ones to keep data the form doesn't know.
 */
const mergeEntries = <F extends { key: string }, T extends object>(
  formEntries: F[],
  initialEntries: F[],
  existing: Record<string, T> = {},
  isEntryFilled: (entry: F) => boolean,
  merge: (entry: F, existingEntry: Partial<T>) => T
) => {
  return Object.fromEntries(
    formEntries.filter(isEntryFilled).map((entry) => {
      const existingEntry = existing[entry.key]
      const initialEntry = initialEntries.find(({ key }) => key === entry.key)
      if (existingEntry && isEqual(entry, initialEntry)) {
        return [entry.key, existingEntry]
      }
      return [entry.key, merge(entry, existingEntry || {})]
    })
  )
}

const mergeName = (state: ContactFormState, name: ContactName = {}): ContactName => {
  const firstName = state.firstName.trim()
  const lastName = state.lastName.trim()
  const components = (name.components || []).filter(
    ({ kind }) => !['given', 'surname'].includes(kind)
  )

  return {
    ...omit(name, 'full'),
    components: [
      ...(firstName ? [{ kind: 'given', value: firstName }] : []),
      ...components,
      ...(lastName ? [{ kind: 'surname', value: lastName }] : [])
    ]
  }
}

/**
 * Replaces the value of the first entry of a map, e.g. the first organization.
 */
const mergeFirstEntry = <T extends object>(
  record: Record<string, T> = {},
  defaultKey: string,
  value: Partial<T> | undefined
) => {
  const { key = defaultKey, value: existing } = getFirstEntry(record)
  const otherEntries = omit(record, key)
  if (!value) {
    return otherEntries
  }
  return { [key]: { ...existing, ...value } as T, ...otherEntries }
}

/**
 * Creates the update payload for a contact. It only contains the properties changed in the form,
 * all other properties of the contact stay untouched on the server.
 */
export const createContactUpdatePayload = (
  state: ContactFormState,
  initialState: ContactFormState,
  contact: Contact
): UpdateContactPayload => {
  const payload: UpdateContactPayload = {}
  const hasChanged = (...fields: (keyof ContactFormState)[]) => {
    return fields.some((field) => !isEqual(state[field], initialState[field]))
  }

  if (hasChanged('firstName', 'lastName')) {
    payload.name = mergeName(state, contact.name)
  }

  if (hasChanged('nickname')) {
    const nickname = state.nickname.trim()
    payload.nicknames = mergeFirstEntry(
      contact.nicknames,
      'k1',
      nickname ? { name: nickname } : undefined
    )
  }

  if (hasChanged('emails')) {
    payload.emails = mergeEntries(
      state.emails,
      initialState.emails,
      contact.emails,
      ({ value }) => isFilled(value),
      ({ value, context }, existing) => {
        return {
          ...omit(existing, 'contexts'),
          address: value.trim(),
          ...mergeContexts(existing.contexts, context)
        }
      }
    )
  }

  if (hasChanged('phones')) {
    payload.phones = mergeEntries(
      state.phones,
      initialState.phones,
      contact.phones,
      ({ value }) => isFilled(value),
      ({ value, context }, existing) => {
        const features = omit(existing.features, 'mobile')
        // "mobile" is a feature, the private / work context of a mobile number is kept
        const contexts =
          context === 'mobile'
            ? pick(existing, 'contexts')
            : mergeContexts(existing.contexts, context)
        const mergedFeatures = context === 'mobile' ? { ...features, mobile: true } : features
        return {
          ...omit(existing, ['contexts', 'features']),
          number: value.trim(),
          ...contexts,
          ...(Object.keys(mergedFeatures).length ? { features: mergedFeatures } : {})
        }
      }
    )
  }

  if (hasChanged('addresses')) {
    payload.addresses = mergeEntries(
      state.addresses,
      initialState.addresses,
      contact.addresses,
      isAddressFilled,
      (address, existing) => {
        // an unchanged street keeps its components (e.g. name, number and their separators),
        // only a changed street is written as a single "name" component
        const street = address.street.trim()
        const isStreetChanged = street !== getAddressComponent(existing, streetComponentKinds)
        const otherFields = addressFields.filter((field) => field !== 'street')
        const replacedKinds = [
          ...otherFields.map((field) => addressComponentKinds[field]),
          ...(isStreetChanged ? [...streetComponentKinds, 'separator'] : [])
        ]
        const keptComponents = (existing.components || []).filter(
          ({ kind }) => !replacedKinds.includes(kind)
        )
        return {
          // the full address is outdated as soon as a component changed
          ...omit(existing, ['contexts', 'components', 'full']),
          components: [
            ...(isStreetChanged && street
              ? [{ kind: addressComponentKinds.street, value: street }]
              : []),
            ...keptComponents,
            ...otherFields
              .map((field) => ({
                kind: addressComponentKinds[field],
                value: address[field].trim()
              }))
              .filter(({ value }) => value)
          ],
          ...mergeContexts(existing.contexts, address.context)
        }
      }
    )
  }

  if (hasChanged('organization', 'department')) {
    const organization = state.organization.trim()
    const department = state.department.trim()
    const existingUnits = getFirstEntry(contact.organizations).value?.units || []
    payload.organizations = mergeFirstEntry(
      contact.organizations,
      'o1',
      organization || department
        ? {
            name: organization,
            units: [...(department ? [{ name: department }] : []), ...existingUnits.slice(1)]
          }
        : undefined
    )
  }

  if (hasChanged('jobTitle')) {
    const jobTitle = state.jobTitle.trim()
    payload.titles = mergeFirstEntry(
      contact.titles,
      't1',
      // an existing title keeps its kind (e.g. "role") and organization
      jobTitle
        ? { kind: 'title', ...getFirstEntry(contact.titles).value, name: jobTitle }
        : undefined
    )
  }

  if (hasChanged('note')) {
    const note = state.note.trim()
    payload.notes = mergeFirstEntry(contact.notes, 'n1', note ? { note } : undefined)
  }

  return payload
}

// properties of the update payload that are maps of entries
const entryProperties = [
  'nicknames',
  'emails',
  'phones',
  'addresses',
  'organizations',
  'titles',
  'notes'
] as const

/**
 * The groupware API can't remove entries via PATCH yet (empty values are omitted, see #3844).
 * Returns the properties of the update that still have entries after saving which were removed
 * in the form.
 */
export const getNotRemovedProperties = (
  payload: UpdateContactPayload,
  savedContact: Contact
): (typeof entryProperties)[number][] => {
  return entryProperties.filter((property) => {
    if (!(property in payload)) {
      return false
    }
    const sentKeys = Object.keys(payload[property] || {})
    return Object.keys(savedContact[property] || {}).some((key) => !sentKeys.includes(key))
  })
}
