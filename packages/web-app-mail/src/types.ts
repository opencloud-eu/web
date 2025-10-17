import { z } from 'zod'

export const MailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string()
})

export const MailboxIdsSchema = z.record(z.string(), z.boolean())
export const KeywordsSchema = z.record(z.string(), z.boolean())

export const MailSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  threadId: z.string(),

  subject: z.string().optional(),
  preview: z.string().optional(),

  receivedAt: z.string(),
  sentAt: z.string().optional(),

  size: z.number(),

  mailboxIds: MailboxIdsSchema,

  from: z.array(MailAddressSchema).optional().default([]),
  sender: z.array(MailAddressSchema).optional().default([]),
  to: z.array(MailAddressSchema).optional().default([]),

  keywords: KeywordsSchema.optional().default({})
})

export type Mail = z.infer<typeof MailSchema>
export type MailAddress = z.infer<typeof MailAddressSchema>
export type MailboxIds = z.infer<typeof MailboxIdsSchema>
export type Keywords = z.infer<typeof KeywordsSchema>
