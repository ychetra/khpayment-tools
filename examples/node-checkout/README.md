# KHPayment test checkout starter

This private beta template is a complete synthetic shop checkout, not a production merchant application. It uses server-side orders, a stable idempotency key, a hosted checkout, short authorized status reads and an optional signed webhook receiver. No real goods are fulfilled. It is an unofficial public merchant-link integration, not an official ABA API or bank sandbox.

## Requirements

- Node.js 22.23.3 or the separately tested Node.js 24 line; npm.
- A **separate, empty shop PostgreSQL database**. Never use KHPayment's merchant database. The setup creates only `starter_sessions`, `starter_orders` and `starter_events`.
- Access to a running KHPayment test environment, with a test API key carrying both `payments:read` and `payments:write`. Public registration may still be closed; use an authorized account. No merchant bank link is required for simulation.

## Install and start

A prepared starter archive contains its own SDK tarball and lockfile. Extract the archive into a new directory, then run:

```sh
npm ci --ignore-scripts
cp .env.example .env
```

Edit the new private environment file locally: set the API origin, test API key, shop database and the exact shop origin. Do not put the key in a browser variable, source control, URL or prompt. Keep the database URL private. Use verified database TLS for remote connections.

```sh
npm run setup
npm start
```

Open http://localhost:3001. Keep the server bound to loopback for local review. The hosted checkout opens a new tab; the shop stays available for checking the result.

When running from the private monorepo instead of an archive, first run `npm run sdk:prepare` at the repository root and use `npm install --ignore-scripts` inside this example. The source manifest points to the staged SDK. The distributable archive replaces that dependency with its bundled tarball.

## Two-minute walkthrough

1. Open the shop and choose the $12.09 notebook. The server ignores any browser-supplied amount. It saves an order and stable idempotency key **before** calling KHPayment.
2. Open the hosted checkout in the new tab. Complete the synthetic payment using your authenticated KHPayment dashboard's test payment controls. A scan, redirect or browser click cannot confirm a payment.
3. Return to the shop and choose **Check payment**. The server checks payment ID, order reference, exact decimal amount, currency, test environment and simulated verification before recording a test result. Closing and reopening the same order URL preserves the result while its session remains valid.

An uncertain or `creating` response offers an explicit **Retry checkout** for the same order. Keep that order URL; do not make a new order or change the idempotency key after a timeout. Retries use the same committed fields. No automatic POST loop or long polling request runs inside a Route Handler. Payment states include `creating`, `pending`, `unknown`, `paid`, `failed`, `expired` and `cancelled`.

## Optional signed notifications

Interactive status checks work without a webhook. To exercise background notifications, expose the shop through an owner-controlled public HTTPS endpoint and set `STARTER_ORIGIN` to that exact origin. A private/loopback webhook destination is rejected by the service.

Using a recently authenticated verified owner session and same-origin request, configure:

```http
PUT /api/merchant/webhook?environment=test
Content-Type: application/json
Origin: <KHPayment origin>

{"url":"https://your-shop.example/api/webhook"}
```

Store the returned one-time `keyId` and `secret` as `WEBHOOK_KEY_ID` and `WEBHOOK_KEY`, then restart the shop. Do not log or publish that response. The service also needs the prepared worker and webhook encryption configuration deployed; the older preview does not provide this feature yet.

The receiver verifies the **original raw body**, HMAC, key ID, timestamp and test environment. It commits a unique event ID and order update in one transaction before returning success. Repeated IDs and older per-payment sequences cannot repeat fulfillment or regress a terminal state. For rotation, extend the configured receiver key map to retain the old key for the delivery overlap before rotating; this minimal environment template accepts one current key. An event can arrive before the creation response commits the payment mapping: the receiver returns an error so the persistent sender retries.

## Troubleshooting

| Result | Action |
| --- | --- |
| `UNAUTHORIZED` / 401 | Reopen the shop for a session; check the server-side API key and its expiry. Never paste it into the browser. |
| `ENVIRONMENT_MISMATCH` | Replace the live key with a test key. The SDK checks usage before dispatching creation. |
| `ORIGIN_REJECTED` / 403 | Make `STARTER_ORIGIN` exactly match the address used in the browser, including scheme and port. |
| `RATE_LIMITED` / 429 | Wait for `Retry-After`; status reads are at least three seconds apart. Do not add parallel polling. |
| `unknown`, timeout or 503 | Preserve the order URL and retry that same order. Check service readiness and private server logs. Do not create a replacement payment. |

## Production boundary

Do not remove the test-only environment/evidence checks to launch this template. A production shop needs real account authorization, durable session ownership, its own database migrations and retention, verified TLS, monitored secret rotation and incidents, CSRF/security headers appropriate to its hosting, and idempotent fulfillment tied to sufficient live confirmation. This sample does not authorize real delivery. Never trust the return URL as proof of payment. The Next.js version deliberately performs one short server read per request rather than a ten-minute serverless polling loop.

The prepared SDK beta remains unpublished and its licensing/scope approval is pending. This archive is for review and synthetic testing; it contains no owner identity, merchant link or usable credential.
