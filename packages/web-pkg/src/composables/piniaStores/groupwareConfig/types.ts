import { z } from 'zod'

export const MailCapabilitiesSchema = z.object({
  maxMailboxDepth: z.number(),
  maxSizeMailboxName: z.number(),
  maxMailboxesPerEmail: z.number(),
  maxSizeAttachmentsPerEmail: z.number(),
  mayCreateTopLevelMailbox: z.boolean(),
  maxDelayedSend: z.number()
})

export const SieveCapabilitiesSchema = z.object({
  maxSizeScriptName: z.number(),
  maxSizeScript: z.number(),
  maxNumberScripts: z.number(),
  maxNumberRedirects: z.number()
})

export const AccountCapabilitiesSchema = z.object({
  mail: MailCapabilitiesSchema.optional(),
  sieve: SieveCapabilitiesSchema.optional()
})

export const IdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  mayDelete: z.boolean()
})

export const AccountSchema = z.object({
  name: z.string(),
  isPersonal: z.boolean(),
  isReadOnly: z.boolean(),
  capabilities: AccountCapabilitiesSchema,
  identities: z.array(IdentitySchema)
})

export const LimitsSchema = z.object({
  maxSizeUpload: z.number(),
  maxConcurrentUpload: z.number(),
  maxSizeRequest: z.number(),
  maxConcurrentRequests: z.number()
})

export const AccountsSchema = z.record(z.string(), AccountSchema)

export const PrimaryAccountsSchema = z.record(z.string(), z.string())

export const RawGroupwareConfigSchema = z.object({
  version: z.string(),
  capabilities: z.array(z.string()),
  limits: LimitsSchema,
  accounts: AccountsSchema,
  primaryAccounts: PrimaryAccountsSchema
})

export type RawGroupwareConfig = z.infer<typeof RawGroupwareConfigSchema>
