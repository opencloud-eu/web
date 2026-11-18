import { AxiosInstance } from 'axios'
import { bytesToHex, urlJoin } from '../utils'
import { XMLParser } from 'fast-xml-parser'

export interface UrlSignOptions {
  axiosClient: AxiosInstance
  baseURI: string
}

export class UrlSign {
  private axiosClient: AxiosInstance
  private baseURI: string

  private xmlParser: XMLParser
  private signingKey: string

  private TTL = 1200
  private HASH_LENGTH = 32
  private ITERATION_COUNT = 10000

  constructor({ axiosClient, baseURI }: UrlSignOptions) {
    this.axiosClient = axiosClient
    this.baseURI = baseURI
    this.xmlParser = new XMLParser()
  }

  public async signUrl(url: string, username: string) {
    const signedUrl = new URL(url)
    signedUrl.searchParams.set('OC-Credential', username)
    signedUrl.searchParams.set('OC-Date', new Date().toISOString())
    signedUrl.searchParams.set('OC-Expires', this.TTL.toString())
    signedUrl.searchParams.set('OC-Verb', 'GET')

    const hashedKey = await this.createHashedKey(signedUrl.toString())

    signedUrl.searchParams.set('OC-Algo', `PBKDF2/${this.ITERATION_COUNT}-SHA512`)
    signedUrl.searchParams.set('OC-Signature', hashedKey)

    return signedUrl.toString()
  }

  private async getSignKey() {
    if (this.signingKey) {
      return this.signingKey
    }

    const data = await this.axiosClient.get(
      urlJoin(this.baseURI, 'ocs/v1.php/cloud/user/signing-key'),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    )

    const parsedXML = this.xmlParser.parse(data.data)
    this.signingKey = parsedXML.ocs.data['signing-key']
    return this.signingKey
  }

  private async createHashedKey(url: string) {
    const signingKey = await this.getSignKey()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(url), 'PBKDF2', false, [
      'deriveBits'
    ])
    const hashedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-512',
        salt: encoder.encode(signingKey),
        iterations: this.ITERATION_COUNT
      },
      key,
      this.HASH_LENGTH * 8
    )

    return bytesToHex(hashedKey)
  }
}
