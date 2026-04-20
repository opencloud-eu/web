import { z } from 'zod'

const CustomTranslationSchema = z.object({
  url: z.string()
})

export type CustomTranslation = z.infer<typeof CustomTranslationSchema>

/** @deprecated */
const OAuth2ConfigSchema = z.object({
  apiUrl: z.string().optional(),
  authUrl: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  logoutUrl: z.string().optional(),
  metaDataUrl: z.string().optional(),
  url: z.string().optional()
})

/** @deprecated */
export type OAuth2Config = z.infer<typeof OAuth2ConfigSchema>

// loose object to allow passing through any properties for the oidc-client lib.
// see https://authts.github.io/oidc-client-ts/interfaces/OidcClientSettings.html
const OpenIdConnectConfigSchema = z.looseObject({})

export type OpenIdConnectConfig = z.infer<typeof OpenIdConnectConfigSchema>

const SentryConfigSchema = z.record(z.any(), z.any())

export type SentryConfig = z.infer<typeof SentryConfigSchema>

const StyleConfigSchema = z.object({
  href: z.string().optional()
})

export type StyleConfig = z.infer<typeof StyleConfigSchema>

const ScriptConfigSchema = z.object({
  async: z.boolean().optional(),
  src: z.string().optional()
})

export type ScriptConfig = z.infer<typeof ScriptConfigSchema>

const OptionsConfigSchema = z.object({
  openFilesInNewTab: z.boolean().optional(),
  concurrentRequests: z
    .object({
      resourceBatchActions: z.number().optional(),
      sse: z.number().optional(),
      shares: z
        .object({
          create: z.number().optional(),
          list: z.number().optional()
        })
        .optional(),
      avatars: z.number().optional()
    })
    .optional(),
  contextHelpers: z.boolean().optional(),
  contextHelpersReadMore: z.boolean().optional(),
  defaultAppId: z.string().optional(),
  disabledExtensions: z.array(z.string()).optional(),
  disableFeedbackLink: z.boolean().optional(),
  accountEditLink: z
    .object({
      href: z.string().optional()
    })
    .optional(),
  editor: z
    .object({
      autosaveEnabled: z.boolean().optional(),
      autosaveInterval: z.number().optional(),
      openAsPreview: z.union([z.boolean(), z.array(z.string())]).optional()
    })
    .optional(),
  embed: z
    .object({
      enabled: z.boolean().optional(),
      target: z.string().optional(),
      messagesOrigin: z.string().optional(),
      delegateAuthentication: z.boolean().optional(),
      delegateAuthenticationOrigin: z.string().optional(),
      fileTypes: z.array(z.string()).optional(),
      chooseFileName: z.boolean().optional(),
      chooseFileNameSuggestion: z.string().optional()
    })
    .optional(),
  feedbackLink: z
    .object({
      ariaLabel: z.string().optional(),
      description: z.string().optional(),
      href: z.string().optional()
    })
    .optional(),
  loginUrl: z.string().optional(),
  logoutUrl: z.string().optional(),
  tokenStorageLocal: z.boolean().optional(),
  upload: z
    .object({
      companionUrl: z.string().optional()
    })
    .optional(),
  userListRequiresFilter: z.boolean().optional(),
  hideLogo: z.boolean().optional()
})

export type OptionsConfig = z.infer<typeof OptionsConfigSchema>

const ExternalApp = z.object({
  id: z.string(),
  path: z.string(),
  config: z.record(z.string(), z.unknown()).optional()
})

export const RawConfigSchema = z.object({
  server: z.string(),
  theme: z.string(),
  options: OptionsConfigSchema,
  apps: z.array(z.string()).optional(),
  external_apps: z.array(ExternalApp).optional(),
  customTranslations: z.array(CustomTranslationSchema).optional(),
  auth: OAuth2ConfigSchema.optional(),
  openIdConnect: OpenIdConnectConfigSchema.optional(),
  sentry: SentryConfigSchema.optional(),
  scripts: z.array(ScriptConfigSchema).optional(),
  styles: z.array(StyleConfigSchema).optional()
})

export type RawConfig = z.infer<typeof RawConfigSchema>
