# A QR scan is not payment confirmation

Four checks before fulfilling an order with KHQR checkout.

By KHPayment · Reviewed 5 November 2026

A customer scans a payment QR, returns to your app and sees a success screen.
Your server should fulfil the order only after it has verified the matching
payment. A scan and a return URL show customer interaction. Neither proves
that money arrived for that order.

This guide comes from KHPayment, independent developer software for KHQR checkout
in Cambodia. It explains application integration boundaries; it does not establish
official bank settlement or replace your provider's verification requirements.

## 1. Load the order on the server

Choose the amount and currency from your saved order. A browser request can
identify the order, but it should not decide its price. Confirm that the current
customer is allowed to access the order before returning its checkout link.

Store the relationship between the order and its payment attempt. A successful
payment for another order, amount or currency must not authorize this order's
fulfilment.

## 2. Preserve payment identity through retries

A timeout can happen after a provider has accepted a creation request. Starting
a fresh attempt immediately can leave two attempts to reconcile. Save a stable
idempotency key before creating the payment, and retain the original payment ID
when one exists.

Retry with the same key and identical request fields according to the API's
documented contract. If creation remains uncertain, treat it as unresolved.
Do not turn an unknown outcome into a new attempt just to make the screen move
forward. The [idempotency guide](https://khpayment.com/docs/idempotency) explains
the contract and recovery paths.

## 3. Verify the result against the order

A redirect, a customer “paid” button or an unverified callback cannot authorize
fulfilment. Read payment status through your authenticated server integration.
Verify the original payment ID, expected environment, amount, currency and order
association before accepting a final paid result.

| Observation | What your app should do |
| --- | --- |
| The QR was displayed or scanned | Continue waiting for a verified result. |
| The customer returned to the app | Read server-side status; the return is not payment evidence. |
| A callback arrived | Verify it using the documented signature and event checks before using it. |
| Status is pending or unknown | Keep the order unresolved and follow the documented recovery path. |
| Status is failed or expired | Handle that outcome without fulfilling the order. |
| A final paid result matches the original payment and order | Apply your fulfilment transition once, subject to the integration's evidence requirements. |

Signed KHPayment notifications describe recorded observations, not official bank
settlement. Keep that distinction visible in your own order and support flows.
The [payment-evidence guide](https://khpayment.com/docs/evidence) explains these
boundaries in more detail.

## 4. Make fulfilment safe to repeat

Status checks and legitimate notifications can repeat. Your order transition
should prevent a second shipment, credit or service activation for the same
successful payment.

For webhook delivery, verify the raw request body and signature using the
[documented procedure](https://khpayment.com/docs/webhooks). Enforce the expected
environment and store event-ID deduplication together with the order transition
in one transaction. A valid signature or a recent timestamp does not by itself
prevent duplicate fulfilment.

Keep API keys on the server. Apply the same order checks whether confirmation
arrives through polling or a verified notification. Bound polling, respect
`Retry-After`, and stop at a deadline rather than polling indefinitely.

## Test the failure paths

In an authorized simulated environment, exercise paid, failed and expired
outcomes separately. Also test interrupted creation, repeated notifications,
mismatched amounts and currency, and a customer trying to access another order.

A test payment is a simulation. It does not establish that live processing is
enabled or approved. The [quickstart](https://khpayment.com/docs/quickstart)
describes the integration and access requirements.

KHPayment uses an unofficial public merchant-link adapter, separate from official
ABA and NBC APIs. It is not a bank or payment network. At this guide's review
date, documentation and developer tools are public; public account registration
and live payments remain closed. Installing a tool does not grant an account or
test key.
