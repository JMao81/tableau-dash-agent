/**
 * MCP Client - WebSocket connection to MCP server
 * Handles communication between extension and MCP server
 * 
 * SECURITY: Uses a configurable auth token from settings.
 * CONNECTION: Uses a singleton pattern with reconnection logic.
 */

import { appState } from './state';

type MessageHandler = (data: any) => Promise<void>;

// Connection state management
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 1000;

// Store the onRequest handler globally so sendChatToMCP can dispatch tool requests
let globalOnRequest: MessageHandler | null = null;

/**
 * Connect to MCP server via WebSocket (singleton with reconnection)
 */
export function connectMCP(onRequest: MessageHandler): void {
  // Store the handler globally for use by sendChatToMCP
  globalOnRequest = onRequest;
  
  // Already connected
  if (appState.mcpSocket && appState.mcpSocket.readyState === WebSocket.OPEN) return;
  
  // Already connecting - don't create duplicate connections
  if (isConnecting) return;
  
  // Clean up any existing socket in bad state
  if (appState.mcpSocket) {
    try {
      appState.mcpSocket.close();
    } catch (e) {
      // Ignore close errors
    }
    appState.mcpSocket = null;
  }

  isConnecting = true;

  try {
    appState.mcpSocket = new WebSocket(appState.settings.mcpUrl);

    appState.mcpSocket.onopen = () => {
      console.log('MCP WebSocket bridge connected');
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Register with the bridge (include auth token from settings)
      appState.mcpSocket!.send(JSON.stringify({
        type: 'register',
        authToken: appState.settings.wsAuthToken,
        dashboardName: appState.dashboardContext?.dashboardName || 'Unknown'
      }));
    };

    appState.mcpSocket.onclose = (event) => {
      console.log('MCP WebSocket bridge disconnected', event.code);
      isConnecting = false;
      
      // Auto-reconnect unless auth failed
      if (event.code !== 4001 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnecting in ${RECONNECT_DELAY_MS}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => connectMCP(onRequest), RECONNECT_DELAY_MS);
      }
    };

    appState.mcpSocket.onerror = () => {
      console.log('MCP WebSocket bridge error');
      isConnecting = false;
    };

    appState.mcpSocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('MCP message received:', data);
        
        // Handle auth error
        if (data.type === 'auth-error') {
          console.error('MCP authentication failed:', data.error);
          return;
        }
        
        // Handle bridge protocol messages
        if (data.type === 'connected') {
          console.log('Bridge connection confirmed:', data.clientId);
        } else if (data.type === 'chat-response') {
          // Chat responses are handled by the sendChatToMCP listener, NOT by onRequest
          // This check prevents chat-response from being routed as a tool call
          console.log('[MCP] Ignoring chat-response in onmessage - handled by sendChatToMCP listener');
          // The sendChatToMCP function has its own message listener that handles this
        } else if (data.type === 'render' || data.type === 'toggle-tooltips') {
          // Handle fire-and-forget messages (no requestId needed)
          // These come from sendToExtensionNoWait in the MCP server
          console.log('Fire-and-forget message:', data.type);
          await onRequest(data);
        } else if (data.requestId) {
          // This is a request from the MCP server via the bridge (tool calls like build-dashboard)
          await onRequest(data);
        } else if (data.id && appState.mcpCallbacks[data.id]) {
          // This is a response to our request
          appState.mcpCallbacks[data.id](data);
          delete appState.mcpCallbacks[data.id];
        }
      } catch (e) {
        console.error('Failed to parse MCP message:', e);
      }
    };
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    isConnecting = false;
  }
}

/**
 * Ensure WebSocket connection is established (reuses existing or waits for connection)
 */
async function ensureConnection(): Promise<void> {
  // Already connected
  if (appState.mcpSocket && appState.mcpSocket.readyState === WebSocket.OPEN) {
    return;
  }
  
  // Start connection via singleton pattern
  connectMCP(async () => {});
  
  // Wait for connection (max 5 seconds)
  const maxWait = 5000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    if (appState.mcpSocket && appState.mcpSocket.readyState === WebSocket.OPEN) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Could not connect to MCP server. Make sure it is running.');
}

/**
 * Send a request to MCP server
 */
export async function sendMcpRequest(toolName: string, params: any): Promise<any> {
  console.log('🔧 sendMcpRequest called:', toolName, params);
  
  // Ensure connection before sending
  await ensureConnection();
  
  return new Promise((resolve, reject) => {
    const requestId = 'req_' + Date.now();
    console.log('📤 Sending MCP request:', requestId, toolName);
    
    // Set up response handler
    const messageHandler = (event: MessageEvent) => {
      console.log('📥 Received MCP message:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.requestId === requestId) {
          appState.mcpSocket!.removeEventListener('message', messageHandler);
          console.log('✅ Got matching response for', requestId);
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.result);
          }
        }
      } catch (e) {
        console.error('Error parsing MCP response:', e);
      }
    };
    
    appState.mcpSocket!.addEventListener('message', messageHandler);
    
    // Send the request
    appState.mcpSocket!.send(JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    }));
    
    // Timeout after 30 seconds
    setTimeout(() => {
      appState.mcpSocket!.removeEventListener('message', messageHandler);
      reject(new Error('MCP request timed out after 30 seconds'));
    }, 30000);
  });
}

