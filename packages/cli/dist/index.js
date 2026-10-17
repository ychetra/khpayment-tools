import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { createClient, KhPaymentError } from './sdk/index.js';
import { createPaymentSchema } from './contracts/index.js';
const version = '1.0.0';
const help = 'Usage: khpayment usage | payments get ID | payments status ID | payments create --amount DECIMAL --currency KHR|USD --idempotency-key UNIQUE [--return-url URL] [--remark TEXT] [--transaction-id REF] [--json]\nSet KHPAYMENT_BASE_URL and KHPAYMENT_API_KEY in your process environment. Never pass a key as an argument.\nKHPAYMENT_EXPECTED_ENVIRONMENT defaults to test. Use --version to print the tool version.\n';
export async function runCli(argv, deps) {
    if (argv.includes('--help')) {
        deps.stdout(help);
        return 0;
    }
    if (argv.length === 1 && argv[0] === '--version') {
        deps.stdout(version + '\n');
        return 0;
    }
    try {
        const json = argv.includes('--json'), args = argv.filter(a => a !== '--json');
        let result;
        if (args[0] === 'usage' && args.length === 1)
            result = await deps.client.getUsage();
        else if (args[0] === 'payments' && ['get', 'status'].includes(args[1] ?? '') && args.length === 3)
            result = await (args[1] === 'get' ? deps.client.getPayment(args[2]) : deps.client.getPaymentStatus(args[2]));
        else if (args[0] === 'payments' && args[1] === 'create') {
            const values = {}, allowed = new Set(['--amount', '--currency', '--idempotency-key', '--return-url', '--remark', '--transaction-id']);
            for (let i = 2; i < args.length; i += 2) {
                const name = args[i], value = args[i + 1];
                if (!allowed.has(name) || value === undefined || value.startsWith('--') || values[name] !== undefined)
                    throw new KhPaymentError('Invalid or duplicate command option', 'INVALID_INPUT');
                values[name] = value;
            }
            const input = createPaymentSchema.safeParse({ amount: values['--amount'], currency: values['--currency'], ...(values['--return-url'] ? { returnUrl: values['--return-url'] } : {}), ...(values['--remark'] ? { remark: values['--remark'] } : {}), ...(values['--transaction-id'] ? { transactionId: values['--transaction-id'] } : {}) });
            if (!input.success || !values['--idempotency-key'])
                throw new KhPaymentError('Amount, currency and idempotency key are required', 'INVALID_INPUT');
            result = await deps.client.createPayment(input.data, { idempotencyKey: values['--idempotency-key'] });
        }
        else
            throw new KhPaymentError('Unknown command. Use --help.', 'INVALID_INPUT');
        deps.stdout(JSON.stringify(result, null, json ? undefined : 2) + '\n');
        return 0;
    }
    catch (error) {
        const safe = error instanceof KhPaymentError ? { code: error.code, message: error.message, status: error.status, requestId: error.requestId, retryAfterSeconds: error.retryAfterSeconds, ...(error.paymentId ? { paymentId: error.paymentId } : {}) } : { code: 'CLIENT_ERROR', message: 'Unable to complete this request' };
        deps.stderr(JSON.stringify({ error: safe }) + '\n');
        return 1;
    }
}
function isMain() { try {
    return Boolean(process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href);
}
catch {
    return false;
} }
if (isMain()) {
    if (process.argv.slice(2).includes('--help'))
        process.stdout.write(help);
    else if (process.argv.length === 3 && process.argv[2] === '--version')
        process.stdout.write(version + '\n');
    else
        try {
            const client = createClient({ baseUrl: process.env.KHPAYMENT_BASE_URL ?? '', apiKey: process.env.KHPAYMENT_API_KEY ?? '', expectedEnvironment: (process.env.KHPAYMENT_EXPECTED_ENVIRONMENT ?? 'test') });
            process.exitCode = await runCli(process.argv.slice(2), { client, stdout: text => process.stdout.write(text), stderr: text => process.stderr.write(text) });
        }
        catch {
            process.stderr.write('Configure KHPAYMENT_BASE_URL and KHPAYMENT_API_KEY in the process environment.\n');
            process.exitCode = 1;
        }
}