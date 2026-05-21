export enum StorePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

export enum ProductType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
}

export enum TransactionStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  GRANTED = 'granted',
  REVOKED = 'revoked',
  FAILED = 'failed',
}

export enum EntitlementStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum StoreEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  DEAD = 'dead',
}

export enum RefundResolution {
  REVOKED = 'revoked',
  RESTORED = 'restored',
  NO_CHANGE = 'no_change',
}
