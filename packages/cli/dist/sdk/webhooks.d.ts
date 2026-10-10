import { type PaymentEvent } from '../contracts/index.js';
export type { PaymentEvent };
export interface WebhookVerificationOptions {
    /** Exact UTF-8 body bytes, before JSON parsing or normalization. */
    body: string | Uint8Array;
    signature: string;
    keys: ReadonlyMap<string, Uint8Array>;
    expectedEnvironment: 'test' | 'live';
    toleranceSeconds?: number;
    now?: Date;
}
/** Verifies authenticity/freshness. Persist event.id and sequence transactionally to prevent duplicate fulfillment. */
export declare function verifyWebhook(options: WebhookVerificationOptions): PaymentEvent;
