import { createTestingPinia } from '@pinia/testing'
import { mock } from 'vitest-mock-extended'
import {
  AncestorMetaData,
  AppConfigObject,
  ApplicationFileExtension,
  ApplicationInformation,
  ClipboardActions,
  Message,
  Modal,
  OptionsConfig,
  Updates,
  WebThemeType
} from '@opencloud-eu/web-pkg'
import {
  CollaboratorShare,
  LinkShare,
  Resource,
  ShareRole,
  SpaceResource
} from '@opencloud-eu/web-client'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { Capabilities } from '@opencloud-eu/web-client/ocs'
import defaultTheme from './theme.json'

export { createTestingPinia }

export type PiniaMockOptions = {
  stubActions?: boolean
  appsState?: {
    apps?: Record<string, ApplicationInformation>
    externalAppConfig?: AppConfigObject
    fileExtensions?: ApplicationFileExtension[]
  }
  authState?: {
    accessToken?: string
    idpContextReady?: boolean
    userContextReady?: boolean
    publicLinkContextReady?: boolean
  }
  themeState?: { availableThemes?: WebThemeType[]; currentTheme?: WebThemeType }
  clipboardState?: { action?: ClipboardActions; resources?: Resource[] }
  configState?: {
    server?: string
    options?: OptionsConfig
  }
  messagesState?: { messages?: Message[] }
  modalsState?: { modals?: Modal[] }
  spaceSettingsStore?: {
    spaces?: SpaceResource[]
    selectedSpaces?: SpaceResource[]
  }
  groupSettingsStore?: {
    groups?: Group[]
    selectedGroups?: Group[]
  }
  userSettingsStore?: {
    users?: User[]
    selectedUsers?: User[]
  }
  resourcesStore?: {
    resources?: Resource[]
    currentFolder?: Resource
    ancestorMetaData?: AncestorMetaData
    selectedIds?: string[]
    areFileExtensionsShown?: boolean
    areHiddenFilesShown?: boolean
    areDisabledSpacesShown?: boolean
    deleteQueue?: string[]
  }
  avatarsStore?: {
    userAvatar?: string
    avatarMap?: Record<string, string>
  }
  sideBarStore?: { sideBarActivePanel?: string | null }
  sharesState?: {
    collaboratorShares?: CollaboratorShare[]
    linkShares?: LinkShare[]
    graphRoles?: Record<string, ShareRole>
    loading?: boolean
  }
  spacesState?: { spaces?: SpaceResource[]; imagesLoading?: string[]; readmesLoading?: string[] }
  userState?: { user?: User }
  capabilityState?: {
    capabilities?: Partial<Capabilities['capabilities']>
    isInitialized?: boolean
  }
  updatesState?: {
    isLoading?: boolean
    hasError?: boolean
    updates?: Updates
  }
}

export function createMockStore({
  stubActions = true,
  appsState = {},
  authState = {},
  clipboardState = {},
  configState = {},
  themeState = {},
  messagesState = {},
  modalsState = {},
  resourcesStore = {},
  avatarsStore = {},
  userSettingsStore = {},
  groupSettingsStore = {},
  spaceSettingsStore = {},
  sideBarStore = {},
  sharesState = {},
  spacesState = {},
  userState = {},
  capabilityState = {},
  updatesState = {}
}: PiniaMockOptions = {}) {
  const defaultOpenCloudTheme = {
    defaults: {
      ...defaultTheme.clients.web.defaults,
      common: {
        ...defaultTheme.common,
        urls: {
          imprint: 'https://imprint.url.theme',
          privacy: 'https://privacy.url.theme',
          accessibility: 'https://accessibility.url.theme'
        }
      }
    },
    themes: defaultTheme.clients.web.themes
  }

  return createTestingPinia({
    stubActions,
    initialState: {
      apps: { fileExtensions: [], apps: {}, ...appsState },
      auth: { ...authState },
      clipboard: { resources: [], ...clipboardState },
      config: {
        apps: [],
        external_apps: [],
        customTranslations: [],
        oAuth2: {},
        openIdConnect: {},
        options: {},
        server: '',
        ...configState
      },
      messages: { messages: [], ...messagesState },
      modals: {
        modals: [],
        ...modalsState
      },
      theme: {
        currentTheme: {
          ...defaultOpenCloudTheme.defaults,
          ...defaultOpenCloudTheme.themes[0]
        },
        availableThemes: defaultOpenCloudTheme.themes,
        ...themeState
      },
      resources: { resources: [], ...resourcesStore },
      avatars: {
        ...avatarsStore
      },
      sideBar: { ...sideBarStore },
      shares: { collaboratorShares: [], linkShares: [], ...sharesState },
      spaces: { spaces: [], ...spacesState },
      userSettings: { users: [], selectedUsers: [], ...userSettingsStore },
      groupSettings: { groups: [], selectedGroups: [], ...groupSettingsStore },
      spaceSettings: { spaces: [], selectedSpaces: [], ...spaceSettingsStore },
      user: { user: { ...mock<User>({ id: '1' }), ...(userState?.user && { ...userState.user }) } },
      capabilities: {
        isInitialized: capabilityState?.isInitialized ? capabilityState.isInitialized : true,
        capabilities: {
          ...mock<Capabilities['capabilities']>(),
          ...(capabilityState?.capabilities && { ...capabilityState.capabilities })
        }
      },
      updates: { isLoading: true, hasError: false, ...updatesState }
    }
  })
}
