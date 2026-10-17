import { z } from 'zod'

const AddressBookRightsSchema = z.object({
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

const AddressBooksListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(AddressBookSchema),
  notFound: z.array(z.string()).optional()
})

const AddressBooksArrayResponseSchema = z.array(AddressBookSchema)

export type AddressBook = z.infer<typeof AddressBookSchema>

// Contact schemas
const AddressBookIdsSchema = z.record(z.string(), z.boolean())
const KeywordsSchema = z.record(z.string(), z.boolean())

const AddressComponentSchema = z.object({
  kind: z.string(),
  value: z.string()
})

const ContextsSchema = z.record(z.string(), z.boolean())

const AddressSchema = z.object({
  components: z.array(AddressComponentSchema).optional(),
  contexts: ContextsSchema.optional(),
  countryCode: z.string().optional()
})

const PartialDateSchema = z.object({
  '@type': z.string().optional(),
  day: z.number().optional(),
  month: z.number().optional(),
  year: z.number().optional()
})

const AnniversarySchema = z.object({
  date: PartialDateSchema.optional(),
  kind: z.string().optional()
})

const EmailSchema = z.object({
  address: z.string(),
  contexts: ContextsSchema.optional()
})

const MediaSchema = z.object({
  blobId: z.string().optional(),
  uri: z.string().optional(),
  contexts: ContextsSchema.optional(),
  kind: z.string().optional(),
  mediaType: z.string().optional()
})

const NameComponentSchema = z.object({
  kind: z.string(),
  value: z.string()
})

const NameSchema = z.object({
  '@type': z.string().optional(),
  full: z.string().optional(),
  components: z.array(NameComponentSchema).optional(),
  defaultSeparator: z.string().optional(),
  isOrdered: z.boolean().optional()
})

const NicknameSchema = z.object({
  name: z.string(),
  contexts: ContextsSchema.optional()
})

const NoteAuthorSchema = z.object({
  name: z.string().optional()
})

const NoteSchema = z.object({
  author: NoteAuthorSchema.optional(),
  created: z.string().optional(),
  note: z.string()
})

const OnlineServiceSchema = z.object({
  service: z.string().optional(),
  user: z.string().optional(),
  contexts: ContextsSchema.optional()
})

const OrganizationUnitSchema = z.object({
  name: z.string()
})

const OrganizationSchema = z.object({
  name: z.string(),
  units: z.array(OrganizationUnitSchema).optional()
})

const PhoneSchema = z.object({
  number: z.string(),
  contexts: ContextsSchema.optional(),
  features: z.record(z.string(), z.boolean()).optional()
})

const PreferredLanguageSchema = z.object({
  language: z.string(),
  pref: z.number().optional(),
  contexts: ContextsSchema.optional()
})

const RelationSchema = z.record(z.string(), z.boolean())

const RelatedToSchema = z.object({
  relation: RelationSchema.optional()
})

const SpeakToAsSchema = z.object({
  grammaticalGender: z.string().optional(),
  pronouns: z.string().optional()
})

const TitleSchema = z.object({
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

const ContactSearchResultsSchema = z.object({
  results: z.array(ContactSchema),
  canCalculateChanges: z.boolean().optional(),
  position: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional()
})

const ContactListResponseSchema = z.object({
  accountId: z.string().optional(),
  state: z.string().optional(),
  list: z.array(ContactSchema),
  notFound: z.array(z.string()).optional()
})

const ContactsArrayResponseSchema = z.array(ContactSchema)

export type Contact = z.infer<typeof ContactSchema>

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
