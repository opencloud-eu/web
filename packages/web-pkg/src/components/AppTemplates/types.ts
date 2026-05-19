import { Resource } from '@opencloud-eu/web-client'
import { AppConfigObject } from '../../apps/types'
import type { InjectionKey, Ref } from 'vue'

export interface AppWrapperSlotArgs {
  applicationConfig: AppConfigObject
  resource: Resource
  currentContent: Ref<string>
  isDirty: boolean
  isReadOnly: boolean
  url: string
}

/**
 * Contract AppWrapper provides via Vue's provide/inject so wrapped
 * editors can keep AppWrapper's private `currentETag` aligned with
 * out-of-band etag changes.
 *
 * Specifically the collaborative editor case: when peer A in a Y.Doc
 * room saves the file, peer B's CollaborativeWrapper sees the new etag
 * arrive via CRDT and forwards it through this setter so peer B's next
 * Ctrl+S / Save / autosave doesn't 412 with a stale `previousEntityTag`.
 *
 * `null` is a valid inject default — non-collaborative editors don't
 * need the setter, and the wrapper-less consumers (anyone using
 * `useTextEditor` without `CollaborativeWrapper`) won't even see the
 * injection key.
 */
export interface AppWrapperEtagSync {
  setCurrentETag(etag: string): void
}
export const appWrapperEtagSyncKey: InjectionKey<AppWrapperEtagSync> = Symbol(
  'appWrapperEtagSync'
)
