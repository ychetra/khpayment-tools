import { z } from 'zod';
export declare const environmentSchema: z.ZodEnum<{
    live: "live";
    test: "test";
}>;
export declare const currencySchema: z.ZodEnum<{
    KHR: "KHR";
    USD: "USD";
}>;
export declare const paymentStateSchema: z.ZodEnum<{
    cancelled: "cancelled";
    creating: "creating";
    expired: "expired";
    failed: "failed";
    paid: "paid";
    pending: "pending";
    unknown: "unknown";
}>;
export declare const verificationSchema: z.ZodEnum<{
    public_link: "public_link";
    simulated: "simulated";
    unverified: "unverified";
}>;
export declare const createPaymentSchema: z.ZodObject<{
    amount: z.ZodString;
    currency: z.ZodEnum<{
        KHR: "KHR";
        USD: "USD";
    }>;
    transactionId: z.ZodOptional<z.ZodString>;
    remark: z.ZodOptional<z.ZodString>;
    returnUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const paymentViewSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const usageViewSchema: z.ZodObject<{
    environment: z.ZodEnum<{
        live: "live";
        test: "test";
    }>;
    reads: z.ZodNumber;
    creates: z.ZodNumber;
    newPayments: z.ZodNumber;
    dailyLimit: z.ZodNumber;
    resetAt: z.ZodISODateTime;
}, z.core.$strict>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentView = z.infer<typeof paymentViewSchema>;
export type PaymentState = z.infer<typeof paymentStateSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type UsageView = z.infer<typeof usageViewSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type Currency = z.infer<typeof currencySchema>;
