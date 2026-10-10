import type { Environment, CreatePaymentInput } from './contracts/index.js';
export type PendingPayment = CreatePaymentInput & {
    idempotencyKey: string;
};
export declare class PaymentConfirmations {
    private readonly now;
    private readonly lifetimeMs;
    private readonly pending;
    constructor(now?: () => number, lifetimeMs?: number);
    issue(input: PendingPayment, environment: Environment): string;
    consume(token: unknown, input: PendingPayment, environment: Environment): boolean;
    clear(): void;
}
export declare function confirmationMessage(input: PendingPayment, environment: Environment): string;
