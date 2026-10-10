---
name: integrate-payment
description: Implement a KH Payment checkout in an existing application, including server-side creation, popup or full-page checkout, bounded polling and verified order handling.
---

When the user asks to implement QR payment, inspect their stack and use its normal
server/router and session model. Implement and verify the integration in their
repository, rather than only describing it. Use the references in this directory.

1. Check the configured API origin and call `get_usage` once to establish the
   authenticated environment. Do not request or echo API keys in chat. Use a test
   key from server-side environment or an owner-only local config. Never put a key
   in a browser bundle, URL, committed file or screenshot.
2. Add a server endpoint that authenticates the application's customer and loads
   the order amount/currency from its database. Use an idempotency key derived
   from the immutable order identifier. Store the returned payment ID bound to
   that order/customer. Reuse that key on retries; never blindly recreate after
   a timeout. Handle creating/unknown explicitly.
3. Open the returned checkout URL using a popup, with a full-page fallback. Keep
   popup messages as navigation hints only. The client sends its order ID to the
   application's own status route; the server resolves the payment ID from the
   authorized order, preventing access to another customer's payment.
4. Implement sequential status polling every 3 seconds (20 reads/minute per
   active payment). Never use overlapping setInterval requests. Stop on a terminal
   result, expiry, cancellation or page departure; pause in the background. Honor
   HTTP 429 Retry-After with jitter. Budget all active payments against 60 reads/min
   per key and 120 per merchant. Creation caps are 5/min per key and 10 per merchant.
5. Fulfill only after server-side status validation. Test verification is
   `simulated`; it cannot fulfill a live order. Scans, Pay clicks, redirects and
   popup messages cannot establish paid. The unofficial public-link adapter has
   a different evidence boundary from official bank APIs.
6. If using webhooks, configure an authorized endpoint through the dashboard and
   obtain its signing key privately. Verify the exact raw bytes and the
   `KHPayment-Signature` header with the SDK's `verifyWebhook`. Require the
   expected environment. In one database transaction, deduplicate event IDs,
   lock the mapped order, reject older/equal sequences, validate amount/currency
   and verification, and fulfill once. Commit before returning 2xx; return 5xx
   on persistence failure. Signatures are not durable replay protection. Keep
   bounded polling as a fallback; never fabricate a successful delivery or
   treat a signed recorded observation as official bank settlement evidence.
7. Add meaningful tests: duplicate creation reuses the order's idempotency key,
   cross-customer status is denied, 429 causes backoff, terminal/expired payments
   stop polling, and simulated status cannot fulfill a live order. Run relevant
   builds/tests and report concrete file changes.

MCP `create_payment` requires fresh human confirmation of its exact fields. Do
not fake approval, call private HTTP to evade it, or enable live creation. The
plugin can generate integration code without creating a payment from the agent.
Installing this bundle does not open public registration, live payments or billing.
