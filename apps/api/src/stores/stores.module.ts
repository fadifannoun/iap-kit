import { Module } from '@nestjs/common';
import { AppleCryptoService } from './apple/apple-crypto.service';
import { AppStoreServerService } from './apple/app-store-server.service';
import { GooglePlayVerifierService } from './google/google-play-verifier.service';
import { StoreWebhooksService } from './stores-webhooks.service';
import { StoreWebhooksController } from './stores-webhooks.controller';
import { APPLE_IAP_VERIFIER } from './tokens/apple.tokens';
import { GOOGLE_IAP_VERIFIER } from './tokens/google.tokens';

@Module({
	controllers: [StoreWebhooksController],
	providers: [
		AppleCryptoService,
		AppStoreServerService,
		GooglePlayVerifierService,
		StoreWebhooksService,
		{ provide: APPLE_IAP_VERIFIER, useExisting: AppStoreServerService },
		{ provide: GOOGLE_IAP_VERIFIER, useExisting: GooglePlayVerifierService },
	],
	exports: [
		APPLE_IAP_VERIFIER,
		GOOGLE_IAP_VERIFIER,
		AppStoreServerService,
	],
})
export class StoresModule { }
