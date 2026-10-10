import { z } from 'zod';
export const environmentSchema = z.enum(['test', 'live']);
export const currencySchema = z.enum(['KHR', 'USD']);
export const paymentStateSchema = z.enum(['creating', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'unknown']);
export const verificationSchema = z.enum(['unverified', 'public_link', 'simulated']);
export const createPaymentSchema = z.object({
    amount: z.string().min(1).max(24).regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/),
    currency: currencySchema,
    transactionId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/).optional(),
    remark: z.string().max(140).optional(),
    returnUrl: z.string().max(2048).url().optional(),
}).strict();
export const paymentViewSchema = z.object({
    id: z.uuid(), transactionId: z.string(), amount: z.string(), currency: currencySchema,
    environment: environmentSchema, state: paymentStateSchema, verification: verificationSchema,
    checkoutUrl: z.string().url().nullable(), expiresAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), paidAt: z.iso.datetime().nullable(),
}).strict();
export const usageViewSchema = z.object({ environment: environmentSchema, reads: z.number().int().nonnegative(), creates: z.number().int().nonnegative(), newPayments: z.number().int().nonnegative(), dailyLimit: z.number().int().positive(), resetAt: z.iso.datetime() }).strict();