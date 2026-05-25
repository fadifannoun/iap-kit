import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
	AppStoreServerAPIClient,
	Environment,
	SignedDataVerifier,
	JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';
import { StoreEnvironment } from '@prisma/client';
import { AppleCryptoService } from './apple-crypto.service';
import { AppleIapVerifier } from '../tokens/apple.tokens';

@Injectable()
export class AppStoreServerService implements AppleIapVerifier, OnModuleInit {
	private readonly logger = new Logger(AppStoreServerService.name);

	private client!: AppStoreServerAPIClient;
	private verifierSandbox!: SignedDataVerifier;
	private verifierProduction!: SignedDataVerifier;
	private initialized = false;

	constructor(
		private readonly config: ConfigService,
		private readonly crypto: AppleCryptoService,
	) { }

	async onModuleInit() {
		const bundleId = this.config.get<string>('APPLE_BUNDLE_ID') ?? '';
		const appAppleId = this.config.get<string>('APPLE_APP_ID');
		const key = this.crypto.getAscKey();
		const rootCAs = this.crypto.getAppleRootCAs();

		if (!key || !bundleId) {
			this.logger.warn('[Init] Missing Apple key or APPLE_BUNDLE_ID — App Store Server API disabled.');
			return;
		}

		this.client = new AppStoreServerAPIClient(
			key.privateKeyPem,
			key.keyId,
			key.issuerId,
			bundleId,
			Environment.PRODUCTION,
		);

		this.verifierSandbox = new SignedDataVerifier(
			rootCAs,
			false,
			Environment.SANDBOX,
			bundleId,
			undefined,
		);

		this.verifierProduction = new SignedDataVerifier(
			rootCAs,
			false,
			Environment.PRODUCTION,
			bundleId,
			appAppleId ? Number(appAppleId) : undefined,
		);

		this.initialized = true;
		this.logger.log(`[Init] App Store Server service initialized bundleId=${bundleId}`);
	}

	async verifyTransaction(transactionId: string): Promise<JWSTransactionDecodedPayload | null> {
		if (!this.initialized) {
			this.logger.warn(`[verifyTransaction] skipped — service not initialized tx=${transactionId}`);
			throw new Error('APPLE_STORE_NOT_INITIALIZED');
		}

		try {
			const response = await this.client.getTransactionInfo(transactionId);
			if (!response.signedTransactionInfo) {
				this.logger.warn(`[verifyTransaction] missing signedTransactionInfo tx=${transactionId}`);
				return null;
			}
			return await this.verifierSandbox.verifyAndDecodeTransaction(response.signedTransactionInfo);
		} catch (err: unknown) {
			const e = err as { status?: number; errorCode?: number; errorMessage?: string; message?: string };
			this.logger.warn(
				`[verifyTransaction] failed tx=${transactionId} status=${e.status ?? 'n/a'} code=${e.errorCode ?? 'n/a'} msg=${e.errorMessage ?? e.message ?? 'unknown'}`,
			);
			return null;
		}
	}

	async verifyAndDecodeNotification(
		signedPayload: string,
		environment: StoreEnvironment = StoreEnvironment.PRODUCTION,
	) {
		if (!this.initialized) {
			this.logger.warn('[verifyAndDecodeNotification] skipped — service not initialized');
			return null;
		}

		const primary = environment === StoreEnvironment.PRODUCTION ? this.verifierProduction : this.verifierSandbox;
		const fallback = environment === StoreEnvironment.PRODUCTION ? this.verifierSandbox : this.verifierProduction;

		try {
			return await primary.verifyAndDecodeNotification(signedPayload);
		} catch {
			try {
				return await fallback.verifyAndDecodeNotification(signedPayload);
			} catch (err: unknown) {
				const e = err as { errorCode?: number; errorMessage?: string; message?: string };
				this.logger.warn(
					`[verifyAndDecodeNotification] failed code=${e.errorCode ?? 'n/a'} msg=${e.errorMessage ?? e.message ?? 'unknown'}`,
				);
				return null;
			}
		}
	}

	async decodeSignedTransactionInfo(
		signedTransactionInfo: string,
		environment: StoreEnvironment = StoreEnvironment.PRODUCTION,
	): Promise<JWSTransactionDecodedPayload | null> {
		if (!this.initialized) {
			this.logger.warn('[decodeSignedTransactionInfo] skipped — service not initialized');
			return null;
		}

		const primary = environment === StoreEnvironment.PRODUCTION ? this.verifierProduction : this.verifierSandbox;
		const fallback = environment === StoreEnvironment.PRODUCTION ? this.verifierSandbox : this.verifierProduction;

		try {
			return await primary.verifyAndDecodeTransaction(signedTransactionInfo);
		} catch {
			try {
				return await fallback.verifyAndDecodeTransaction(signedTransactionInfo);
			} catch (err: unknown) {
				const e = err as { errorCode?: number; errorMessage?: string; message?: string };
				this.logger.warn(
					`[decodeSignedTransactionInfo] failed code=${e.errorCode ?? 'n/a'} msg=${e.errorMessage ?? e.message ?? 'unknown'}`,
				);
				return null;
			}
		}
	}
}
