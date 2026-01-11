/**
 * LLM Handler - Centralized LLM calling logic for DashAgent MCP Server
 * 
 * This module handles all LLM interactions, ensuring a single source of truth
 * for tool definitions and execution. The extension's chat routes through here.
 * 
 * TOKEN OPTIMIZATION:
 * Instead of sending all 37+ tools (50-100K tokens), we use the tool router
 * to send only relevant tools based on intent classification (5-15K tokens).
 */

import { handleToolCall, setCachedApiKeys } from './tools/index.js';
import { WebSocketBridge } from './websocket-bridge.js';
import { 
  getOpenAIToolsForRequest, 
  getAnthropicToolsForRequest,
  getRouterStats 
} from './tool-router.js';
import {
  checkGuardrails,
  validateToolCall,
  buildValidationContext,
  SAFETY_SYSTEM_PREFIX
} from './guardrails.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

interface ModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  modelConfig: ModelConfig;
  visionModelConfig?: ModelConfig;  // User-selected vision model for analyze-design etc.
  systemPrompt: string;
  dashboardContext?: any;
  hasImage?: boolean;  // New: indicates if request includes an image
}

/**
 * Call OpenAI with tools - uses tool router for efficiency
 */
async function callOpenAI(
  request: ChatRequest,
  bridge: WebSocketBridge
): Promise<string> {
  const { message, conversationHistory, modelConfig, systemPrompt, hasImage, dashboardContext } = request;
  
  // Guardrail check on user input
  const guardrailResult = checkGuardrails(message);
  if (!guardrailResult.allowed) {
    console.error(`[Guardrails] Blocked request: ${guardrailResult.message}`);
    return `I can't help with that request. ${guardrailResult.message}`;
  }
  if (guardrailResult.flags.length > 0) {
    console.error(`[Guardrails] Flags: ${guardrailResult.flags.join(', ')}`);
  }
  
  // Use sanitized message for all downstream processing
  const safeMessage = guardrailResult.sanitizedInput ?? message;
  
  // Build validation context for tool whitelisting
  const validationContext = buildValidationContext({
    hasImage,
    dashboardContext,
    connectionStatus: bridge.hasConnectedExtension(),
  });
  
  const messages: any[] = [
    { role: 'system', content: SAFETY_SYSTEM_PREFIX + systemPrompt },
    ...conversationHistory.slice(-10), // Reduced from 20 to 10 for token savings
  ];

  // Add current message if not already in history
  if (conversationHistory[conversationHistory.length - 1]?.content !== message) {
    messages.push({ role: 'user', content: safeMessage });
  }

  // Use tool router - only get relevant tools based on intent
  const openaiTools = getOpenAIToolsForRequest(safeMessage, !!hasImage);
  console.error(`[LLM Handler] Sending ${openaiTools.length} tools (was 37+ before routing)`);
  
  let response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${modelConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: modelConfig.model,
      messages,
      tools: openaiTools,
      tool_choice: 'auto',
      max_completion_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API request failed');
  }

  let data = await response.json();
  let assistantMessage = data.choices[0].message;

  // Handle tool calls in a loop
  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      console.error(`[LLM Handler] Executing tool: ${toolName}`);

      // Refresh validation context before each tool call (connection state may have changed)
      const currentValidationContext = buildValidationContext({
        hasImage,
        dashboardContext,
        connectionStatus: bridge.hasConnectedExtension(),
      });

      // Validate tool call against context
      const toolValidation = validateToolCall(toolName, currentValidationContext);
      if (!toolValidation.valid) {
        console.error(`[Guardrails] Tool blocked: ${toolValidation.reason}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Tool unavailable: ${toolValidation.reason}`,
        });
        continue;
      }

      let toolResult: any;
      try {
        toolResult = await handleToolCall(toolName, toolArgs, bridge);
      } catch (e) {
        console.error(`[LLM Handler] Tool error:`, e);
        toolResult = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }

      // Always let the LLM format the response for better output
      const toolResultString = typeof toolResult === 'string'
        ? toolResult
        : JSON.stringify(toolResult);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResultString,
      });
    }

    // Get next response from LLM
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages,
        tools: openaiTools,
        max_completion_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    data = await response.json();
    assistantMessage = data.choices[0].message;
  }

  return assistantMessage.content || 'Action completed.';
}

/**
 * Call Anthropic with tools - uses tool router for efficiency
 */
