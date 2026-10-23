import { onBeforeUnmount, ref, unref, watch, type MaybeRef } from 'vue'
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore, useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'
import type { Contact } from '../types'

/**
 * Provides a displayable URL of the contact photo. Photos are loaded from the groupware blob
 * store or inline data URIs. Remote URIs are ignored, loading them would leak to third parties
 * that the contact has been viewed.
 */
export const useContactPhoto = (contact: MaybeRef<Contact>) => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const accountsStore = useGroupwareAccountsStore()

  const photoUrl = ref<string>()
  let objectUrl: string | undefined

  const revokeObjectUrl = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = undefined
    }
  }

  const loadPhoto = async (value: Contact) => {
    revokeObjectUrl()
    photoUrl.value = undefined

    const photo = Object.values(value.media || {}).find(({ kind }) => kind === 'photo')
    if (!photo) {
      return
    }

    if (photo.uri?.startsWith('data:image/')) {
      photoUrl.value = photo.uri
      return
    }

    const accountId = unref(accountsStore.currentAccount)?.accountId
    if (!photo.blobId || !accountId) {
      return
    }

    try {
      const { data }: { data: Blob } = await clientService.httpAuthenticated.get(
        // the blob route without a file name only returns the blob metadata
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/blobs/${photo.blobId}/photo`),
        { responseType: 'blob' }
      )
      // the contact might have changed while loading
      if (unref(contact).id !== value.id) {
        return
      }
      objectUrl = URL.createObjectURL(data)
      photoUrl.value = objectUrl
    } catch (error) {
      console.error('Failed to load contact photo:', error)
    }
  }

  watch(
    () => [unref(contact).id, unref(contact).media],
    () => loadPhoto(unref(contact)),
    { immediate: true, deep: true }
  )

  onBeforeUnmount(revokeObjectUrl)

  return { photoUrl }
}
