export const UNIFIED_ROLE_DENIED_ID = '63e64e19-8d43-42ec-a738-2b6af2610efa'

/** @deprecated */
export abstract class SharePermissionBit {
  static readonly Read: number = 1
  static readonly Update: number = 2
  static readonly Create: number = 4
  static readonly Delete: number = 8
  static readonly Share: number = 16
}