/**
 * Chat response with metadata for display
 */
export interface ChatResponseWithMeta {
  content: string;
  modelUsed?: string;       // e.g., "openai:gpt-5.2"
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolsCalled?: string[];
}

/**
 * Send chat message to MCP server for centralized LLM handling
 * @param message - The user's message
 * @param systemPrompt - System prompt for the LLM
 * @param hasImage - Whether the request includes an image (for tool routing optimization)
 * @returns ChatResponseWithMeta containing the response and metadata
 */
export async function sendChatToMCP(
  message: string, 
  systemPrompt: string,
  hasImage: boolean = false
): Promise<ChatResponseWithMeta> {
  const modelConfig = appState.settings.getModelConfig('analysis');
  
  if (!modelConfig.apiKey) {
    const providerName = modelConfig.provider === 'openai' ? 'OpenAI' : 'Anthropic';
    throw new Error(`Please configure your ${providerName} API key in Settings (needed for chat/analysis)`);
  }
  
  // Ensure connection before sending
  await ensureConnection();
  
  return new Promise((resolve, reject) => {
    const requestId = 'chat_' + Date.now();
    console.log('[MCP] Sending chat with requestId:', requestId, 'hasImage:', hasImage);
    
    // Set up response handler
    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[MCP] Message received while waiting for chat:', data.type, data.requestId);
        if (data.type === 'chat-response' && data.requestId === requestId) {
          console.log('[MCP] Chat response matched!', data.error ? 'ERROR: ' + data.error : 'SUCCESS');
          appState.mcpSocket!.removeEventListener('message', messageHandler);
          if (data.error) {
            reject(new Error(data.error));
          } else {
            // Return full response with metadata
            resolve({
              content: data.response,
              modelUsed: data.modelUsed,
              tokensUsed: data.tokensUsed,
              toolsCalled: data.toolsCalled,
            });
          }
        } else if (data.requestId && data.type !== 'chat-response' && globalOnRequest) {
          // This is a tool request (like get-image) that came in during the chat
          // Dispatch it to the main handler so UI actions like tab switch happen
          console.log('[MCP] Dispatching tool request during chat:', data.type);
          globalOnRequest(data);
        }
      } catch (e) {
        console.error('Error parsing chat response:', e);
      }
    };
    
    appState.mcpSocket!.addEventListener('message', messageHandler);
    
    // Get vision model config for tools that need direct vision API calls
    const visionModelConfig = appState.settings.getModelConfig('vision');
    
    // Get generation model config for fallback HTML generation
    const generationModelConfig = appState.settings.getModelConfig('generation');
    
    // Send chat request to MCP server with hasImage flag for tool routing
    const chatPayload = {
      type: 'chat',
      requestId,
      chatMessage: message,
      conversationHistory: appState.conversationHistory.slice(-10), // Reduced for token savings
      modelConfig: {
        provider: modelConfig.provider,
        model: modelConfig.model,
        apiKey: modelConfig.apiKey,
      },
      visionModelConfig: {
        provider: visionModelConfig.provider,
        model: visionModelConfig.model,
        apiKey: visionModelConfig.apiKey,
      },
      generationModelConfig: {
        provider: generationModelConfig.provider,
        model: generationModelConfig.model,
        apiKey: generationModelConfig.apiKey,
      },
      systemPrompt,
      dashboardContext: appState.dashboardContext,
      hasImage,  // Used by MCP server for tool routing optimization
    };
    console.log('[MCP] Sending payload:', { ...chatPayload, modelConfig: { ...chatPayload.modelConfig, apiKey: '***' } });
    appState.mcpSocket!.send(JSON.stringify(chatPayload));
    
    // Timeout: 120 seconds for image requests (vision API is slow), 60 seconds for normal
    const timeoutMs = hasImage ? 120000 : 60000;
    setTimeout(() => {
      appState.mcpSocket!.removeEventListener('message', messageHandler);
      reject(new Error(`Chat request timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });
}

/**
 * Send response back to MCP server
 */
export function sendMcpResponse(requestId: string, data: any, error?: string): void {
  if (!appState.mcpSocket || appState.mcpSocket.readyState !== WebSocket.OPEN) {
    console.error('Cannot send response - MCP not connected');
    return;
  }
  
  const response: any = { requestId, type: 'response' };
  if (error) {
    response.error = error;
  } else {
    response.data = data;
  }
  
  appState.mcpSocket.send(JSON.stringify(response));
}
