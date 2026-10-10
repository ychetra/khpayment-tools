import { randomBytes } from 'node:crypto';
// Opaque, single-use handles keep client-supplied confirmation state from changing
// the approved request. They are local to one stdio connection, never persisted.
export class PaymentConfirmations {
    now;
    lifetimeMs;
    pending = new Map();
    constructor(now = Date.now, lifetimeMs = 120_000) {
        this.now = now;
        this.lifetimeMs = lifetimeMs;
    }
    issue(input, environment) {
        for (const [token, value] of this.pending) {
            if (value.expiresAt <= this.now())
                this.pending.delete(token);
        }
        if (this.pending.size >= 32)
            throw new Error('Too many pending confirmations');
        const token = randomBytes(32).toString('hex');
        this.pending.set(token, { request: JSON.stringify({ environment, input }), expiresAt: this.now() + this.lifetimeMs });
        return token;
    }
    consume(token, input, environment) {
        if (typeof token !== 'string')
            return false;
        const value = this.pending.get(token);
        this.pending.delete(token);
        return !!value && value.expiresAt > this.now() && value.request === JSON.stringify({ environment, input });
    }
    clear() { this.pending.clear(); }
}
export function confirmationMessage(input, environment) {
    return `Create this ${environment} payment? Review the exact request below. ` +
        (environment === 'test' ? 'This is simulated and does not contact a bank.\n' : 'This uses the merchant’s live provider link.\n') +
        JSON.stringify({ environment, ...input }, null, 2);
}