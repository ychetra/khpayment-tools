#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { McpServer, acceptedContent, inputRequired, CLIENT_CAPABILITIES_META_KEY } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { createPaymentSchema } from '../dist/contracts/index.js';
import { createClient, KhPaymentError } from '../dist/sdk/index.js';
import { PaymentConfirmations, confirmationMessage } from '../dist/confirmation.js';
const confirmationSchema = z.object({ confirm: z.boolean().meta({ title: 'Approve this exact payment request' }) });
const createSchema = createPaymentSchema.extend({ idempotencyKey: z.string().regex(/^[A-Za-z0-9._:-]{8,128}$/) }).strict();
const idSchema = z.object({ id: z.uuid() }).strict();
const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
function result(value, isError = false) {
    return { content: [{ type: 'text', text: JSON.stringify(value) }], ...(isError ? { isError: true } : {}) };
}
function failure(error) {
    return result({ error: error instanceof KhPaymentError ? {
            code: error.code, message: error.message, status: error.status,
            requestId: error.requestId, retryAfterSeconds: error.retryAfterSeconds,
            ...(error.paymentId ? { paymentId: error.paymentId } : {}),
        } : { code: 'CLIENT_ERROR', message: 'Unable to complete this request' } }, true);
}
function denied() {
    return result({ error: { code: 'CONFIRMATION_REQUIRED', message: 'Creation requires a fresh approval of this exact request in a host with human confirmation support.' } }, true);
}
export function createMcpServer(client, policy) {
    const server = new McpServer({ name: 'khpayment', version: '0.1.0-beta.1' }, {
        instructions: 'Local payment integration tools. Test payments are simulated. Never infer paid from a scan, redirect or customer action. API keys belong only in the server process environment.',
        inputRequired: { maxRounds: 2, roundTimeoutMs: 120_000 },
        maxToolInputElements: 16,
    });
    const confirmations = new PaymentConfirmations();
    const disconnected = new AbortController();
    server.server.onclose = () => { disconnected.abort(); confirmations.clear(); };
    const read = async (work) => {
        try {
            return result(await work());
        }
        catch (error) {
            return failure(error);
        }
    };
    server.registerTool('get_usage', { description: 'Read authenticated environment and usage.', inputSchema: z.object({}).strict(), annotations: readAnnotations }, async () => read(() => client.getUsage()));
    server.registerTool('get_payment', { description: 'Read a payment owned by this API key’s merchant and environment.', inputSchema: idSchema, annotations: readAnnotations }, async ({ id }) => read(() => client.getPayment(id)));
    server.registerTool('get_payment_status', { description: 'Read provider-verified or simulated payment status. A scan is not payment evidence.', inputSchema: idSchema, annotations: readAnnotations }, async ({ id }) => read(() => client.getPaymentStatus(id)));
    server.registerTool('create_payment', {
        description: 'Create one idempotent payment after human confirmation of its exact fields and authenticated environment. Live creation is disabled by default.',
        inputSchema: createSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (input, ctx) => {
        const signal = AbortSignal.any([ctx.mcpReq.signal, disconnected.signal]);
        // SDK 2.3.0 exposes the modern envelope at runtime but types it as {}.
        const envelope = ctx.mcpReq.envelope;
        const capabilities = envelope?.[CLIENT_CAPABILITIES_META_KEY] ?? server.server.getClientCapabilities();
        try {
            if (signal.aborted)
                return denied();
            const { environment } = await client.getUsage();
            if (environment === 'live' && !policy.allowLiveCreate) {
                return result({ error: { code: 'LIVE_CREATE_DISABLED', message: 'Live creation is disabled in this MCP process.' } }, true);
            }
            if (signal.aborted)
                return denied();
            const state = ctx.mcpReq.requestState();
            if (state !== undefined || ctx.mcpReq.inputResponses !== undefined) {
                // Consume before any further asynchronous work, including on rejection.
                if (!confirmations.consume(state, input, environment))
                    return denied();
                const answer = acceptedContent(ctx.mcpReq.inputResponses, 'confirm', confirmationSchema);
                if (answer?.confirm !== true || signal.aborted)
                    return denied();
                const { idempotencyKey, ...payment } = input;
                return result(await client.createPayment(payment, { idempotencyKey, signal }));
            }
            if (!capabilities?.elicitation || (!capabilities.elicitation.form && Object.keys(capabilities.elicitation).length !== 0))
                return denied();
            return inputRequired({
                requestState: confirmations.issue(input, environment),
                inputRequests: { confirm: inputRequired.elicit({ mode: 'form', message: confirmationMessage(input, environment), requestedSchema: confirmationSchema }) },
            });
        }
        catch (error) {
            return failure(error);
        }
    });
    return server;
}
function isMain() { try {
    return Boolean(process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href);
}
catch {
    return false;
} }
if (isMain()) {
    if (process.argv.length === 3 && process.argv[2] === '--help')
        process.stdout.write('KHPayment MCP: local stdio server. Set KHPAYMENT_BASE_URL and KHPAYMENT_API_KEY privately. Live creation defaults off; payment creation requires host human confirmation.\n');
    else if (process.argv.length === 3 && process.argv[2] === '--version')
        process.stdout.write('0.1.0-beta.1\n');
    else
        try {
            const expectedEnvironment = process.env.KHPAYMENT_EXPECTED_ENVIRONMENT;
            const client = createClient({ baseUrl: process.env.KHPAYMENT_BASE_URL ?? '', apiKey: process.env.KHPAYMENT_API_KEY ?? '', ...(expectedEnvironment ? { expectedEnvironment: expectedEnvironment } : {}) });
            serveStdio(() => createMcpServer(client, { allowLiveCreate: process.env.KHPAYMENT_MCP_ALLOW_LIVE_CREATE === 'true' }), {
                onerror: () => { process.stderr.write('MCP connection error.\n'); },
            });
        }
        catch {
            process.stderr.write('Configure KHPAYMENT_BASE_URL and KHPAYMENT_API_KEY in the process environment.\n');
            process.exitCode = 1;
        }
}