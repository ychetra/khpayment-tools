import { z } from 'zod';
import { createPaymentSchema, paymentViewSchema, usageViewSchema, apiErrorSchema } from '../contracts/index.js';
export { verifyWebhook } from './webhooks.js';
export class KhPaymentError extends Error {
    code;
    status;
    requestId;
    retryAfterSeconds;
    paymentId;
    constructor(message, code, status = 0, requestId = null, retryAfterSeconds = null, paymentId) {
        super(message);
        this.code = code;
        this.status = status;
        this.requestId = requestId;
        this.retryAfterSeconds = retryAfterSeconds;
        this.paymentId = paymentId;
        this.name = 'KhPaymentError';
    }
}
export function createClient(options) {
    let base;
    try {
        base = new URL(options.baseUrl);
    }
    catch {
        throw new KhPaymentError('Configure an HTTPS API origin', 'INVALID_CONFIG');
    }
    if (base.username || base.password || base.search || base.hash || base.pathname !== '/' || !(base.protocol === 'https:' || (base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))))
        throw new KhPaymentError('Use an HTTPS origin, or HTTP loopback for local testing', 'INVALID_CONFIG');
    if (!options.apiKey || options.apiKey.length > 512 || /[\r\n]/.test(options.apiKey))
        throw new KhPaymentError('Configure a server-side API key', 'INVALID_CONFIG');
    if (options.expectedEnvironment !== undefined && !['test', 'live'].includes(options.expectedEnvironment))
        throw new KhPaymentError('Expected environment must be test or live', 'INVALID_CONFIG');
    const timeout = options.timeoutMs ?? 10000;
    if (!Number.isFinite(timeout) || timeout < 10 || timeout > 30000)
        throw new KhPaymentError('Timeout must be between 10 and 30000 milliseconds', 'INVALID_CONFIG');
    const fetcher = options.fetch ?? fetch, origin = base.origin, key = options.apiKey;
    const clean = (value) => value.replaceAll(key, '[REDACTED]').replace(/Bearer\s+[^\s"']+/g, 'Bearer [REDACTED]').slice(0, 300);
    async function call(path, method = 'GET', body, idempotency, signal) {
        const deadline = new AbortController(), timer = setTimeout(() => deadline.abort(), timeout), combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
        const bounded = (operation) => new Promise((resolve, reject) => {
            const abort = () => reject(new Error('aborted'));
            if (combined.aborted) {
                abort();
                return;
            }
            combined.addEventListener('abort', abort, { once: true });
            Promise.resolve().then(operation).then(resolve, reject).finally(() => combined.removeEventListener('abort', abort));
        });
        try {
            const response = await bounded(() => fetcher(new URL(path, origin), { method, redirect: 'manual', signal: combined, headers: { authorization: `Bearer ${key}`, accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(idempotency ? { 'idempotency-key': idempotency } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }));
            if (response.status >= 300 && response.status < 400)
                throw new KhPaymentError('API redirects are not followed. Configure the correct origin.', 'REDIRECT_REJECTED', response.status);
            const reader = response.body?.getReader(), chunks = [];
            let size = 0;
            if (reader)
                for (;;) {
                    const next = await bounded(() => reader.read());
                    if (next.done)
                        break;
                    size += next.value.length;
                    if (size > 1024 * 1024) {
                        void reader.cancel().catch(() => { });
                        throw new KhPaymentError('API response exceeded the size limit', 'INVALID_RESPONSE', response.status);
                    }
                    chunks.push(next.value);
                }
            const raw = Buffer.concat(chunks).toString('utf8').replaceAll(key, '[REDACTED]');
            let data;
            try {
                data = JSON.parse(raw);
            }
            catch {
                throw new KhPaymentError('API returned an invalid response', 'INVALID_RESPONSE', response.status);
            }
            if (!response.ok) {
                const parsed = apiErrorSchema.safeParse(data), error = parsed.success ? parsed.data.error : null, header = response.headers.get('retry-after');
                const retry = header === null ? NaN : /^\d+(\.\d+)?$/.test(header) ? Number(header) : Math.max(0, (Date.parse(header) - Date.now()) / 1000);
                throw new KhPaymentError(error ? clean(error.message) : 'API request failed', error ? clean(error.code) : 'API_ERROR', response.status, error ? clean(error.requestId) : null, Number.isFinite(retry) && retry >= 0 ? retry : null, error?.paymentId);
            }
            return { status: response.status, data };
        }
        catch (error) {
            if (error instanceof KhPaymentError)
                throw error;
            if (signal?.aborted)
                throw new KhPaymentError('Request cancelled. Creation may have reached the server; reuse its idempotency key.', 'REQUEST_CANCELLED');
            if (deadline.signal.aborted)
                throw new KhPaymentError('Request timed out. Creation may have reached the server; reuse its idempotency key.', 'REQUEST_TIMEOUT');
            throw new KhPaymentError('Connection failed. Creation may have reached the server; reuse its idempotency key.', 'NETWORK_ERROR');
        }
        finally {
            clearTimeout(timer);
        }
    }
    const parsed = (schema, data) => { const result = schema.safeParse(data); if (!result.success)
        throw new KhPaymentError('API response did not match the payment contract', 'INVALID_RESPONSE'); return result.data; };
    const id = (value) => { if (!z.uuid().safeParse(value).success)
        throw new KhPaymentError('A valid payment ID is required', 'INVALID_INPUT'); return value; };
    const environment = (value) => {
        if (options.expectedEnvironment && value.environment !== options.expectedEnvironment)
            throw new KhPaymentError('API key or response belongs to a different environment', 'ENVIRONMENT_MISMATCH');
        return value;
    };
    const payment = (data, requestedId) => {
        // Additive server fields are ignored; known fields retain their strict types.
        const value = environment(parsed(paymentViewSchema.strip(), data));
        if (requestedId && value.id !== requestedId)
            throw new KhPaymentError('API returned a different payment', 'INVALID_RESPONSE');
        if (value.checkoutUrl && new URL(value.checkoutUrl).origin !== origin)
            throw new KhPaymentError('Checkout URL belongs to a different origin', 'INVALID_RESPONSE');
        return value;
    };
    return {
        async createPayment(input, settings) {
            const checked = createPaymentSchema.safeParse(input);
            if (!checked.success || !/^[A-Za-z0-9._:-]{8,128}$/.test(settings.idempotencyKey))
                throw new KhPaymentError('Check the payment fields and Idempotency-Key', 'INVALID_INPUT');
            // Check the authenticated key before dispatching a side-effecting request.
            if (options.expectedEnvironment)
                environment(parsed(usageViewSchema.strip(), (await call('/api/v1/usage', 'GET', undefined, undefined, settings.signal)).data));
            const result = await call('/api/v1/payments', 'POST', checked.data, settings.idempotencyKey, settings.signal);
            if (result.status === 202) {
                const waiting = parsed(z.object({ paymentId: z.uuid(), state: z.literal('creating') }).strip(), result.data);
                return { state: 'creating', id: waiting.paymentId };
            }
            return payment(result.data);
        },
        async getPayment(value, settings) { return payment((await call(`/api/v1/payments/${id(value)}`, 'GET', undefined, undefined, settings?.signal)).data, value); },
        async getPaymentStatus(value, settings) { return payment((await call(`/api/v1/payments/${id(value)}/status`, 'GET', undefined, undefined, settings?.signal)).data, value); },
        async getUsage(settings) { return environment(parsed(usageViewSchema.strip(), (await call('/api/v1/usage', 'GET', undefined, undefined, settings?.signal)).data)); },
    };
}
/** Sequential, bounded server-side polling. Creation is never retried here. */
export async function waitForPayment(client, id, options = {}) {
    const interval = options.intervalMs ?? 3000, timeout = options.timeoutMs ?? 600000;
    if (!Number.isFinite(interval) || interval < 3000 || interval > 60000 || !Number.isFinite(timeout) || timeout < 1 || timeout > 3600000)
        throw new KhPaymentError('Use a polling interval of at least 3 seconds and a bounded timeout', 'INVALID_INPUT');
    const deadline = AbortSignal.timeout(timeout), signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    const cancelled = () => new KhPaymentError(options.signal?.aborted ? 'Polling cancelled' : 'Polling deadline reached', options.signal?.aborted ? 'REQUEST_CANCELLED' : 'POLLING_TIMEOUT');
    const sleep = (ms) => new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(cancelled());
            return;
        }
        const stop = () => { clearTimeout(timer); signal.removeEventListener('abort', stop); reject(cancelled()); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, ms);
        signal.addEventListener('abort', stop, { once: true });
    });
    for (;;) {
        if (signal.aborted)
            throw cancelled();
        let delay = interval;
        try {
            const payment = await client.getPaymentStatus(id, { signal });
            if (signal.aborted)
                throw cancelled();
            options.onStatus?.(payment);
            if (['paid', 'failed', 'expired', 'cancelled'].includes(payment.state))
                return payment;
        }
        catch (error) {
            if (signal.aborted)
                throw cancelled();
            if (!(error instanceof KhPaymentError) || !(error.status === 429 || error.status >= 500 || ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(error.code)))
                throw error;
            // A rate limit never causes a payment recreation or an immediate read retry.
            delay = Math.max(interval, (error.retryAfterSeconds ?? 0) * 1000) + Math.floor(Math.random() * 250);
        }
        await sleep(Math.min(delay, timeout));
    }
}