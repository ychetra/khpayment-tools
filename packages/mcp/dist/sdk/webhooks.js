import { createHmac, timingSafeEqual } from 'node:crypto';
import { paymentEventSchema } from '../contracts/index.js';
/** Verifies authenticity/freshness. Persist event.id and sequence transactionally to prevent duplicate fulfillment. */
export function verifyWebhook(options) {
    const fail = () => new Error('Webhook signature or event is invalid');
    const bytes = Buffer.from(options.body), tolerance = options.toleranceSeconds ?? 300;
    if (bytes.length > 65536 || !Number.isFinite(tolerance) || tolerance < 1 || tolerance > 300 || options.signature.length > 256)
        throw fail();
    const match = /^t=(\d{1,12}),kid=([A-Za-z0-9_-]{1,48}),v1=([a-f0-9]{64})$/.exec(options.signature);
    if (!match)
        throw fail();
    const timestamp = Number(match[1]), key = options.keys.get(match[2]);
    const clock = (options.now ?? new Date()).getTime() / 1000;
    if (!key || key.length !== 32 || !Number.isFinite(clock) || Math.abs(clock - timestamp) > tolerance)
        throw fail();
    const digest = createHmac('sha256', key).update(`${timestamp}.`).update(bytes).digest();
    if (!timingSafeEqual(digest, Buffer.from(match[3], 'hex')))
        throw fail();
    let value;
    try {
        value = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw fail();
    }
    const result = paymentEventSchema.safeParse(value);
    if (!result.success || result.data.environment !== options.expectedEnvironment || result.data.payment.environment !== options.expectedEnvironment ||
        result.data.payment.checkoutUrl !== null || result.data.payment.verification !== (options.expectedEnvironment === 'test' ? 'simulated' : 'public_link'))
        throw fail();
    return result.data;
}