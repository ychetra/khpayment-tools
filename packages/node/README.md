# KHPayment for Node.js

Beta server-side client `@ychetra/khpayment-node`.
KHPayment is an independent merchant-link integration service, not an official
ABA SDK. A signed event confirms our recorded observation, not bank settlement.

```sh
npm install @ychetra/khpayment-node@0.1.0-beta.1
```

```js
import {createClient, waitForPayment} from '@ychetra/khpayment-node';
const payments = createClient({
  baseUrl: process.env.KHPAYMENT_BASE_URL,
  apiKey: process.env.KHPAYMENT_API_KEY,
  expectedEnvironment: 'test',
});
// Save this key with the order BEFORE calling. Reuse it and identical fields
// if the connection fails; never silently generate a replacement key.
const payment = await payments.createPayment({amount: '12.09', currency: 'USD'}, {
  idempotencyKey: savedOrder.idempotencyKey,
});
if (payment.state === 'creating') {
  // Save payment.id; use bounded reads, then retry the SAME order/key if needed.
} else if (payment.checkoutUrl) {
  // Deliver this hosted URL only to the order owner. Do not fulfill here.
}
```

Amounts are decimal strings: USD supports at most two decimals; KHR whole numbers.
Known API fields are validated; additive response fields are ignored. ESM only,
server-side Node only. No browser/Edge/CommonJS compatibility is promised.
Compatibility verification and exact tested patch/compiler versions accompany the
release report. API keys must never enter browser bundles, URLs, chat or logs.
The origin is explicitly configured; HTTP is allowed only on loopback.

`createPayment` requires an 8–128 character idempotency key. A `202` returns
`{state:'creating', id}`. Network/timeout/cancellation after POST is uncertain:
retain the order and key, inspect its saved payment ID if available, and retry
only identical fields with that key. The SDK never retries creation automatically.
`KhPaymentError` provides code, HTTP status, request ID, Retry-After seconds and
an optional payment ID. Redirects and checkout URLs from a different origin fail.

`getPayment`, `getPaymentStatus` and `getUsage` accept `{signal}`. Reads have a
10-second default timeout (configurable 10–30000ms) and 1MiB response bound.
`waitForPayment(client, id, {timeoutMs, signal, onStatus})` uses sequential reads
at least three seconds apart, honors rate limits and stops on terminal states.
Use it in a long-running server process, not a serverless Route Handler.
`unknown` requires reconciliation; it is never success. `paid` in test mode is
simulated and must never fulfill a live order. Match order/payment ID, amount,
currency, environment and verification before any idempotent fulfillment.

## Webhook receiver

```js
import {verifyWebhook} from '@ychetra/khpayment-node';
const event = verifyWebhook({
  body: rawBody, // Buffer/Uint8Array or exact UTF-8 string before JSON parsing
  signature: request.headers['khpayment-signature'],
  keys: new Map([['current', Buffer.from(process.env.WEBHOOK_KEY, 'base64url')]]),
  expectedEnvironment: 'test',
});
// In ONE database transaction: insert event.id uniquely; lock the mapped order;
// ignore older/equal sequence; validate amount/currency/environment/verification;
// fulfill once. Commit before returning 2xx. Return 5xx if persistence fails.
```

Delivery is at-least-once. Signature format is `t=UNIX_SECONDS,kid=KEY_ID,v1=HEX`;
HMAC-SHA256 signs `timestamp + '.' + raw body`. Freshness tolerance defaults to
300 seconds and cannot be raised above that. Keep prior 32-byte keys during
rotation. Timestamp checks are not durable duplicate protection; persist event IDs.
No merchant key, provider session or checkout capability is included in events.

The prepared distribution uses the included KHPayment Tools Free-Use License:
free personal and commercial use, with no modification of the tools. Examples,
snippets and your own integration code may be edited. This is not open source.
No private repository URL or personal profile name is embedded in this package.
Service account access and live-payment readiness are separate from installation.

When `expectedEnvironment` is set, creation first reads `/api/v1/usage` to verify the authenticated key before POST. Use a key with both `payments:read` and `payments:write` scopes. This adds one rate-limited read per explicit creation attempt.
