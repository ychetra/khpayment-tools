import { z } from 'zod';
export declare const paymentEventSchema: z.ZodObject<{
    id: z.ZodUUID;
    type: z.ZodLiteral<"payment.updated">;
    schemaVersion: z.ZodLiteral<1>;
    sequence: z.ZodNumber;
    createdAt: z.ZodISODateTime;
    environment: z.ZodEnum<{
        live: "live";
        test: "test";
    }>;
    payment: z.ZodObject<{
        id: z.ZodUUID;
        transactionId: z.ZodString;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            KHR: "KHR";
            USD: "USD";
        }>;
        environment: z.ZodEnum<{
            live: "live";
            test: "test";
        }>;
        state: z.ZodEnum<{
            cancelled: "cancelled";
            creating: "creating";
            expired: "expired";
            failed: "failed";
            paid: "paid";
            pending: "pending";
            unknown: "unknown";
        }>;
        verification: z.ZodEnum<{
            public_link: "public_link";
            simulated: "simulated";
            unverified: "unverified";
        }>;
        checkoutUrl: z.ZodNullable<z.ZodString>;
        expiresAt: z.ZodNullable<z.ZodISODateTime>;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        paidAt: z.ZodNullable<z.ZodISODateTime>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PaymentEvent = z.infer<typeof paymentEventSchema>;
