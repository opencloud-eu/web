import {
  DAVResultResponseProps,
  displaynameTagParser,
  parseXML,
  prepareFileFromProps
} from 'webdav'
import { XMLParser } from 'fast-xml-parser'
import { WebDavResponseResource, WebDavResponseTusSupport } from '../../helpers'
import { urlJoin } from '../../utils'
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

/**
 * Properties are parsed in Clark notation (`{namespace}name`), so that two apps
 * can use the same property name in different namespaces without colliding.
 * The well-known namespaces are stripped back off again: every consumer of
 * `Resource.props` addresses those by their bare name, and so does the WebDAV
 * library's own `prepareFileFromProps`.
 */
const stripWellKnownNamespaces = (props: Record<string, unknown>) => {
  const wellKnown = Object.values(DavNamespaces).map((uri) => `{${uri}}`)

  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      const namespace = wellKnown.find((prefix) => key.startsWith(prefix))
      return [namespace ? key.slice(namespace.length) : key, value]
    })
  ) as DAVResultResponseProps
}

/**
 * `oc:name` carries the file name and must not be interpreted: a file called
 * `2024.10` would otherwise arrive as the number 2024.1. The WebDAV library
 * guards `d:displayname` this way, but knows nothing about this one.
 */
const nameTagParser = (jPath: string, value: string): string | void => {
  if (jPath.endsWith('propstat.prop.name')) {
    return
  }
  return value
}

export const parseMultiStatus = async (xmlBody: string) => {
  const parseFileName = (name: string) => {
    const decoded = decodeURIComponent(name)
    if (name?.startsWith('/dav/')) {
      // strip out '/dav/' from the beginning
      return urlJoin(decoded.replace('/dav/', ''), {
        leadingSlash: true,
        trailingSlash: false
      })
    }

    return decoded
  }

  const parsedXML = await parseXML(xmlBody, {
    attributeNamePrefix: '@',
    attributeParsers: [],
    clarkNotationProps: true,
    tagParsers: [displaynameTagParser, nameTagParser]
  })

  return parsedXML.multistatus.response.map(({ href, propstat }) => {
    const props = propstat.prop && typeof propstat.prop === 'object' ? propstat.prop : {}
    const data = {
      ...prepareFileFromProps(stripWellKnownNamespaces(props), parseFileName(href), true),
      processing: propstat.status === 'HTTP/1.1 425 TOO EARLY'
    }

    if (data.props.name) {
      data.props.name = data.props.name.toString()
    }

    return data
  }) as unknown as WebDavResponseResource[]
}

export const parseError = (xmlBody: string): { message: string; errorCode: DavErrorCode } => {
  const parser = new XMLParser()
  const errorObj: { message: string; errorCode: DavErrorCode | undefined } = {
    message: 'Unknown error',
    errorCode: undefined
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
  } catch {
    return errorObj
  }

  return errorObj
}
