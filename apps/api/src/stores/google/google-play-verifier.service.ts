import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, androidpublisher_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleIapVerifier, GoogleVerifiedPurchase } from '../tokens/google.tokens';

@Injectable()
export class GooglePlayVerifierService implements GoogleIapVerifier, OnModuleInit {
	private readonly logger = new Logger(GooglePlayVerifierService.name);

	private publisher!: androidpublisher_v3.Androidpublisher;
	private defaultPackageName?: string;
	private initialized = false;

	constructor(private readonly config: ConfigService) { }

	async onModuleInit() {
		this.defaultPackageName = this.config.get<string>('GOOGLE_PLAY_PACKAGE_NAME') ?? undefined;
		const serviceAccountJson = this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
		const serviceAccountPath = this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_PATH');

		let credentials: unknown;
		if (serviceAccountJson) {
			credentials = JSON.parse(serviceAccountJson);
		} else if (serviceAccountPath) {
			const fp = path.isAbsolute(serviceAccountPath)
				? serviceAccountPath
				: path.join(process.cwd(), serviceAccountPath);
			if (!fs.existsSync(fp)) {
				this.logger.warn(`Google service account file not found: ${fp} — Google Play disabled.`);
				return;
			}
			credentials = JSON.parse(fs.readFileSync(fp, 'utf8'));
		} else {
			this.logger.warn('Missing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / PATH — Google Play disabled.');
			return;
		}

		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/androidpublisher'],
			// googleapis auth typing requires `any` for parsed JSON credentials
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			credentials: credentials as any,
		});

		this.publisher = google.androidpublisher({ version: 'v3', auth });
		this.initialized = true;
		this.logger.log('[Init] Google Play verifier initialized.');
	}

	async verifyPurchase(input: {
		purchaseToken: string;
		productKey: string;
		packageName?: string;
	}): Promise<GoogleVerifiedPurchase | null> {
		if (!this.initialized) {
			throw new Error('GOOGLE_PLAY_NOT_INITIALIZED');
		}

		const packageName = input.packageName ?? this.defaultPackageName;
		if (!packageName) throw new Error('Google Play packageName is required');

		try {
			const res = await this.publisher.purchases.products.get({
				packageName,
				productId: input.productKey,
				token: input.purchaseToken,
			});
			return {
				kind: 'product',
				purchaseState: res.data.purchaseState ?? 0,
				orderId: res.data.orderId,
				purchaseTimeMillis: res.data.purchaseTimeMillis,
				acknowledgementState: res.data.acknowledgementState,
				raw: res.data,
			};
		} catch (err: unknown) {
			if (!this.isNotFound(err)) throw err;
		}

		const sub = await this.publisher.purchases.subscriptions.get({
			packageName,
			subscriptionId: input.productKey,
			token: input.purchaseToken,
		});

		let purchaseState = 0;
		if (sub.data.paymentState === 0) purchaseState = 2;
		if (typeof sub.data.cancelReason === 'number' && sub.data.cancelReason > 0) purchaseState = 1;

		return {
			kind: 'subscription',
			purchaseState,
			orderId: sub.data.orderId,
			purchaseTimeMillis: sub.data.startTimeMillis,
			acknowledgementState: sub.data.acknowledgementState,
			paymentState: sub.data.paymentState,
			cancelReason: sub.data.cancelReason,
			raw: sub.data,
		};
	}

	private isNotFound(err: unknown): boolean {
		const e = err as { code?: number; response?: { status?: number } };
		return e?.code === 404 || e?.response?.status === 404;
	}
}
