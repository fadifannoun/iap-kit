export const GOOGLE_IAP_VERIFIER = Symbol('GOOGLE_IAP_VERIFIER');

export interface GoogleVerifiedPurchase {
	kind: 'product' | 'subscription';
	purchaseState: number;
	orderId?: string | null;
	purchaseTimeMillis?: string | null;
	acknowledgementState?: number | null;
	paymentState?: number | null;
	cancelReason?: number | null;
	raw: unknown;
}

export interface GoogleIapVerifier {
	verifyPurchase(input: {
		purchaseToken: string;
		productKey: string;
		packageName?: string;
	}): Promise<GoogleVerifiedPurchase | null>;
}
