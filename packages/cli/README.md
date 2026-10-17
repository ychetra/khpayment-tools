# KHPayment CLI

Command-line payment tools. Node 22.23.3 or
24.21.0 and later patches within those majors. Free use under the included
proprietary license. The CLI needs an authorized API key and configured service.

Install:

```sh
npm install --save-dev @khpayment/cli@1.0.1
npx khpayment --help
```

For a candidate, install its `.tgz` instead. Supply `KHPAYMENT_BASE_URL` and
`KHPAYMENT_API_KEY` from your server environment or secret manager. HTTPS is
required except for loopback local testing. Never put a key in arguments or chat.
`KHPAYMENT_EXPECTED_ENVIRONMENT` defaults to `test`; use `live` only after your
service and merchant have separately cleared live readiness.

```sh
npx khpayment usage --json
npx khpayment payments create --amount 1.01 --currency USD --idempotency-key order-12345 --json
npx khpayment payments status PAYMENT_UUID --json
```

Persist the order's idempotency key before creating. Reuse the same key and
identical fields after timeout, network failure or `creating`; never generate a
replacement order. The CLI performs one explicit request attempt and exits
nonzero on errors. Errors include safe code, request ID, Retry-After and payment
ID when supplied. No creation is automatically retried.

Poll status sequentially at most once every three seconds. Honor `Retry-After`;
stop on final status, expiry or your deadline. `pending`, `creating` and `unknown`
are not success. A paid test payment is simulated. Validate the order's amount,
currency, environment and verification server-side before fulfillment. Scans,
redirects and customer actions never prove payment. KHPayment is independent
integration software, not an official bank SDK or a settlement guarantee.
