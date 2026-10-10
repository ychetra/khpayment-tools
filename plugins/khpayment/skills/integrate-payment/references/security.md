# Secret and evidence handling

- Keep test API keys in the server environment or ~/.config/khpayment/plugin.json
  with mode 0600 and an owner-only parent. The launcher never prints its contents.
- Read-only keys cannot create payments. Write access should be limited to the
  integration server; revoke exposed keys and issue replacements.
- HTTPS protects transport. Passwords use salted hashing; API keys use stored
  hashes. Provider tracking sessions use versioned AES-256-GCM with tenant,
  environment and payment identifiers bound as authenticated associated data.
- Merchant links use a separate versioned encryption keyring; provider sessions
  and webhook configuration have separate tenant/environment-bound encryption.
  Ordinary metadata is not all field-encrypted. Storage and off-host backups
  need their own encryption, access controls and restore tests. Never claim
  the whole database is encrypted by one application keyring.
- Human-readable status is not settlement evidence. Read the payment's verification
  and environment before fulfillment; never trust the customer to confirm a payment.
