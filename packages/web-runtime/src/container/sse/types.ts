import { sseEventSchema, SseEventData } from '@opencloud-eu/web-client/sse'
import {
  AuthStore,
  ClientService,
  ConfigStore,
  MessageStore,
  PreviewService,
  ResourcesStore,
  SharesStore,
  SpacesStore,
  UserStore
} from '@opencloud-eu/web-pkg'
import { Router } from 'vue-router'
import { Language } from 'vue3-gettext'
import PQueue from 'p-queue'

export const eventSchema = sseEventSchema

export type EventSchemaType = SseEventData

export interface SSEEventOptions {
  resourcesStore: ResourcesStore
  spacesStore: SpacesStore
  userStore: UserStore
  messageStore: MessageStore
  sharesStore: SharesStore
  configStore: ConfigStore
  authStore: AuthStore
  clientService: ClientService
  previewService: PreviewService
  router: Router
  language: Language
  resourceQueue: PQueue
  sseData: EventSchemaType
}

export interface SseEventWrapperOptions extends Omit<SSEEventOptions, 'sseData'> {
  msg: MessageEvent
  topic: string
  method: (options: SSEEventOptions) => Promise<unknown> | unknown
}
