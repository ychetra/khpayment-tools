import { McpServer } from '@modelcontextprotocol/server';
import { type KhPaymentClient } from './sdk/index.js';
export declare function createMcpServer(client: KhPaymentClient, policy: {
    allowLiveCreate: boolean;
}): McpServer;
