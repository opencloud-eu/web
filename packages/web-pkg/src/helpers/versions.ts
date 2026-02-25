import { CapabilityStore } from '../composables/piniaStores'

export const getWebVersion = (): string => {
  return `OpenCloud Web UI ${process.env.PACKAGE_VERSION}`
}

export const getBackendVersion = ({
  capabilityStore
}: {
  capabilityStore: CapabilityStore
}): string => {
  const backendStatus = capabilityStore.status
  if (!backendStatus || !backendStatus.versionstring) {
    return undefined
  }
  const product = backendStatus.product || 'OpenCloud'
  const version = backendStatus.productversion || backendStatus.versionstring
  const edition = backendStatus.edition || ''
  return `${product} ${version} ${edition}`.trim()
}
