import { z } from 'zod'

export const GroupwareAccountIdentitySchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  email: z.string().optional(),
  textSignature: z.string().optional().default(''),
  htmlSignature: z.string().optional().default(''),
  mayDelete: z.boolean().optional()
})

export const GroupwareAccountSchema = z.object({
  accountId: z.string().optional(),
  name: z.string().optional(),
  isPersonal: z.boolean().optional(),
  isReadOnly: z.boolean().optional(),
  accountCapabilities: z.record(z.string(), z.object({})).optional(),
  identities: z.array(GroupwareAccountIdentitySchema).optional().default([])
})

export type GroupwareAccount = z.infer<typeof GroupwareAccountSchema>
export type GroupwareAccountIdentity = z.infer<typeof GroupwareAccountIdentitySchema>
