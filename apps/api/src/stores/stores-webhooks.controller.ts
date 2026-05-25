import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { StoreEnvironment } from '@prisma/client';
import { StoreWebhooksService } from './stores-webhooks.service';

@Controller('iap/webhooks')
export class StoreWebhooksController {
	constructor(private readonly webhooks: StoreWebhooksService) { }

	@Post('apple')
	@HttpCode(200)
	async handleAppleProduction(@Body() body: unknown) {
		await this.webhooks.handleApple(body, StoreEnvironment.PRODUCTION);
		return { ok: true };
	}

	@Post('apple/sandbox')
	@HttpCode(200)
	async handleAppleSandbox(@Body() body: unknown) {
		await this.webhooks.handleApple(body, StoreEnvironment.SANDBOX);
		return { ok: true };
	}

	@Post('google')
	@HttpCode(200)
	async handleGoogle() {
		await this.webhooks.handleGoogle();
		return { ok: true };
	}
}
