import { intersection } from 'lodash-es'

// dummy to trick gettext string extraction into recognizing strings
const $gettext = (str: string) => {
  return str
}

export class ShareType {
  private readonly _key: string
  private readonly _value: number
  private readonly _label: string
  private readonly _icon: string

  constructor(key: string, value: number, label: string, icon: string) {
    this._key = key
    this._value = value
    this._label = label
    this._icon = icon
  }

  get key(): string {
    return this._key
  }

  get value(): number {
    return this._value
  }

  get label(): string {
    return this._label
  }

  get icon(): string {
    return this._icon
  }
}

export abstract class ShareTypes {
  static readonly user = new ShareType('user', 0, $gettext('User'), 'user')
  static readonly group = new ShareType('group', 1, $gettext('Group'), 'group')
  static readonly link = new ShareType('link', 3, $gettext('Link'), 'link')
  static readonly mail = new ShareType('mail', 4, $gettext('Guest'), 'global')
  static readonly remote = new ShareType('remote', 6, $gettext('External'), 'earth')
  // Frontend-only pseudo type: an address book contact (e.g. Open-Xchange) that
  // is not an OpenCloud user. Such a recipient results in a public link being
  // created and emailed, never a collaborator share. The value is not used by
  // the backend.
  static readonly contact = new ShareType('contact', 100, $gettext('Contact'), 'global')

  static readonly individuals = [this.user, this.mail, this.remote]
  static readonly collectives = [this.group]
  static readonly unauthenticated = [this.link]
  static readonly authenticated = [this.user, this.group, this.mail, this.remote]
  static readonly all = [this.user, this.group, this.link, this.mail, this.remote, this.contact]

  static isIndividual(type: ShareType): boolean {
    return this.individuals.includes(type)
  }

  static isCollective(type: ShareType): boolean {
    return this.collectives.includes(type)
  }

  static isUnauthenticated(type: ShareType): boolean {
    return this.unauthenticated.includes(type)
  }

  static isAuthenticated(type: ShareType): boolean {
    return this.authenticated.includes(type)
  }

  static getByValue(value: number): ShareType {
    return this.all.find((type) => type.value === value)
  }

  static getByValues(values: number[]): ShareType[] {
    return values.map((value) => this.getByValue(value))
  }

  static getByKeys(keys: string[]): ShareType[] {
    return keys.map((key) => this.all.find((type) => type.key === key))
  }

  static getValues(types: ShareType[]): number[] {
    return types.map((t) => t.value)
  }

  static containsAnyValue(types: ShareType[], values: number[]): boolean {
    return intersection(this.getValues(types), values).length > 0
  }
}
