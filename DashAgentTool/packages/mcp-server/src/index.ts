#!/usr/bin/env node
/**
 * DashAgentTool MCP Server
 * 
 * Bridges AI clients (Claude, Cursor, etc.) to Tableau Extensions
 * via WebSocket, enabling AI-powered dashboard control and design.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { WebSocketBridge } from './websocket-bridge.js';
import { tools, handleToolCall } from './tools/index.js';

// Create WebSocket bridge for Extension connections
const wsBridge = new WebSocketBridge(3001);

// Create MCP server
const server = new Server(
  {
    name: 'dashagent-tool',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await handleToolCall(name, args || {}, wsBridge);
    
    // Special handling for vision-based tools that return images
    const visionTools = ['analyze-design', 'analyze-worksheet-structure'];
    if (visionTools.includes(name) && result?.hasImage && result?.imageBase64) {
      // Extract base64 data (remove data:image/...;base64, prefix if present)
      let base64Data = result.imageBase64;
      let mimeType = 'image/png';
      
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      
      // Build appropriate context message based on tool
      let contextMessage = result.prompt || 'Please analyze this image.';
      if (name === 'analyze-worksheet-structure' && result.worksheetName) {
        contextMessage = `Analyzing worksheet: "${result.worksheetName}"\n\n${contextMessage}`;
      }
      
      return {
        content: [
          {
            type: 'image',
            data: base64Data,
            mimeType: mimeType,
          },
          {
            type: 'text',
            text: contextMessage,
          },
        ],
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  console.error('🚀 DashAgentTool MCP Server starting...');
  console.error('📡 WebSocket bridge listening on ws://localhost:3001');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ MCP Server connected via stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
