import { z } from 'zod'

export const MailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string()
})

export const MailboxIdsSchema = z.record(z.string(), z.boolean())
export const KeywordsSchema = z.record(z.string(), z.boolean())

export const MailHeaderSchema = z.object({
  name: z.string(),
  value: z.string()
})

export type MailBodyPart = {
  partId?: string
  blobId?: string
  type?: string
  size?: number
  name?: string
  charset?: string
  disposition?: string
  cid?: string
  language?: string[]
  location?: string
  subParts?: MailBodyPart[]
}

export const MailBodyPartSchema: z.ZodType<MailBodyPart> = z.lazy(() =>
  z.object({
    partId: z.string().optional(),
    blobId: z.string().optional(),
    type: z.string().optional(),
    size: z.number().optional(),
    name: z.string().optional(),
    charset: z.string().optional(),
    disposition: z.string().optional(),
    cid: z.string().optional(),
    language: z.array(z.string()).optional(),
    location: z.string().optional(),
    subParts: z.array(MailBodyPartSchema).optional()
  })
)

export const MailBodyValueSchema = z.object({
  value: z.string().optional(),
  isEncodingProblem: z.boolean().optional(),
  isTruncated: z.boolean().optional()
})

export const MailSchema = z.object({
  id: z.string(),
  blobId: z.string().optional(),
  accountId: z.string().optional(),
  threadId: z.string(),
  threadSize: z.number().optional(),

  mailboxIds: MailboxIdsSchema,
  keywords: KeywordsSchema.optional().default({}),
  size: z.number(),

  receivedAt: z.string(),
  sentAt: z.string().optional(),

  subject: z.string().optional(),
  preview: z.string().optional(),

  from: z.array(MailAddressSchema).optional().default([]),
  sender: z.array(MailAddressSchema).optional().default([]),
  to: z.array(MailAddressSchema).optional().default([]),
  cc: z.array(MailAddressSchema).optional().default([]),
  bcc: z.array(MailAddressSchema).optional().default([]),
  replyTo: z.array(MailAddressSchema).optional().default([]),

  headers: z.array(MailHeaderSchema).optional().default([]),
  messageId: z.array(z.string()).optional().default([]),
  inReplyTo: z.array(z.string()).optional().default([]),
  references: z.array(z.string()).optional().default([]),

  bodyStructure: MailBodyPartSchema.optional(),
  bodyValues: z.record(z.string(), MailBodyValueSchema).optional().default({}),
  textBody: z.array(MailBodyPartSchema).optional().default([]),
  htmlBody: z.array(MailBodyPartSchema).optional().default([]),
  attachments: z.array(MailBodyPartSchema).optional().default([]),

  hasAttachment: z.boolean().optional()
})

export const MailboxSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  totalEmails: z.number().optional(),
  unreadEmails: z.number().optional(),
  totalThreads: z.number().optional(),
  unreadThreads: z.number().optional(),
  myRights: z.object({
    mayReadItems: z.boolean().optional(),
    mayAddItems: z.boolean().optional(),
    mayRemoveItems: z.boolean().optional(),
    maySetSeen: z.boolean().optional(),
    maySetKeywords: z.boolean().optional(),
    mayCreateChild: z.boolean().optional(),
    mayRename: z.boolean().optional(),
    mayDelete: z.boolean().optional(),
    maySubmit: z.boolean().optional()
  }),
  isSubscribed: z.boolean().optional()
})

export const EmailQuerySortOptionSchema = z.enum([
  'receivedAt',
  'size',
  'from',
  'to',
  'subject',
  'sentAt',
  'hasKeyword',
  'allInThreadHaveKeyword',
  'someInThreadHaveKeyword'
])

export const JmapMailCapabilitySchema = z
  .object({
    maxMailboxesPerEmail: z.number().optional(),
    maxMailboxDepth: z.number().optional(),
    maxSizeMailboxName: z.number().optional(),
    maxSizeAttachmentsPerEmail: z.number().optional(),
    emailQuerySortOptions: z.array(EmailQuerySortOptionSchema).optional(),
    mayCreateTopLevelMailbox: z.boolean().optional()
  })
  .partial()

export const JmapSubmissionCapabilitySchema = z
  .object({
    maxDelayedSend: z.number().optional(),
    submissionExtensions: z.record(z.string(), z.array(z.string())).optional()
  })
  .partial()

export const JmapVacationCapabilitySchema = z.object({}).passthrough().optional()

export const JmapSieveCapabilitySchema = z
  .object({
    maxSizeScriptName: z.number().optional(),
    maxSizeScript: z.number().optional(),
    maxNumberScripts: z.number().optional(),
    maxNumberRedirects: z.number().optional(),
    sieveExtensions: z.array(z.string()).optional(),
    notificationMethods: z.array(z.string()).optional(),
    externalLists: z.array(z.string()).nullable().optional()
  })
  .partial()

export const JmapBlobCapabilitySchema = z
  .object({
    maxSizeBlobSet: z.number().optional(),
    maxDataSources: z.number().optional(),
    supportedTypeNames: z.array(z.string()).optional(),
    supportedDigestAlgorithms: z.array(z.string()).optional()
  })
  .partial()

export const JmapQuotaCapabilitySchema = z.object({}).passthrough().optional()

export const AccountCapabilitiesSchema = z
  .object({
    'urn:ietf:params:jmap:mail': JmapMailCapabilitySchema.optional(),
    'urn:ietf:params:jmap:submission': JmapSubmissionCapabilitySchema.optional(),
    'urn:ietf:params:jmap:vacationresponse': JmapVacationCapabilitySchema.optional(),
    'urn:ietf:params:jmap:sieve': JmapSieveCapabilitySchema.optional(),
    'urn:ietf:params:jmap:blob': JmapBlobCapabilitySchema.optional(),
    'urn:ietf:params:jmap:quota': JmapQuotaCapabilitySchema.optional()
  })
  .catchall(z.unknown())

export const AccountSchema = z
  .object({
    name: z.string().optional(),
    isPersonal: z.boolean().optional(),
    isReadOnly: z.boolean().optional()
  })
  .partial()

export type JmapMailCapability = z.infer<typeof JmapMailCapabilitySchema>
export type JmapSubmissionCapability = z.infer<typeof JmapSubmissionCapabilitySchema>
export type JmapVacationCapability = z.infer<typeof JmapVacationCapabilitySchema>
export type JmapSieveCapability = z.infer<typeof JmapSieveCapabilitySchema>
export type JmapBlobCapability = z.infer<typeof JmapBlobCapabilitySchema>
export type JmapQuotaCapability = z.infer<typeof JmapQuotaCapabilitySchema>
export type AccountCapabilities = z.infer<typeof AccountCapabilitiesSchema>
export type Account = z.infer<typeof AccountSchema>
export type Mail = z.infer<typeof MailSchema>
export type MailAddress = z.infer<typeof MailAddressSchema>
export type MailboxIds = z.infer<typeof MailboxIdsSchema>
export type Keywords = z.infer<typeof KeywordsSchema>
export type MailHeader = z.infer<typeof MailHeaderSchema>
export type MailBodyValue = z.infer<typeof MailBodyValueSchema>
export type Mailbox = z.infer<typeof MailboxSchema>
