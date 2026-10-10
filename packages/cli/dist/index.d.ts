import { type KhPaymentClient } from './sdk/index.js';
export declare function runCli(argv: string[], deps: {
    client: KhPaymentClient;
    stdout: (text: string) => void;
    stderr: (text: string) => void;
}): Promise<number>;
