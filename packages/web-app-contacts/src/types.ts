import { z } from 'zod'

export const AddressBookRightsSchema = z.object({
  mayAdmin: z.boolean(),
  mayDelete: z.boolean(),
  mayRead: z.boolean(),
  mayWrite: z.boolean()
})

export const AddressBookSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isSubscribed: z.boolean().optional(),
  myRights: AddressBookRightsSchema
})

export const AddressBooksListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(AddressBookSchema),
  notFound: z.array(z.string()).optional()
})

export const AddressBooksArrayResponseSchema = z.array(AddressBookSchema)

export const AddressBook = AddressBookSchema
export type AddressBook = z.infer<typeof AddressBookSchema>
export type AddressBookRights = z.infer<typeof AddressBookRightsSchema>
export type AddressBooksListResponse = z.infer<typeof AddressBooksListResponseSchema>

// Contact schemas
export const AddressBookIdsSchema = z.record(z.string(), z.boolean())
export const KeywordsSchema = z.record(z.string(), z.boolean())

export const AddressComponentSchema = z.object({
  kind: z.string(),
  value: z.string()
})

export const ContextsSchema = z.record(z.string(), z.boolean())

export const AddressSchema = z.object({
  components: z.array(AddressComponentSchema).optional(),
  contexts: ContextsSchema.optional(),
  countryCode: z.string().optional()
})

export const PartialDateSchema = z.object({
  '@type': z.string().optional(),
  day: z.number().optional(),
  month: z.number().optional(),
  year: z.number().optional()
})

export const AnniversarySchema = z.object({
  date: PartialDateSchema.optional(),
  kind: z.string().optional()
})

export const EmailSchema = z.object({
  address: z.string(),
  contexts: ContextsSchema.optional()
})

export const MediaSchema = z.object({
  blobId: z.string().optional(),
  uri: z.string().optional(),
  contexts: ContextsSchema.optional(),
  kind: z.string().optional(),
  mediaType: z.string().optional()
})

export const NameComponentSchema = z.object({
  kind: z.string(),
  value: z.string()
})

export const NameSchema = z.object({
  '@type': z.string().optional(),
  full: z.string().optional(),
  components: z.array(NameComponentSchema).optional(),
  defaultSeparator: z.string().optional(),
  isOrdered: z.boolean().optional()
})

export const NicknameSchema = z.object({
  name: z.string(),
  contexts: ContextsSchema.optional()
})

export const NoteAuthorSchema = z.object({
  name: z.string().optional()
})

export const NoteSchema = z.object({
  author: NoteAuthorSchema.optional(),
  created: z.string().optional(),
  note: z.string()
})

export const OnlineServiceSchema = z.object({
  service: z.string().optional(),
  user: z.string().optional(),
  contexts: ContextsSchema.optional()
})

export const OrganizationUnitSchema = z.object({
  name: z.string()
})

export const OrganizationSchema = z.object({
  name: z.string(),
  units: z.array(OrganizationUnitSchema).optional()
})

export const PhoneSchema = z.object({
  number: z.string(),
  contexts: ContextsSchema.optional()
})

export const PreferredLanguageSchema = z.object({
  language: z.string(),
  pref: z.number().optional(),
  contexts: ContextsSchema.optional()
})

export const RelationSchema = z.record(z.string(), z.boolean())

export const RelatedToSchema = z.object({
  relation: RelationSchema.optional()
})

export const SpeakToAsSchema = z.object({
  grammaticalGender: z.string().optional(),
  pronouns: z.string().optional()
})

export const TitleSchema = z.object({
  name: z.string(),
  kind: z.string().optional(),
  organizationId: z.string().optional()
})

export const ContactSchema = z.object({
  '@type': z.string().optional(),
  id: z.string(),
  uid: z.string().optional(),
  version: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  prodId: z.string().optional(),
  kind: z.string().optional(),
  language: z.string().optional(),
  addressBookIds: AddressBookIdsSchema.optional(),
  keywords: KeywordsSchema.optional(),
  name: NameSchema.optional(),
  addresses: z.record(z.string(), AddressSchema).optional(),
  anniversaries: z.record(z.string(), AnniversarySchema).optional(),
  emails: z.record(z.string(), EmailSchema).optional(),
  media: z.record(z.string(), MediaSchema).optional(),
  nicknames: z.record(z.string(), NicknameSchema).optional(),
  notes: z.record(z.string(), NoteSchema).optional(),
  onlineServices: z.record(z.string(), OnlineServiceSchema).optional(),
  organizations: z.record(z.string(), OrganizationSchema).optional(),
  phones: z.record(z.string(), PhoneSchema).optional(),
  preferredLanguages: z.record(z.string(), PreferredLanguageSchema).optional(),
  relatedTo: z.record(z.string(), RelatedToSchema).optional(),
  speakToAs: SpeakToAsSchema.optional(),
  titles: z.record(z.string(), TitleSchema).optional()
})

export const ContactSearchResultsSchema = z.object({
  results: z.array(ContactSchema),
  canCalculateChanges: z.boolean().optional(),
  position: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional()
})

export const ContactListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(ContactSchema),
  notFound: z.array(z.string()).optional()
})

export const ContactsArrayResponseSchema = z.array(ContactSchema)

export const Contact = ContactSchema
export type Contact = z.infer<typeof ContactSchema>
export type ContactName = z.infer<typeof NameSchema>
export type ContactEmail = z.infer<typeof EmailSchema>
export type ContactPhone = z.infer<typeof PhoneSchema>
export type ContactAddress = z.infer<typeof AddressSchema>
export type ContactOrganization = z.infer<typeof OrganizationSchema>
export type ContactMedia = z.infer<typeof MediaSchema>
export type ContactSearchResults = z.infer<typeof ContactSearchResultsSchema>
export type ContactListResponse = z.infer<typeof ContactListResponseSchema>

export const parseAddressBooksResponse = (data: unknown): AddressBook[] => {
  const listResponse = AddressBooksListResponseSchema.safeParse(data)
  if (listResponse.success) {
    return listResponse.data.list
  }

  const arrayResponse = AddressBooksArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data
  }

  const singleResponse = AddressBookSchema.safeParse(data)
  if (singleResponse.success) {
    return [singleResponse.data]
  }

  return AddressBooksListResponseSchema.parse(data).list
}

export const parseContactsResponse = (data: unknown): Contact[] => {
  const searchResponse = ContactSearchResultsSchema.safeParse(data)
  if (searchResponse.success) {
    return searchResponse.data.results
  }

  const listResponse = ContactListResponseSchema.safeParse(data)
  if (listResponse.success) {
    return listResponse.data.list
  }

  const arrayResponse = ContactsArrayResponseSchema.safeParse(data)
  if (arrayResponse.success) {
    return arrayResponse.data
  }

  const singleResponse = ContactSchema.safeParse(data)
  if (singleResponse.success) {
    return [singleResponse.data]
  }

  return ContactSearchResultsSchema.parse(data).results
}
