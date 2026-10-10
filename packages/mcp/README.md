# KHPayment MCP

Standalone local stdio MCP beta. Node 22.23.3
or 24.21.0 and later patches within those majors. Free use under the included
proprietary license. No private checkout or compilation is required.

Install `@ychetra/khpayment-mcp@0.1.0-beta.1` in your project. Configure
your host with an absolute path to its installed `bin/mcp.mjs`:

```json
{"mcpServers":{"khpayment":{"command":"node","args":["/absolute/project/node_modules/@ychetra/khpayment-mcp/bin/mcp.mjs"],"env":{"KHPAYMENT_EXPECTED_ENVIRONMENT":"test","KHPAYMENT_MCP_ALLOW_LIVE_CREATE":"false"}}}}
```

Provide `KHPAYMENT_BASE_URL` and `KHPAYMENT_API_KEY` through the host's private
process environment. Do not commit a key or paste one into a prompt. For GUI
hosts and easier setup, use the integration plugin, whose launcher also supports
an owner-only configuration file.

Tools: `get_usage`, `get_payment`, `get_payment_status`, `create_payment`.
Reads are tenant/environment scoped. Creation requires a fresh human approval
of the exact amount, currency, order, return URL and idempotency key. A host that
does not support form elicitation can still use the read tools and integration
skill; direct agent creation fails closed. Never bypass that protection.

Live creation defaults off. Enabling a local flag does not bypass service live
readiness. Prefer test mode; scans, redirects and customer clicks never prove
paid. The integration skill can write and test your application's checkout
without issuing a payment from the agent.

Read the SDK guide for retries, polling, raw-body webhook signatures and durable
event deduplication. Outbound notifications reflect recorded payment evidence;
they do not create bank settlement guarantees. Service access is separately gated.
