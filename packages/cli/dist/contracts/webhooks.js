import { z } from 'zod';
import { paymentViewSchema } from './payments.js';
export const paymentEventSchema = z.object({
    id: z.uuid(), type: z.literal('payment.updated'), schemaVersion: z.literal(1),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), createdAt: z.iso.datetime(),
    environment: z.enum(['test', 'live']), payment: paymentViewSchema.strip(),
}).strip();