async function callAnthropic(
  request: ChatRequest,
  bridge: WebSocketBridge
): Promise<string> {
  const { message, conversationHistory, modelConfig, systemPrompt, hasImage, dashboardContext } = request;
  
  // Guardrail check on user input
  const guardrailResult = checkGuardrails(message);
  if (!guardrailResult.allowed) {
    console.error(`[Guardrails] Blocked request: ${guardrailResult.message}`);
    return `I can't help with that request. ${guardrailResult.message}`;
  }
  if (guardrailResult.flags.length > 0) {
    console.error(`[Guardrails] Flags: ${guardrailResult.flags.join(', ')}`);
  }
  
  // Use sanitized message for all downstream processing
  const safeMessage = guardrailResult.sanitizedInput ?? message;
  
  // Build validation context for tool whitelisting
  const validationContext = buildValidationContext({
    hasImage,
    dashboardContext,
    connectionStatus: bridge.hasConnectedExtension(),
  });
  
  const messages: any[] = conversationHistory.slice(-10).map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  // Add current message if not already in history
  if (conversationHistory[conversationHistory.length - 1]?.content !== message) {
    messages.push({ role: 'user', content: safeMessage });
  }

  // Use tool router - only get relevant tools based on intent
  const anthropicTools = getAnthropicToolsForRequest(safeMessage, !!hasImage);
  console.error(`[LLM Handler] Sending ${anthropicTools.length} tools (was 37+ before routing)`);

  let response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': modelConfig.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelConfig.model,
      max_tokens: 4096,
      system: SAFETY_SYSTEM_PREFIX + systemPrompt,
      messages,
      tools: anthropicTools,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API request failed');
  }

  let data = await response.json();

  // Handle tool use in a loop
  while (data.stop_reason === 'tool_use') {
    const toolUseBlock = data.content.find((block: any) => block.type === 'tool_use');
    if (!toolUseBlock) break;

    const toolName = toolUseBlock.name;
    const toolArgs = toolUseBlock.input;

    console.error(`[LLM Handler] Executing tool: ${toolName}`);

    // Refresh validation context before each tool call (connection state may have changed)
    const currentValidationContext = buildValidationContext({
      hasImage,
      dashboardContext,
      connectionStatus: bridge.hasConnectedExtension(),
    });

    // Validate tool call against context
    const toolValidation = validateToolCall(toolName, currentValidationContext);
    if (!toolValidation.valid) {
      console.error(`[Guardrails] Tool blocked: ${toolValidation.reason}`);
      messages.push({
        role: 'assistant',
        content: data.content,
      });
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: `Tool unavailable: ${toolValidation.reason}`,
        }],
      });
      
      // Get next response with the blocked tool result
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': modelConfig.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelConfig.model,
          max_tokens: 4096,
          system: SAFETY_SYSTEM_PREFIX + systemPrompt,
          messages,
          tools: anthropicTools,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API request failed');
      }
      data = await response.json();
      continue;
    }

    let toolResult: any;
    try {
      toolResult = await handleToolCall(toolName, toolArgs, bridge);
    } catch (e) {
      console.error(`[LLM Handler] Tool error:`, e);
      toolResult = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }

    // Always let the LLM format the response for better output
    const toolResultString = typeof toolResult === 'string'
      ? toolResult
      : JSON.stringify(toolResult);

    // Add assistant message and tool result
    messages.push({
      role: 'assistant',
      content: data.content,
    });
    messages.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseBlock.id,
        content: toolResultString,
      }],
    });

    // Get next response
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': modelConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelConfig.model,
        max_tokens: 4096,
        system: SAFETY_SYSTEM_PREFIX + systemPrompt,
        messages,
        tools: anthropicTools,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API request failed');
    }

    data = await response.json();
  }

  // Extract text response
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  return textBlock?.text || 'Action completed.';
}

/**
 * Main chat handler - routes to appropriate LLM provider
 */
export async function handleChat(
  request: ChatRequest,
  bridge: WebSocketBridge
): Promise<string> {
  const { modelConfig, message, hasImage } = request;

  if (!modelConfig.apiKey) {
    const providerName = modelConfig.provider === 'openai' ? 'OpenAI' : 'Anthropic';
    throw new Error(`Please configure your ${providerName} API key in Settings`);
  }

  // Cache API keys and vision model for tools that need to make direct API calls (e.g., vision analysis)
  setCachedApiKeys(
    modelConfig.provider === 'openai' ? modelConfig.apiKey : undefined,
    modelConfig.provider === 'anthropic' ? modelConfig.apiKey : undefined,
    request.visionModelConfig  // Pass user-selected vision model config
  );

  // Log routing stats
  const stats = getRouterStats();
  console.error(`[LLM Handler] Using ${modelConfig.provider} - ${modelConfig.model}`);
  console.error(`[LLM Handler] Tool router: ${stats.totalTools} total, ${stats.cacheSize} cached sets`);

  if (modelConfig.provider === 'openai') {
    return callOpenAI(request, bridge);
  } else {
    return callAnthropic(request, bridge);
  }
}

/**
 * Get router stats for debugging
 */
export { getRouterStats } from './tool-router.js';
