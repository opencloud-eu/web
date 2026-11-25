import { encodePath, urlJoin } from '../../utils'
import { DavMethod, DavPropertyValue } from '../constants'
import { buildPropFindBody, buildPropPatchBody, DavPropertyRecord } from './builders'
import { parseError, parseMultiStatus, parseTusHeaders } from './parsers'
import { WebDavResponseResource } from '../../helpers'
import { DavHttpError } from '../../errors'

export type DavRequestHeaders = Record<string, string>

export interface DAVOptions {
  baseUrl: string
  headers?: () => DavRequestHeaders
  withCredentials?: () => boolean
}

export interface DavResult {
  body: WebDavResponseResource[] | undefined
  status: number
  result: Response
}

export type DAVRequestOptions = {
  headers?: DavRequestHeaders
  signal?: AbortSignal
}

type DavRequest = {
  method: DavMethod
  data?: string | ArrayBuffer
} & DAVRequestOptions

export class DAV {
  private davPath: string
  private headers: () => DavRequestHeaders
  private withCredentials: () => boolean
  public extraProps: string[]

  constructor({ baseUrl, headers, withCredentials }: DAVOptions) {
    this.davPath = urlJoin(baseUrl, 'dav')
    this.headers = headers
    this.withCredentials = withCredentials
    this.extraProps = []
  }

  public mkcol(path: string, opts: DAVRequestOptions = {}) {
    return this.request(path, { method: DavMethod.mkcol, ...opts })
  }

  public async propfind(
    path: string,
    {
      depth = 1,
      properties = [],
      extraProps = [],
      headers = {},
      ...opts
    }: {
      depth?: number
      properties?: DavPropertyValue[]
      /** Namespaced props for this request only, on top of the globally registered ones. */
      extraProps?: string[]
    } & DAVRequestOptions = {}
  ) {
    const requestHeaders = { ...headers, Depth: depth.toString() }
    const { body, result } = await this.request(path, {
      method: DavMethod.propfind,
      data: buildPropFindBody(properties, { extraProps: [...this.extraProps, ...extraProps] }),
      headers: requestHeaders,
      ...opts
    })

    if (body?.length) {
      // add tus info to current folder only
      body[0].tusSupport = parseTusHeaders(result.headers)
    }

    return body
  }

  public async report(
    path: string,
    {
      pattern = '',
      filterRules = null,
      limit = 30,
      properties,
      ...opts
    }: {
      pattern?: string
      filterRules?: Partial<Record<DavPropertyValue, unknown>>
      limit?: number
      properties?: DavPropertyValue[]
    } & DAVRequestOptions = {}
  ) {
    const { body, result } = await this.request(path, {
      method: DavMethod.report,
      data: buildPropFindBody(properties, {
        pattern,
        filterRules,
        limit,
        extraProps: this.extraProps
      }),
      ...opts
    })

    return {
      results: body,
      range: result.headers.get('content-range')
    }
  }

  public copy(
    source: string,
    target: string,
    { overwrite = false, headers = {}, ...opts }: { overwrite?: boolean } & DAVRequestOptions = {}
  ) {
    const targetUrl = urlJoin(this.davPath, encodePath(target))
    return this.request(source, {
      method: DavMethod.copy,
      headers: { ...headers, Destination: targetUrl, overwrite: overwrite ? 'T' : 'F' },
      ...opts
    })
  }

  public move(
    source: string,
    target: string,
    { overwrite = false, headers = {}, ...opts }: { overwrite?: boolean } & DAVRequestOptions = {}
  ) {
    const targetUrl = urlJoin(this.davPath, encodePath(target))
    return this.request(source, {
      method: DavMethod.move,
      headers: { ...headers, Destination: targetUrl, overwrite: overwrite ? 'T' : 'F' },
      ...opts
    })
  }

  public put(
    path: string,
    content: string | ArrayBuffer,
    {
      headers = {},
      previousEntityTag,
      overwrite,
      ...opts
    }: {
      previousEntityTag?: string
      overwrite?: boolean
    } & DAVRequestOptions = {}
  ) {
    const requestHeaders = { ...headers }
    if (previousEntityTag) {
      // will ensure that no other client uploaded a different version meanwhile
      requestHeaders['If-Match'] = previousEntityTag
    } else if (!overwrite) {
      // will trigger 412 precondition failed if a file already exists
      requestHeaders['If-None-Match'] = '*'
    }

    return this.request(path, {
      method: DavMethod.put,
      data: content,
      headers: requestHeaders,
      ...opts
    })
  }

  public delete(path: string, opts: DAVRequestOptions = {}) {
    return this.request(path, { method: DavMethod.delete, ...opts })
  }

  public propPatch(
    path: string,
    properties: DavPropertyRecord,
    {
      extraProps = [],
      ...opts
    }: {
      /** Namespaced props for this request only, on top of the globally registered ones. */
      extraProps?: string[]
    } & DAVRequestOptions = {}
  ) {
    // Extra props keep their own namespace prefix instead of being forced into
    // `oc:`, same as in PROPFIND. A name that isn't listed here would be written
    // as `oc:<name>`, which the server stores but no PROPFIND can read back.
    const body = buildPropPatchBody(properties, [...this.extraProps, ...extraProps])
    return this.request(path, { method: DavMethod.proppatch, data: body, ...opts })
  }

  public getFileUrl(path: string) {
    return urlJoin(this.davPath, encodePath(path))
  }

  private buildHeaders(headers: DavRequestHeaders = {}): Headers {
    // Headers#set merges names case-insensitively, later values win
    const result = new Headers()
    const sources = [
      {
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Request-ID': crypto.randomUUID()
      },
      this.headers?.() || {},
      headers
    ]
    for (const source of sources) {
      for (const [name, value] of Object.entries(source)) {
        result.set(name, value)
      }
    }
    return result
  }

  private async request(
    path: string,
    { method, data, headers, signal }: DavRequest
  ): Promise<DavResult> {
    const url = urlJoin(this.davPath, encodePath(path), { leadingSlash: true })

    const result = await fetch(url, {
      method,
      body: data,
      headers: this.buildHeaders(headers),
      signal,
      ...(this.withCredentials?.() && { credentials: 'include' })
    })

    if (result.status >= 400) {
      const errorMessage = parseError(await result.text())
      throw new DavHttpError(
        errorMessage.message,
        errorMessage.errorCode,
        result,
        result.status,
        errorMessage.errorType
      )
    }

    let body: WebDavResponseResource[]
    if (result.status === 207) {
      body = parseMultiStatus(await result.text())
    }

    return { body, status: result.status, result }
  }
}
