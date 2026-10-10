import { z } from 'zod';
export declare const apiErrorSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        requestId: z.ZodString;
        fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
        paymentId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
