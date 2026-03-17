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
  name: z.string().optional().nullable(),
  email: z.string().optional(),
  textSignature: z.string().optional().default(''),
  htmlSignature: z.string().optional().default(''),
  mayDelete: z.boolean().optional()
})

export const AccountSchema = z.object({
  accountId: z.string(),
  name: z.string(),
  isPersonal: z.boolean(),
  isReadOnly: z.boolean(),
  capabilities: AccountCapabilitiesSchema.optional(),
  accountCapabilities: z.record(z.string(), z.object({})).optional(),
  identities: z.array(IdentitySchema)
})

export type GroupwareAccount = z.infer<typeof AccountSchema>

export const LimitsSchema = z.object({
  maxSizeUpload: z.number(),
  maxConcurrentUpload: z.number(),
  maxSizeRequest: z.number(),
  maxConcurrentRequests: z.number()
})

export const AccountsSchema = z.array(AccountSchema)

export const PrimaryAccountsSchema = z.record(z.string(), z.string())

export const RawGroupwareConfigSchema = z.object({
  version: z.string(),
  capabilities: z.array(z.string()),
  limits: LimitsSchema,
  accounts: AccountsSchema,
  primaryAccounts: PrimaryAccountsSchema
})

export type RawGroupwareConfig = z.infer<typeof RawGroupwareConfigSchema>
