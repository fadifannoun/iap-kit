import { StorePlatform, ProductType, EntitlementStatus } from '../enums/index.js';
import { ProductKey } from '../types/index.js';

// ─── IAP Verification ────────────────────────────────────────────────────────

export interface VerifyIapRequest {
  platform: StorePlatform;
  productKey: ProductKey;

  // iOS (App Store Server API)
  transactionId?: string;

  // Android (Google Play Billing)
  packageName?: string;
  purchaseToken?: string;
}

export interface VerifyPurchaseResponse {
  ok: true;
  platform: StorePlatform;
  productKey: ProductKey;
  productType: ProductType;
  transactionId: string;
  originalTransactionId?: string;
  granted: boolean;
  grantedProductKeys: ProductKey[];
}

export type VerifyPurchaseErrorCode =
  | 'INVALID'
  | 'NOT_FOUND'
  | 'STORE_UNAVAILABLE'
  | 'REVOKED'
  | 'DUPLICATE'
  | 'UNKNOWN';

export interface VerifyPurchaseError {
  ok: false;
  code: VerifyPurchaseErrorCode;
  message: string;
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

export interface UserOwnershipDto {
  productKey: ProductKey;
  productType: ProductType;
  owned: boolean;
  status: EntitlementStatus;
  expiresAt?: string; // ISO — subscriptions only
}

export interface EntitlementsSnapshot {
  items: UserOwnershipDto[];
  updatedAt: string; // ISO
}
