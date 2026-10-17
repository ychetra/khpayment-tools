# KHPayment developer tools

One integration. Your server, terminal or coding agent.

| Tool | Package | Install |
| --- | --- | --- |
| Node.js / TypeScript | `@khpayment/node` | `npm install @khpayment/node@1.0.0` |
| CLI | `@khpayment/cli` | `npm install --save-dev @khpayment/cli@1.0.0` |
| MCP | `@khpayment/mcp` | `npm install --save-dev @khpayment/mcp@1.0.0` |
| Codex & Claude Code plugin | `@khpayment/plugin` | `npm install --save-dev @khpayment/plugin@1.0.0` |

Developer tools. Node 22.23.3 or 24.21.0 and
later patches in those majors. Server-side ESM; API keys stay on your server.

## Ask your agent

Install the plugin package in your application's root, then register it:

```sh
# Claude Code
claude plugin marketplace add ./node_modules/@khpayment/plugin
claude plugin install khpayment@khpayment

# Codex
codex plugin marketplace add ./node_modules/@khpayment/plugin
codex plugin add khpayment@khpayment
```

Or register this repository's marketplace directly from an authorized local
checkout. Configure a test key privately as explained in the plugin README,
restart your agent, then ask:

> Integrate KHPayment into my app. Add server-side payment creation, checkout,
> status polling and a signed webhook handler. Bind payments to authenticated
> orders, retry safely, and test the complete flow.

The plugin includes its MCP runtime. It needs neither the payment service's
source nor a startup download. Human confirmation is required when the agent
itself creates a payment. Hosts without confirmation support retain read tools
and code assistance. The plugin disables live creation.

## Build the payment flow

```js
import {createClient} from '@khpayment/node';
const payments = createClient({
  baseUrl: process.env.KHPAYMENT_BASE_URL,
  apiKey: process.env.KHPAYMENT_API_KEY,
  expectedEnvironment: 'test',
});
// Load the amount and currency from your authenticated order on the server.
// Persist this key before calling; reuse it and identical fields on retry.
const payment = await payments.createPayment({amount: '1.01', currency: 'USD'}, {
  idempotencyKey: order.savedIdempotencyKey,
});
```

Save the payment-to-order mapping. Open a returned checkout URL only for its
order owner. Handle `creating`, `pending` and `unknown` explicitly. Poll
sequentially at most once every three seconds, honor HTTP 429 `Retry-After`,
and stop on final status or deadline. Never blindly retry a payment POST.

For notifications, verify the raw body and `KHPayment-Signature` header with
`verifyWebhook`, enforce the expected environment, and persist event-ID
deduplication and order fulfillment in one transaction. Signature freshness
alone does not prevent duplicate fulfillment.

Test payments are simulated. Scans, redirects and customer clicks never prove
paid. KHPayment is independent integration software, not an official ABA SDK,
bank or payment network. Signed notifications describe recorded observations,
not official bank settlement. Public account access and live payment readiness
are separate from installing these tools.

## Upgrade from the earlier packages

The earlier personal-scope packages remain available and unchanged. Move from
`@ychetra/khpayment-node@beta` to `@khpayment/node@1.0.0`,
and change your server-side SDK imports to `@khpayment/node`. The SDK
API, stored order mappings and idempotency keys remain compatible.

Install `@khpayment/cli`, `@khpayment/mcp` and
`@khpayment/plugin` for the other tools. Remove the earlier CLI/MCP
dependencies when switching: both generations use the same executable names.
The native plugin identity `khpayment@khpayment` also stays the same, so an
existing marketplace registration must be removed before adding its new path.

After installing the new plugin package, existing Claude Code users run:

```sh
claude plugin uninstall khpayment@khpayment
claude plugin marketplace remove khpayment
claude plugin marketplace add ./node_modules/@khpayment/plugin
claude plugin install khpayment@khpayment
```

Existing Codex users run:

```sh
codex plugin remove khpayment@khpayment
codex plugin marketplace remove khpayment
codex plugin marketplace add ./node_modules/@khpayment/plugin
codex plugin add khpayment@khpayment
```

Keep your existing owner-only configuration, restart the agent and verify the
new plugin before removing its earlier package dependency. Rerun your integration
tests before removing the earlier SDK. Installing a stable package does not
enable service registration, live payments or billing.

## License

Free personal and commercial use under the included KHPayment Tools Free-Use
License. The tools may not be modified; you may configure them and edit your
own application, example code and generated integration code. This is not
open source. Bundled third-party components retain their own licenses.
