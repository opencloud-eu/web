import type { AxiosResponse } from 'axios'
import { DavErrorCode } from './webdav'

export class HttpError extends Error {
  public response: Response | AxiosResponse
  public statusCode: number

  constructor(message: string, response: Response | AxiosResponse, statusCode: number = null) {
    super(message)
    this.response = response
    this.statusCode = statusCode
  }
}

export class DavHttpError extends HttpError {
  declare public response: Response
  public errorCode: DavErrorCode
  public errorType: string | undefined

  constructor(
    message: string,
    errorCode: DavErrorCode,
    response: Response,
    statusCode: number = null,
    errorType?: string
  ) {
    super(message, response, statusCode)
    this.errorCode = errorCode
    this.errorType = errorType
  }
}
