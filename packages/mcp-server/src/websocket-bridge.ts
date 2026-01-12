/**
 * WebSocketBridge - Manages connections to Tableau Extensions (Dashboard and Viz)
 * 
 * SECURITY: Uses a shared secret for authentication. The extension must send
 * the correct token in the 'register' message to be allowed to use tools.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { handleToolCall } from './tools/index.js';
import { handleChat } from './llm-handler.js';
import { getAvailableTools } from './tool-router.js';

// Shared secret for WebSocket authentication (set via env or use default for dev)
const WS_AUTH_TOKEN = process.env.DASHAGENT_WS_TOKEN || 'dashagent-dev-token-2024';

type ExtensionType = 'dashboard' | 'viz' | 'unknown';

interface ExtensionClient {
  id: string;
  ws: WebSocket;
  extensionType: ExtensionType;
  dashboardName?: string;
  worksheetName?: string;
  connectedAt: Date;
  authenticated: boolean;  // Track auth status
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}

export class WebSocketBridge {
  private wss: WebSocketServer;
  private clients: Map<string, ExtensionClient> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter = 0;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setupServer();
  }

  private setupServer() {
    this.wss.on('connection', (ws) => {
      const clientId = this.generateClientId();
      
      console.error(`📱 Extension connected: ${clientId}`);

      const client: ExtensionClient = {
        id: clientId,
        ws,
        extensionType: 'unknown',
        connectedAt: new Date(),
        authenticated: false,  // Must authenticate via register
      };

      this.clients.set(clientId, client);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        console.error(`📱 Extension disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        message: 'Connected to DashAgentTool MCP Server',
      }));
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private generateClientId(): string {
    return `ext_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'register':
        // Validate auth token
        if (message.authToken !== WS_AUTH_TOKEN) {
          console.error(`🚫 Auth failed for ${clientId} - invalid token`);
          client.ws.send(JSON.stringify({
            type: 'auth-error',
            error: 'Invalid authentication token',
          }));
          client.ws.close(4001, 'Unauthorized');
          this.clients.delete(clientId);
          return;
        }
        
        // Handle registration from both extension types
        client.authenticated = true;
        client.extensionType = message.extensionType || 'dashboard';
        client.dashboardName = message.dashboardName;
        client.worksheetName = message.worksheetName;
        
        const extLabel = client.extensionType === 'viz' ? '📈 Viz Extension' : '📊 Dashboard Extension';
        const name = client.worksheetName || client.dashboardName || 'unnamed';
        console.error(`${extLabel} registered: ${name} ✓ authenticated`);
        break;

      case 'response':
        // Handle response to a pending request
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.requestId);
          
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.data);
          }
        }
        break;

      case 'data-response':
      case 'encoding-response':
        // Forward data from extension
        const dataRequest = this.pendingRequests.get(message.requestId || message.id);
        if (dataRequest) {
          clearTimeout(dataRequest.timeout);
          this.pendingRequests.delete(message.requestId || message.id);
          dataRequest.resolve(message);
        }
        break;

      case 'chat':
        // Handle chat message from extension - route through centralized LLM handler
        if (!client.authenticated) {
          client.ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
          return;
        }
        this.handleChatFromExtension(clientId, message);
        break;

      case 'get-tools':
        // Return available tools to extension
        if (!client.authenticated) {
          client.ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
          return;
        }
        this.sendToolsToExtension(clientId);
        break;

      default:
        // Check if this is a JSON-RPC request (tools/call from extension)
        if (message.jsonrpc === '2.0' && message.method === 'tools/call') {
          if (!client.authenticated) {
            client.ws.send(JSON.stringify({ 
              jsonrpc: '2.0', 
              id: message.id, 
              error: { code: -32600, message: 'Not authenticated' } 
            }));
            return;
          }
          this.handleToolCallFromExtension(clientId, message);
        } else {
          console.error(`Unknown message type: ${message.type}`);
        }
    }
  }

  /**
   * Handle tool call requests coming from the extension
   * This allows the extension to call MCP server tools directly
   */
  private async handleToolCallFromExtension(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { id, params } = message;
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    
    console.error(`🔧 Extension calling tool: ${toolName}`);
    
    // Call the tool handler (imported at top level to share module state)
    try {
      const result = await handleToolCall(toolName, toolArgs, this);
      
      // Send response back to extension
      client.ws.send(JSON.stringify({
        requestId: id,
        result: result,
        success: true
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Tool call failed: ${errorMessage}`);
      
      client.ws.send(JSON.stringify({
        requestId: id,
        error: errorMessage,
        success: false
      }));
    }
  }

  /**
   * Handle chat message from extension - route through centralized LLM handler
   * This is the main entry point for the extension's chat UI
   */
  private async handleChatFromExtension(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { requestId, chatMessage, conversationHistory, modelConfig, visionModelConfig, generationModelConfig, systemPrompt, dashboardContext, hasImage } = message;

    console.error(`💬 Chat request from extension: "${chatMessage?.substring(0, 50)}..." hasImage=${!!hasImage}`);

    try {
      const chatResponse = await handleChat(
        {
          message: chatMessage,
          conversationHistory: conversationHistory || [],
          modelConfig,
          visionModelConfig,  // Pass user-selected vision model for analyze-design etc.
          generationModelConfig,  // Pass user-selected generation model for fallback HTML etc.
          systemPrompt: systemPrompt || '',
          dashboardContext,
          hasImage: !!hasImage,  // Pass to tool router for intent classification
        },
        this
      );

      // Send response with metadata for display
      client.ws.send(JSON.stringify({
        type: 'chat-response',
        requestId,
        response: chatResponse.content,
        modelUsed: chatResponse.modelUsed,
        tokensUsed: chatResponse.tokensUsed,
        toolsCalled: chatResponse.toolsCalled,
        success: true,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Chat failed: ${errorMessage}`);

      client.ws.send(JSON.stringify({
        type: 'chat-response',
        requestId,
        error: errorMessage,
        success: false,
      }));
    }
  }

  /**
   * Send available tools to extension (for UI display or local tool matching)
   */
  private sendToolsToExtension(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const tools = getAvailableTools();
    client.ws.send(JSON.stringify({
      type: 'tools-list',
      tools,
    }));
  }

  /**
   * Send a message to the first connected extension of specified type
   * If no type specified, tries dashboard first, then viz
   */
  sendToExtension(message: any, extensionType?: ExtensionType): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = extensionType 
        ? this.getClientByType(extensionType)
        : this.getFirstClient();
      
      if (!client) {
        const typeHint = extensionType === 'viz' 
          ? 'No Viz Extension connected. Add DashAgent Viz to a worksheet via the Marks Card.'
          : 'No Tableau Extension connected. Please add DashAgentTool extension to your dashboard.';
        reject(new Error(typeHint));
        return;
      }

      const requestId = `req_${++this.requestCounter}`;
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request to extension timed out'));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      client.ws.send(JSON.stringify({
        ...message,
        requestId,
      }));
    });
  }

  /**
   * Send a message and don't wait for response
   */
  sendToExtensionNoWait(message: any, extensionType?: ExtensionType): void {
    const client = extensionType 
      ? this.getClientByType(extensionType)
      : this.getFirstClient();
    if (client) {
      console.error(`[Bridge] sendToExtensionNoWait to ${client.id} type=${message.type}`);
      client.ws.send(JSON.stringify(message));
    } else {
      console.error(`[Bridge] sendToExtensionNoWait FAILED - no connected client! type=${message.type}`);
    }
  }

  /**
   * Broadcast to all connected extensions (optionally filtered by type)
   */
  broadcast(message: any, extensionType?: ExtensionType): void {
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!extensionType || client.extensionType === extensionType) {
          client.ws.send(JSON.stringify(message));
        }
      }
    }
  }

  /**
   * Check if any authenticated extension is connected
   */
  hasConnectedExtension(extensionType?: ExtensionType): boolean {
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.authenticated);
    if (!extensionType) return authenticatedClients.length > 0;
    return authenticatedClients.some(c => c.extensionType === extensionType);
  }

  /**
   * Get list of connected extensions
   */
  getConnectedExtensions(): Array<{ 
    id: string; 
    extensionType: ExtensionType;
    dashboardName?: string; 
    worksheetName?: string;
  }> {
    return Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      extensionType: c.extensionType,
      dashboardName: c.dashboardName,
      worksheetName: c.worksheetName,
    }));
  }

  private getFirstClient(): ExtensionClient | undefined {
    // Prefer dashboard extension, fall back to viz
    const dashboard = Array.from(this.clients.values()).find(c => c.extensionType === 'dashboard');
    if (dashboard) return dashboard;
    
    const [first] = this.clients.values();
    return first;
  }
  
  private getClientByType(type: ExtensionType): ExtensionClient | undefined {
    return Array.from(this.clients.values()).find(c => c.extensionType === type);
  }
}
