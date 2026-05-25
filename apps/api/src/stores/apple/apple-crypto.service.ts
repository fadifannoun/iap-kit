import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface AppleKeyMaterial {
	keyId: string;
	issuerId: string;
	privateKeyPem: string;
}

@Injectable()
export class AppleCryptoService {
	private readonly logger = new Logger(AppleCryptoService.name);

	private ascKey?: AppleKeyMaterial | null;
	private rootCAs?: Buffer[];

	constructor(private readonly config: ConfigService) { }

	/** App Store Connect / App Store Server API key material. */
	getAscKey(): AppleKeyMaterial | null {
		if (this.ascKey === undefined) this.ascKey = this.loadAscKey();
		return this.ascKey;
	}

	/** Apple Root CAs used by SignedDataVerifier to validate the x5c chain. */
	getAppleRootCAs(): Buffer[] {
		if (!this.rootCAs) this.rootCAs = this.loadAppleRootCAs();
		return this.rootCAs;
	}

	private loadAscKey(): AppleKeyMaterial | null {
		const keyId = this.optional('APP_STORE_CONNECT_KEY_ID');
		const issuerId = this.optional('APP_STORE_CONNECT_ISSUER_ID');
		const privateKeyPem = this.config.get<string>('APP_STORE_CONNECT_PRIVATE_KEY_PEM');
		const privateKeyPath = this.config.get<string>('APP_STORE_CONNECT_PRIVATE_KEY_PATH');

		if (!keyId || !issuerId) {
			this.logger.warn('Missing APP_STORE_CONNECT_KEY_ID / APP_STORE_CONNECT_ISSUER_ID — Apple store disabled.');
			return null;
		}

		const pem = privateKeyPem
			? this.normalizePem(privateKeyPem)
			: this.readPemFromPath(privateKeyPath);

		if (!pem) {
			this.logger.warn('Missing or invalid Apple private key PEM — Apple store disabled.');
			return null;
		}

		return { keyId, issuerId, privateKeyPem: pem };
	}

	private loadAppleRootCAs(): Buffer[] {
		const certDir = this.config.get<string>('APPLE_CERTS_DIR') ?? 'certs';
		const base = path.isAbsolute(certDir) ? certDir : path.join(process.cwd(), certDir);

		const fileList = this.config.get<string>('APPLE_ROOT_CA_FILES');
		const files = fileList
			? fileList.split(',').map((s) => s.trim()).filter(Boolean)
			: ['AppleRootCA-G3.cer', 'AppleRootCA-G2.cer'];

		const certs: Buffer[] = [];
		for (const f of files) {
			const fp = path.join(base, f);
			if (!fs.existsSync(fp)) {
				this.logger.warn(`Apple Root CA not found: ${fp} (skipping)`);
				continue;
			}
			certs.push(fs.readFileSync(fp));
		}

		if (!certs.length) {
			this.logger.warn('No Apple Root CAs loaded — JWS signature verification will fail.');
		} else {
			this.logger.log(`Loaded Apple Root CAs: ${files.join(', ')}`);
		}

		return certs;
	}

	private readPemFromPath(relPath?: string | null): string | null {
		if (!relPath) return null;
		const fp = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
		if (!fs.existsSync(fp)) {
			this.logger.warn(`Apple key file not found: ${fp}`);
			return null;
		}
		return this.normalizePem(fs.readFileSync(fp, 'utf8'));
	}

	private normalizePem(raw: string): string | null {
		const pem = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
		const trimmed = pem.trim();
		if (!trimmed.includes('BEGIN PRIVATE KEY') || !trimmed.includes('END PRIVATE KEY')) {
			this.logger.warn('Apple private key PEM does not look valid (missing header/footer).');
			return null;
		}
		return trimmed;
	}

	private optional(key: string): string | null {
		const val = this.config.get<string>(key);
		return val?.trim() || null;
	}
}
