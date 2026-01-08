/**
 * Integration test for WidgeTDC MCP Client
 * 
 * Prerequisites:
 * - WidgeTDC backend must be running on localhost:3001
 * - Neo4j credentials must be configured
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
    createWidgeTDCClient,
    WidgeTDCMCPClient,
    getGlobalWidgeTDCClient,
    disconnectGlobalClient
} from './index';

describe('WidgeTDC MCP Client', () => {
    let client: WidgeTDCMCPClient;

    beforeAll(async () => {
        // Create client with debug enabled
        client = await createWidgeTDCClient({ debug: true });
    });

    afterAll(async () => {
        await client.disconnect();
    });

    it('should connect to MCP server', () => {
        expect(client).toBeDefined();
        expect(client.isConnected()).toBe(true);
    });

    it('should list available tools', async () => {
        const tools = await client.listTools();

        expect(tools).toBeInstanceOf(Array);
        expect(tools.length).toBeGreaterThan(0);

        // Verify some expected tools exist
        const toolNames = tools.map(t => t.name);
        expect(toolNames).toContain('system_health');
    });

    it('should check system health', async () => {
        const health = await client.checkHealth();
        expect(health).toBeDefined();
    });

    it('should call a tool via callTool', async () => {
        const result = await client.callTool('system_health', {});

        expect(result).toBeDefined();
        expect(result.content).toBeInstanceOf(Array);
    });
});

describe('WidgeTDC MCP Client - Convenience Methods', () => {
    let client: WidgeTDCMCPClient;

    beforeAll(async () => {
        client = await createWidgeTDCClient({ debug: false });
    });

    afterAll(async () => {
        await client.disconnect();
    });

    it('should query Neo4j', async () => {
        const result = await client.queryNeo4j('RETURN 1 as num');
        expect(result).toBeDefined();
    });

    it('should create a note', async () => {
        const result = await client.createNote(
            'Test Note',
            'This is a test note from MCP client',
            ['test', 'mcp']
        );
        expect(result).toBeDefined();
    });

    it('should store and retrieve memory', async () => {
        const testKey = 'test_memory_' + Date.now();
        const testValue = { message: 'Hello from MCP client', timestamp: Date.now() };

        // Store
        await client.storeMemory(testKey, testValue);

        // Retrieve
        const retrieved = await client.retrieveMemory(testKey);
        expect(retrieved).toBeDefined();
    });
});

describe('Global WidgeTDC Client', () => {
    afterAll(async () => {
        await disconnectGlobalClient();
    });

    it('should create and return global client', async () => {
        const client1 = await getGlobalWidgeTDCClient({ debug: false });
        const client2 = await getGlobalWidgeTDCClient({ debug: false });

        // Should return same instance
        expect(client1).toBe(client2);
        expect(client1.isConnected()).toBe(true);
    });

    it('should disconnect global client', async () => {
        const client = await getGlobalWidgeTDCClient();
        expect(client.isConnected()).toBe(true);

        await disconnectGlobalClient();

        // After disconnect, should create new instance
        const newClient = await getGlobalWidgeTDCClient();
        expect(newClient).not.toBe(client);
    });
});

describe('Error Handling', () => {
    it('should throw error when calling tool without connection', async () => {
        const client = new WidgeTDCMCPClient();

        await expect(async () => {
            await client.listTools();
        }).rejects.toThrow('Not connected');
    });

    it('should handle invalid tool name', async () => {
        const client = await createWidgeTDCClient();

        await expect(async () => {
            await client.callTool('invalid_tool_name_xyz', {});
        }).rejects.toThrow();

        await client.disconnect();
    });
});
