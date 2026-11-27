import { XMLParser } from 'fast-xml-parser'
import { EntityDecoder } from '@nodable/entities'
import { WebDavResponseResource, WebDavResponseTusSupport } from '../../helpers'
import { basename, urlJoin } from '../../utils'
import { DavErrorCode, DavNamespaces } from '../constants'

export const parseTusHeaders = (headers: Headers) => {
  const result: WebDavResponseTusSupport = {}

  const version = headers.get('tus-version')
  if (!version) {
    return null
  }

  result.version = version.split(',')
  if (headers.get('tus-extension')) {
    result.extension = headers.get('tus-extension').split(',')
  }
  if (headers.get('tus-resumable')) {
    result.resumable = headers.get('tus-resumable')
  }
  if (headers.get('tus-max-size')) {
    result.maxSize = parseInt(headers.get('tus-max-size'), 10)
  }
  return result
}

type DavPropStat = { prop?: Record<string, unknown> | ''; status?: string }

type DavResponse = { href: string; propstat?: DavPropStat | DavPropStat[]; status?: string }

type Namespaces = Record<string, string>

const wellKnownNamespaces: string[] = Object.values(DavNamespaces)

function splitName(name: string) {
  const index = name.indexOf(':')
  return index === -1
    ? { prefix: '', local: name }
    : { prefix: name.slice(0, index), local: name.slice(index + 1) }
}

function declaredNamespaces(node: unknown, inherited: Namespaces): Namespaces {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return inherited
  }
  let namespaces = inherited
  for (const [key, value] of Object.entries(node)) {
    if (key === '@xmlns' || key.startsWith('@xmlns:')) {
      if (namespaces === inherited) {
        namespaces = { ...inherited }
      }
      namespaces[key.slice('@xmlns:'.length)] = String(value)
    }
  }
  return namespaces
}

function clarkName(name: string, namespaces: Namespaces) {
  const { prefix, local } = splitName(name)
  const namespace = namespaces[prefix]
  if (!namespace || wellKnownNamespaces.includes(namespace)) {
    return local
  }
  return `{${namespace}}${local}`
}

// Element names lose their prefix, only the direct children of a prop element
// are keyed in Clark notation when they are not in a well-known namespace.
function resolveNames(node: unknown, namespaces: Namespaces, clark = false): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => resolveNames(item, declaredNamespaces(item, namespaces), clark))
  }
  if (!node || typeof node !== 'object') {
    return node
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === '@xmlns' || key.startsWith('@xmlns:')) {
      continue
    }
    if (key === 'text' || key.startsWith('@')) {
      result[key] = value
      continue
    }
    const childIsProp = splitName(key).local === 'prop'
    for (const item of [value].flat()) {
      const scope = declaredNamespaces(item, namespaces)
      const name = clark ? clarkName(key, scope) : splitName(key).local
      const resolved = resolveNames(item, scope, childIsProp)
      if (name in result) {
        result[name] = [result[name]].flat().concat([resolved])
      } else {
        result[name] = Array.isArray(value) && !clark ? [resolved] : resolved
      }
    }
  }

  const keys = Object.keys(result)
  if (keys.length === 0) {
    return ''
  }
  if (keys.length === 1 && keys[0] === 'text') {
    return result.text
  }
  return result
}

function first<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
}

function parseFileName(name: string) {
  const decoded = decodeURIComponent(name)
  if (name?.startsWith('/dav/')) {
    return urlJoin(decoded.replace('/dav/', ''), {
      leadingSlash: true,
      trailingSlash: false
    })
  }

  return decoded
}

function parseType(resourcetype: unknown): WebDavResponseResource['type'] {
  if (resourcetype && typeof resourcetype === 'object' && 'collection' in resourcetype) {
    return 'directory'
  }
  return 'file'
}

function parseSize(contentLength: unknown) {
  return parseInt(String(contentLength ?? '0'), 10)
}

function parseEtag(etag: unknown) {
  return typeof etag === 'string' ? etag.replace(/"/g, '') : null
}

function parseMime(contentType: unknown) {
  return typeof contentType === 'string' ? contentType.split(';')[0] : ''
}

function toResource(href: string, propstat: DavPropStat): WebDavResponseResource {
  const props = propstat.prop || {}
  const type = parseType(props.resourcetype)
  const filename = parseFileName(href)

  // the parser guesses types, the name must stay a string
  if (props.name) {
    props.name = props.name.toString()
  }

  return {
    filename,
    basename: basename(filename),
    lastmod: (props.getlastmodified ?? null) as string,
    size: parseSize(props.getcontentlength),
    type,
    etag: parseEtag(props.getetag),
    ...(type === 'file' && { mime: parseMime(props.getcontenttype) }),
    props: props as WebDavResponseResource['props'],
    processing: propstat.status === 'HTTP/1.1 425 TOO EARLY'
  }
}

export function parseMultiStatus(xmlBody: string): WebDavResponseResource[] {
  const parser = new XMLParser({
    allowBooleanAttributes: true,
    attributeNamePrefix: '@',
    textNodeName: 'text',
    ignoreAttributes: false,
    numberParseOptions: { hex: true, leadingZeros: false },
    // the default decoder skips numeric char refs like &#39;
    entityDecoder: new EntityDecoder(),
    jPath: false,
    tagValueProcessor(_tagName, value, matcher) {
      // keep names as string, e.g. '2024.10' must not become 2024.1
      const path = typeof matcher === 'string' ? matcher : matcher.toString('.', false)
      if (/(^|\.)([\w-]+:)?prop\.([\w-]+:)?(displayname|name)$/.test(path)) {
        return
      }
      return value
    }
  })

  const { multistatus } = resolveNames(parser.parse(xmlBody), {}) as {
    multistatus?: { response?: DavResponse | DavResponse[] } | ''
  }
  if (multistatus === '') {
    return []
  }
  if (!multistatus) {
    throw new Error('Invalid response: No root multistatus found')
  }

  const responses: DavResponse[] = [multistatus.response ?? []].flat()
  return responses
    .filter(({ propstat }) => propstat)
    .map(({ href, propstat }) => toResource(href, first(propstat)))
}

export const parseError = (
  xmlBody: string
): { message: string; errorCode: DavErrorCode; errorType: string | undefined } => {
  const parser = new XMLParser()
  const errorObj: {
    message: string
    errorCode: DavErrorCode | undefined
    errorType: string | undefined
  } = {
    message: 'Unknown error',
    errorCode: undefined,
    errorType: undefined
  }

  try {
    const parsed = parser.parse(xmlBody)
    if (!parsed['d:error']) {
      return errorObj
    }
    if (parsed['d:error']['s:message']) {
      const message = parsed['d:error']['s:message']
      if (typeof message === 'string') {
        errorObj.message = message
      }
    }
    if (parsed['d:error']['s:errorcode']) {
      const errorCode = parsed['d:error']['s:errorcode']
      if (typeof errorCode === 'string') {
        errorObj.errorCode = errorCode as DavErrorCode
      }
    }
    const errorType = parsed['d:error']['opencloud:details']?.['opencloud:error_type']
    if (typeof errorType === 'string') {
      errorObj.errorType = errorType
    }
  } catch {
    return errorObj
  }

  return errorObj
}
