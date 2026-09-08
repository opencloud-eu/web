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

export interface OpenGraphMetaOptions {
  title: string
  siteName: string
  url: string
  description?: string
  image?: string
  imageAlt?: string
  video?: string
  videoType?: string
  audio?: string
  audioType?: string
}

function setMetaProperty(property: string, content?: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)

  if (!content) {
    meta?.remove()
    return
  }

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.appendChild(meta)
  }
  meta.content = content
}

// the Open Graph protocol requires absolute URLs, while themed assets can be relative paths
function toAbsoluteUrl(url: string) {
  try {
    return new URL(url, document.baseURI).href
  } catch {
    return undefined
  }
}

export function findOpenGraphImage(urls: Array<string | undefined>) {
  return urls.find((url) => {
    if (!url) {
      return false
    }

    try {
      return /\.(png|jpe?g)$/i.test(new URL(url, document.baseURI).pathname)
    } catch {
      return false
    }
  })
}

/**
 * Injects Open Graph tags (https://ogp.me) describing the currently displayed page, most notably
 * public links. Only consumers that execute JavaScript pick these up; preview-specific tags for
 * plain crawlers need to be rendered server-side.
 */
export function injectOpenGraphMeta({
  title,
  siteName,
  url,
  description,
  image,
  imageAlt,
  video,
  videoType,
  audio,
  audioType
}: OpenGraphMetaOptions) {
  const imageUrl = image ? toAbsoluteUrl(image) : undefined
  const videoUrl = video ? toAbsoluteUrl(video) : undefined
  const audioUrl = audio ? toAbsoluteUrl(audio) : undefined

  setMetaProperty('og:type', 'website')
  setMetaProperty('og:title', title)
  setMetaProperty('og:site_name', siteName)
  setMetaProperty('og:url', url)
  setMetaProperty('og:description', description)
  setMetaProperty('og:image', imageUrl)
  setMetaProperty('og:image:alt', imageUrl ? imageAlt : undefined)
  setMetaProperty('og:video', videoUrl)
  setMetaProperty('og:video:type', videoUrl ? videoType : undefined)
  setMetaProperty('og:audio', audioUrl)
  setMetaProperty('og:audio:type', audioUrl ? audioType : undefined)
}
