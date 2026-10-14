import { defineStore } from 'pinia'
import { ref, Ref, toRaw, unref } from 'vue'
import { useConfigStore } from '../config'
import { Extension, ExtensionPoint, ExtensionType } from './types'

// untouched groups stay as they are so registered computeds stay reactive. partially
// matched groups become static snapshots: they lose reactivity and can't be removed
// via the function returned by registerExtensions anymore
function removeIds<T extends { id: string }>(groups: Ref<Ref<T[]>[]>, ids: string[]) {
  if (!unref(groups).some((group) => unref(group).some(({ id }) => ids.includes(id)))) {
    return
  }
  groups.value = unref(groups).flatMap((group) => {
    const remaining = unref(group).filter(({ id }) => !ids.includes(id))
    if (remaining.length === unref(group).length) {
      return [group]
    }
    return remaining.length ? [ref(remaining) as Ref<T[]>] : []
  })
}

export const useExtensionRegistry = defineStore('extensionRegistry', () => {
  const configStore = useConfigStore()

  const extensions = ref<Ref<Extension[]>[]>([])

  // returns a function to unregister the group, even if it's currently empty
  const registerExtensions = (e: Ref<Extension[]>) => {
    extensions.value.push(e)
    return () => {
      const remaining = unref(extensions).filter((group) => toRaw(group) !== toRaw(e))
      if (remaining.length === unref(extensions).length) {
        return
      }
      extensions.value = remaining
    }
  }
  const unregisterExtensions = (ids: string[]) => {
    removeIds(extensions, ids)
  }
  const requestExtensions = <T extends Extension>(extensionPoint: ExtensionPoint<T>) => {
    if (!extensionPoint.id || !extensionPoint.extensionType) {
      throw new Error('ExtensionPoint must have an id and an extensionType')
    }

    return unref(extensions).flatMap((e) =>
      unref(e).filter(
        (e) =>
          e.type === extensionPoint.extensionType &&
          !configStore.options.disabledExtensions.includes(e.id) &&
          (!e.extensionPointIds || e.extensionPointIds?.includes(extensionPoint.id))
      )
    ) as T[]
  }

  const getExtensionById = <T extends Extension>(id: string): T | undefined => {
    return unref(extensions)
      .flatMap((e) => unref(e))
      .find((e) => e.id === id) as T | undefined
  }

  const extensionPoints = ref<Ref<ExtensionPoint<Extension>[]>[]>([])
  const registerExtensionPoints = <T extends Extension>(e: Ref<ExtensionPoint<T>[]>) => {
    extensionPoints.value.push(e)
  }
  const unregisterExtensionPoints = (ids: string[]) => {
    removeIds(extensionPoints, ids)
  }
  const getExtensionPoints = <T extends ExtensionPoint<Extension>>(
    options: {
      extensionType?: ExtensionType
    } = {}
  ) => {
    return unref(extensionPoints).flatMap(
      (e) =>
        unref(e).filter((e) => {
          if (
            Object.hasOwn(options, 'extensionType') &&
            e.extensionType !== options.extensionType
          ) {
            return false
          }
          return true
        }) as T[]
    )
  }

  return {
    extensions,
    registerExtensions,
    unregisterExtensions,
    requestExtensions,
    extensionPoints,
    registerExtensionPoints,
    unregisterExtensionPoints,
    getExtensionPoints,
    getExtensionById
  }
})

export type ExtensionRegistry = ReturnType<typeof useExtensionRegistry>
