import { type CreatePaymentInput, type PaymentView, type UsageView } from '../contracts/index.js';
export type { CreatePaymentInput, PaymentView, UsageView } from '../contracts/index.js';
export { verifyWebhook, type PaymentEvent, type WebhookVerificationOptions } from './webhooks.js';
export declare class KhPaymentError extends Error {
    readonly code: string;
    readonly status: number;
    readonly requestId: string | null;
    readonly retryAfterSeconds: number | null;
    readonly paymentId?: string | undefined;
    constructor(message: string, code: string, status?: number, requestId?: string | null, retryAfterSeconds?: number | null, paymentId?: string | undefined);
}
export interface KhPaymentClient {
    createPayment(input: CreatePaymentInput, options: {
        idempotencyKey: string;
        signal?: AbortSignal;
    }): Promise<PaymentView | {
        state: 'creating';
        id: string;
    }>;
    getPayment(id: string, options?: {
        signal?: AbortSignal;
    }): Promise<PaymentView>;
    getPaymentStatus(id: string, options?: {
        signal?: AbortSignal;
    }): Promise<PaymentView>;
    getUsage(options?: {
        signal?: AbortSignal;
    }): Promise<UsageView>;
}
export declare function createClient(options: {
    baseUrl: string;
    apiKey: string;
    expectedEnvironment?: 'test' | 'live';
    fetch?: typeof fetch;
    timeoutMs?: number;
}): KhPaymentClient;
/** Sequential, bounded server-side polling. Creation is never retried here. */
export declare function waitForPayment(client: Pick<KhPaymentClient, 'getPaymentStatus'>, id: string, options?: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onStatus?: (payment: PaymentView) => void;
}): Promise<PaymentView>;
