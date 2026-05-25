import { Injectable, Logger } from '@nestjs/common';
import { StorePlatform, StoreEnvironment } from '@prisma/client';
import { AppStoreServerService } from './apple/app-store-server.service';
import { PrismaService } from '../prisma/prisma.service';

interface AppleWebhookBody {
	signedPayload?: string;
}

interface AppleNotificationData {
	signedTransactionInfo?: string;
	transactionId?: string;
}

const REFUND_NOTIFICATION_TYPES = new Set(['REFUND', 'REFUND_REVERSED', 'REFUND_DECLINED']);

@Injectable()
export class StoreWebhooksService {
	private readonly logger = new Logger(StoreWebhooksService.name);

	constructor(
		private readonly appStore: AppStoreServerService,
		private readonly prisma: PrismaService,
	) { }

	async handleApple(body: unknown, environment: StoreEnvironment): Promise<void> {
		const signedPayload = (body as AppleWebhookBody)?.signedPayload;
		if (!signedPayload) return;

		const decoded = await this.appStore.verifyAndDecodeNotification(signedPayload, environment);
		if (!decoded) {
			this.logger.warn(`[handleApple] Failed to verify notification env=${environment}`);
			return;
		}

		const notificationType = decoded.notificationType;
		if (!REFUND_NOTIFICATION_TYPES.has(notificationType ?? '')) return;

		const data = decoded.data as AppleNotificationData | undefined;
		const tx = data?.signedTransactionInfo
			? await this.appStore.decodeSignedTransactionInfo(data.signedTransactionInfo, environment)
			: null;

		const transactionId = tx?.transactionId ?? data?.transactionId;
		if (!transactionId) {
			this.logger.warn('[handleApple] Could not extract transactionId from refund notification');
			return;
		}

		await this.prisma.iapRefundNotification.create({
			data: {
				platform: StorePlatform.IOS,
				environment,
				storeTransactionId: transactionId,
				rawPayload: decoded as object,
			},
		});

		this.logger.log(
			`[handleApple] Refund notification persisted type=${notificationType} tx=${transactionId} env=${environment}`,
		);
	}

	async handleGoogle(): Promise<void> {
		this.logger.log('[handleGoogle] Google Play notification received (processing not yet implemented)');
	}
}
