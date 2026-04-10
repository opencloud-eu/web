import { CapabilityStore, getBackendVersion, getWebVersion } from '@opencloud-eu/web-pkg'

export function injectGeneratorMeta(capabilityStore: CapabilityStore) {
  const content = [getWebVersion(), getBackendVersion({ capabilityStore })]
    .filter(Boolean)
    .join(', ')

  let meta = document.querySelector<HTMLMetaElement>('meta[name="generator"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'generator'
    document.head.appendChild(meta)
  }
  meta.content = content
}
