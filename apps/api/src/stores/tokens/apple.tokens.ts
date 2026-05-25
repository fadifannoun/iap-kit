import { JWSTransactionDecodedPayload } from '@apple/app-store-server-library';

export const APPLE_IAP_VERIFIER = Symbol('APPLE_IAP_VERIFIER');

export interface AppleIapVerifier {
	verifyTransaction(transactionId: string): Promise<JWSTransactionDecodedPayload | null>;
}
