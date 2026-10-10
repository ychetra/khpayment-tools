# KHPayment integration plugin

Codex and Claude Code integration skill, with a self-contained local MCP runtime.
Beta integration tools. Node 22.23.3 or 24.21.0 and later patches
within those majors. No private service checkout or startup download is required.

From your application's root:

```sh
npm install --save-dev @ychetra/khpayment-plugin@0.1.0-beta.1

# Claude Code
claude plugin marketplace add ./node_modules/@ychetra/khpayment-plugin
claude plugin install khpayment@khpayment

# Codex
codex plugin marketplace add ./node_modules/@ychetra/khpayment-plugin
codex plugin add khpayment@khpayment
```

For a candidate, install its reviewed tarball instead of the registry name.
Restart the host after installation. The plugin contains the same integration
skill for either host and a pinned, bundled MCP; no npm install runs on startup.

Provide a test key and HTTPS API origin in the host's private process environment
(`KHPAYMENT_API_KEY`, `KHPAYMENT_BASE_URL`), or configure an owner-only file. Read
JSON containing `{ "baseUrl": "https://your-api.example", "apiKey": "..." }`
from a private file or secret manager into:

```sh
node node_modules/@ychetra/khpayment-plugin/plugins/khpayment/scripts/configure.mjs < /private/path/khpayment-input.json
```

The configuration is created exclusively at `~/.config/khpayment/plugin.json`
with mode 0600 in a private directory. Existing files are never overwritten.
No key belongs in a prompt, argument, browser bundle, repository or screenshot.

Ask your agent:

> Integrate KHPayment into my app. Add server-side payment creation, checkout,
> bounded status polling and a signed webhook handler. Bind payments to my
> authenticated orders, reuse idempotency keys safely, and test the complete flow.

The skill guides the implementation, while MCP tools inspect authorized payment
status. Direct agent creation requires human-confirmation support in the host;
otherwise it fails closed. The plugin always disables live creation and expects
test responses. Test payments simulate outcomes; no money moves.

Free to use under the included proprietary license; the tools may not be
modified. You may configure them and edit your own integration, examples and
generated application code. Third-party bundled components retain their own
licenses in `THIRD_PARTY_NOTICES.txt`. This is not an official ABA plugin.
