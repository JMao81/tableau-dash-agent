/**
 * DashAgent Main Application
 * This is the main entry point that initializes the entire DashAgent extension.
 * It handles DOM interactions, event binding, and coordinates all modules.
 */

import { appState } from './state';
import { connectMCP, sendChatToMCP, sendMcpResponse } from './mcp-client';
import { callLLM } from './llm-client';
import { convertMarkdownToHtml } from './utils/formatting';
import { renderVisualization } from './renderers';
import { buildSmartDashboard, buildStoryHtml } from './html-builder';
import type { VizConfig as RendererVizConfig } from './renderers/types';

// Declare global tableau variable
declare const tableau: any;
declare const html2pdf: any;

// State management - wrapped in const object to satisfy SonarQube mutable export rule
const state = {
  uploadedImage: null as string | null,
  pendingAnalysisIntent: null as string | null,
  generatedHtml: '',
  dashboardBaseHtml: '',
  currentVizConfigs: [] as RendererVizConfig[],
  vizEventListeners: [] as any[],
  lastGeneratedDoc: null as { markdown: string; data: any; timestamp: string } | null,
  lastGeneratedAnalysis: null as { markdown: string; data: any; timestamp: string } | null,
  refreshDebounceTimer: null as ReturnType<typeof setTimeout> | null
};

/**
 * Refresh all visualizations when filters/selections change (debounced)
 */
async function refreshAllVisualizations(): Promise<void> {
  if (state.refreshDebounceTimer) {
    clearTimeout(state.refreshDebounceTimer);
  }
  
  state.refreshDebounceTimer = setTimeout(async () => {
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer || state.currentVizConfigs.length === 0) return;
    
    try {
      console.log('[DashAgent] Event detected, refreshing all visualizations...');
      console.log('[DashAgent] Number of viz configs to refresh:', state.currentVizConfigs.length);
      
      const htmlParts: string[] = [];
      for (const config of state.currentVizConfigs) {
        try {
          // Skip configs without valid worksheet object
          if (!config.worksheetObj) {
            console.log('[DashAgent] Skipping config without worksheetObj');
            continue;
          }
          const vizHtml = await renderVisualization(config);
          htmlParts.push(vizHtml);
        } catch (e: any) {
          htmlParts.push(`<div style="padding: 20px; color: red;">Refresh error: ${e.message}</div>`);
        }
      }
      
      previewContainer.innerHTML = `<div class="dashboard-container" style="display: flex; flex-direction: column; gap: 16px;">${htmlParts.join('')}</div>`;
      state.generatedHtml = previewContainer.innerHTML;
      
      // Apply dark theme if needed
      const usesDarkTheme = state.currentVizConfigs.some(cfg => cfg.theme === 'modern');
      if (usesDarkTheme) {
        previewContainer.style.backgroundColor = '#0f172a';
        previewContainer.style.borderColor = '#334155';
      } else {
        previewContainer.style.backgroundColor = '';
        previewContainer.style.borderColor = '';
      }
      
      console.log('[DashAgent] All visualizations refreshed successfully');
    } catch (e: any) {
      console.log('[DashAgent] Viz refresh error:', e.message);
    }
  }, 300); // 300ms debounce
}

/**
 * Set up auto-refresh event listeners on Tableau worksheets and parameters
 */
async function setupAutoRefreshListeners(dashboard: any): Promise<void> {
  // Only set up listeners once
  if (state.vizEventListeners.length > 0) {
    console.log('[DashAgent] Event listeners already set up');
    return;
  }
  
  console.log('[DashAgent] Setting up event listeners for auto-refresh...');
  
  // Listen to filter changes on ALL worksheets
  for (const worksheet of dashboard.worksheets) {
    try {
      const filterListener = worksheet.addEventListener(
        tableau.TableauEventType.FilterChanged,
        () => {
          console.log('[DashAgent] FilterChanged event on:', worksheet.name);
          refreshAllVisualizations();
        }
      );
      state.vizEventListeners.push(filterListener);
      console.log('[DashAgent] Added filter listener to:', worksheet.name);
    } catch (e: any) {
      console.log('[DashAgent] Could not add filter listener to', worksheet.name, e?.message);
    }
  }
  
  // Listen to mark selection changes
  for (const worksheet of dashboard.worksheets) {
    try {
      const markListener = worksheet.addEventListener(
        tableau.TableauEventType.MarkSelectionChanged,
        () => {
          console.log('[DashAgent] MarkSelectionChanged event on:', worksheet.name);
          refreshAllVisualizations();
        }
      );
      state.vizEventListeners.push(markListener);
      console.log('[DashAgent] Added mark listener to:', worksheet.name);
    } catch (e: any) {
      console.log('[DashAgent] Could not add mark listener to', worksheet.name, e?.message);
    }
  }
  
  // Listen to parameter changes
  try {
    const params = await dashboard.getParametersAsync();
    for (const param of params) {
      try {
        const paramListener = param.addEventListener(
          tableau.TableauEventType.ParameterChanged,
          () => {
            console.log('[DashAgent] ParameterChanged event on:', param.name);
            refreshAllVisualizations();
          }
        );
        state.vizEventListeners.push(paramListener);
        console.log('[DashAgent] Added param listener to:', param.name);
      } catch (e: any) {
        console.error('[DashAgent] Could not add param listener to', param.name, ':', e?.message);
      }
    }
  } catch (e: any) {
    console.log('[DashAgent] Could not get parameters for listeners:', e?.message);
  }
  
  console.log('[DashAgent] Total event listeners set up:', state.vizEventListeners.length);
}

/**
 * Initialize DashAgent application
 * Called when DOM is ready and Tableau API is loaded
 */
export async function initDashAgent(): Promise<void> {
  console.log('[DashAgent] Initializing application...');

  // Get DOM elements
  const elements = getDOMElements();
  if (!elements) {
    console.error('[DashAgent] Failed to get DOM elements');
    return;
  }

  // Setup event listeners
  setupEventListeners(elements);

  // Initialize Tableau connection
  await initializeTableau(elements);

  console.log('[DashAgent] Application initialized');
}

/**
 * Get all required DOM elements
 */
function getDOMElements() {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
  const btnSend = document.getElementById('btn-send') as HTMLButtonElement;
  const btnAttach = document.getElementById('btn-attach');
  const dropZone = document.getElementById('drop-zone');
  const dropContent = document.getElementById('drop-content');
  const previewImg = document.getElementById('preview-img') as HTMLImageElement;
  const btnClear = document.getElementById('btn-clear');
  const btnAnalyze = document.getElementById('btn-analyze') as HTMLButtonElement;
  const btnRefreshData = document.getElementById('btn-refresh-data');
  const dashboardInfo = document.getElementById('dashboard-info');
  const previewContainer = document.getElementById('preview-container');
  const btnRefreshViz = document.getElementById('btn-refresh-viz') as HTMLButtonElement;
  const btnClearViz = document.getElementById('btn-clear-viz') as HTMLButtonElement;
  const btnSave = document.getElementById('btn-save');
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnCancelSettings = document.getElementById('btn-cancel-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const btnClearChat = document.getElementById('btn-clear-chat');
  const btnCapture = document.getElementById('btn-capture');

  return {
    chatMessages,
    chatInput,
    btnSend,
    btnAttach,
    dropZone,
    dropContent,
    previewImg,
    btnClear,
    btnAnalyze,
    btnRefreshData,
    dashboardInfo,
    previewContainer,
    btnRefreshViz,
    btnClearViz,
    btnSave,
    btnSettings,
    settingsModal,
    btnCloseSettings,
    btnCancelSettings,
    btnSaveSettings,
    statusDot,
    statusText,
    btnClearChat,
    btnCapture
  };
}

type DOMElements = NonNullable<ReturnType<typeof getDOMElements>>;

/**
 * Setup all event listeners
 */
function setupEventListeners(elements: DOMElements): void {
  const {
    chatMessages,
    chatInput,
    btnSend,
    btnAttach: _btnAttach,
    dropZone: _dropZone,
    previewImg: _previewImg,
    btnClear: _btnClear,
    btnAnalyze: _btnAnalyze,
    previewContainer,
    btnRefreshViz,
    btnClearViz,
    btnSettings,
    settingsModal,
    btnCloseSettings,
    btnCancelSettings,
    btnSaveSettings,
    btnClearChat,
    btnCapture: _btnCapture
  } = elements;

  // Clear chat button
  btnClearChat?.addEventListener('click', () => {
    appState.clearConversation();
    
    // Clear chat messages UI (keep only the welcome message)
    const messages = chatMessages?.querySelectorAll('.message');
    messages?.forEach((msg, index) => {
      if (index > 0) msg.remove();
    });
    
    addMessage(chatMessages, 'system', '🗑️ **Chat cleared** — Conversation history reset. Ready for a fresh start!');
    console.log('[DashAgent] Conversation history cleared');
  });

  // Clear visualization button
  btnClearViz?.addEventListener('click', () => {
    if (previewContainer) {
      previewContainer.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No content generated yet. Use Chat to generate visualizations.</p>';
    }
    state.generatedHtml = '';
    
    if (previewContainer) {
      previewContainer.style.backgroundColor = '';
      previewContainer.style.borderColor = '';
    }
    
    state.currentVizConfigs = [];
    for (const listener of state.vizEventListeners) {
      try { listener.unregister(); } catch (e) { console.error('[DashAgent] Error unregistering listener:', e); }
    }
    state.vizEventListeners = [];
    
    localStorage.removeItem('dashagent_viz_configs');
    
    if (btnRefreshViz) btnRefreshViz.style.display = 'none';
    if (btnClearViz) btnClearViz.style.display = 'none';
    
    console.log('[DashAgent] Visualizations cleared');
  });

  // Refresh visualization button
  btnRefreshViz?.addEventListener('click', async () => {
    if (state.currentVizConfigs.length === 0) return;
    
    btnRefreshViz.textContent = 'Refreshing...';
    btnRefreshViz.disabled = true;
    
    try {
      const htmlParts: string[] = [];
      for (const config of state.currentVizConfigs) {
        try {
          // Skip configs without valid worksheet object
          if (!config.worksheetObj) {
            console.log('[DashAgent] Skipping config without worksheetObj');
            continue;
          }
          const vizHtml = await renderVisualization(config);
          htmlParts.push(vizHtml);
        } catch (e: any) {
          htmlParts.push(`<div style="padding: 20px; color: red;">Error: ${e.message}</div>`);
        }
      }
      
      if (previewContainer) {
        previewContainer.innerHTML = `<div class="dashboard-container" style="display: flex; flex-direction: column; gap: 16px;">${htmlParts.join('')}</div>`;
        state.generatedHtml = previewContainer.innerHTML;
      }
    } catch (e: any) {
      if (previewContainer) {
        previewContainer.innerHTML = `<div style="padding: 20px; color: red;">Refresh error: ${e.message}</div>`;
      }
    }
    
    btnRefreshViz.textContent = 'Refresh Data';
    btnRefreshViz.disabled = false;
  });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = (btn as HTMLElement).dataset.panel;
      document.getElementById('panel-' + panel)?.classList.add('active');
    });
  });

  // Chat input
  chatInput?.addEventListener('input', () => {
    if (btnSend) btnSend.disabled = !chatInput.value.trim();
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (btnSend && !btnSend.disabled) {
        sendMessage(elements);
      }
    }
  });

  btnSend?.addEventListener('click', () => sendMessage(elements));

  // Settings modal
  btnSettings?.addEventListener('click', () => {
    loadSettingsToForm();
    settingsModal?.classList.add('active');
  });

  btnCloseSettings?.addEventListener('click', () => {
    settingsModal?.classList.remove('active');
  });

  btnCancelSettings?.addEventListener('click', () => {
    settingsModal?.classList.remove('active');
  });

  btnSaveSettings?.addEventListener('click', () => {
    saveSettingsFromForm();
    settingsModal?.classList.remove('active');
  });

  // Save & Close button - save HTML to extension settings and close config dialog
  elements.btnSave?.addEventListener('click', async () => {
    try {
      // Get the current preview HTML
      const previewHtml = elements.previewContainer?.innerHTML || '';
      
      if (previewHtml?.trim()) {
        // Save to Tableau extension settings
        tableau.extensions.settings.set('dashagent_html', previewHtml);
        await tableau.extensions.settings.saveAsync();
        console.log('[DashAgent] Saved HTML to extension settings');
      }
      
      // Close the config dialog
      tableau.extensions.ui.closeDialog('saved');
    } catch (e) {
      console.error('[DashAgent] Error saving:', e);
      // Still try to close
      try {
        tableau.extensions.ui.closeDialog('error');
      } catch (error_) {
        console.error('[DashAgent] Error closing dialog:', error_);
      }
    }
  });

  // Close modal on outside click
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('active');
    }
  });

  // Image upload handling
  setupImageUpload(elements);
}

/**
 * Setup image upload (drag & drop, paste, click)
 */
function setupImageUpload(elements: DOMElements): void {
  const { dropZone, previewImg, btnClear, btnAnalyze, btnAttach } = elements;

  // Drag and drop
  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) {
      handleFile(file, elements);
    }
  });

  // Click to upload
  dropZone?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file, elements);
    };
    input.click();
  });

  // Attach button
  btnAttach?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file, elements);
    };
    input.click();
  });

  // Clear button
  btnClear?.addEventListener('click', () => {
    state.uploadedImage = null;
    if (previewImg) {
      previewImg.style.display = 'none';
      previewImg.src = '';
    }
    const dropContent = document.getElementById('drop-content');
    if (dropContent) dropContent.style.display = 'flex';
    if (btnClear) btnClear.style.display = 'none';
    if (btnAnalyze) btnAnalyze.disabled = true;
  });

  // Analyze button
  btnAnalyze?.addEventListener('click', () => {
    if (state.uploadedImage) {
      // Navigate to chat and send analysis request
      document.querySelector('.nav-item[data-panel="chat"]')?.dispatchEvent(new Event('click'));
      const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (chatInput) {
        // Use the pending intent if set (preserves user's original question like "check accessibility")
        // Otherwise fall back to a generic analysis request
        const intentToSend = state.pendingAnalysisIntent || 'Analyze this dashboard screenshot for design improvements';
        chatInput.value = intentToSend;
        chatInput.dispatchEvent(new Event('input'));
        document.getElementById('btn-send')?.click();
        // Clear the pending intent after use
        state.pendingAnalysisIntent = null;
      }
    }
  });

  // Paste handler
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file, elements);
        break;
      }
    }
  });

  // Screen Capture handler
  const btnCapture = document.getElementById('btn-capture') as HTMLButtonElement;
  if (btnCapture) {
    btnCapture.addEventListener('click', async () => {
      const chatMessages = document.getElementById('chat-messages');
      
      try {
        btnCapture.disabled = true;
        btnCapture.textContent = 'Capturing...';
        
        // Show a status message in chat
        addMessage(chatMessages, 'assistant', '**Screen capture in progress...**\n\nPlease select the window or screen you want to capture.');
        
        // Request screen capture permission - user selects which window/tab
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'never',
            displaySurface: 'window'
          } as MediaTrackConstraints,
          audio: false
        });
        
        // Update status
        const statusMessages = chatMessages?.querySelectorAll('.message.assistant');
        const lastStatus = statusMessages?.[statusMessages.length - 1] as HTMLElement;
        if (lastStatus?.textContent?.includes('Screen capture in progress')) {
          lastStatus.innerHTML = '<strong>Processing screenshot...</strong>';
        }
        
        // Create video element to capture a frame
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        
        // Wait a moment for the frame to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create canvas and capture the frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
        }
        
        // Stop all tracks immediately
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64 and store
        state.uploadedImage = canvas.toDataURL('image/png');
        
        const { previewImg, btnClear, btnAnalyze } = elements;
        const dropContent = document.getElementById('drop-content');
        
        if (previewImg) {
          previewImg.src = state.uploadedImage;
          previewImg.style.display = 'block';
        }
        if (dropContent) dropContent.style.display = 'none';
        if (elements.dropZone) elements.dropZone.classList.add('has-image');
        if (btnClear) btnClear.style.display = 'inline-flex';
        if (btnAnalyze) btnAnalyze.disabled = false;
        
        // Update the status message to show success
        if (lastStatus?.textContent?.includes('Processing') || lastStatus?.textContent?.includes('Screen capture')) {
          lastStatus.innerHTML = `
            <div style="margin-bottom: 8px;"><strong>✅ Screenshot captured successfully!</strong></div>
            <div style="margin-bottom: 8px;"><em>I can see your dashboard now. Would you like me to:</em></div>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li style="margin-bottom: 4px;"><strong>Analyze the design</strong> - Click "Analyze Design" button, or</li>
              <li style="margin-bottom: 4px;"><strong>Ask specific questions</strong> - Type your question in the chat</li>
            </ul>
            <div style="margin-top: 8px;"><em>💡 Tip: For a comprehensive design audit, use the Analyze Design button.</em></div>
          `;
        }
        
      } catch (err: any) {
        console.error('Screen capture failed:', err);
        if (err.name === 'AbortError') {
          // User cancelled - update the message
          const statusMessages = chatMessages?.querySelectorAll('.message.assistant');
          const lastStatus = statusMessages?.[statusMessages.length - 1] as HTMLElement;
          if (lastStatus?.textContent?.includes('Screen capture')) {
            lastStatus.innerHTML = '<em>Screen capture cancelled. Click "Capture Screen" to try again.</em>';
          }
        } else {
          addMessage(chatMessages, 'assistant', 'Screen capture failed: ' + err.message);
        }
      } finally {
        btnCapture.disabled = false;
        btnCapture.textContent = 'Capture Screen';
      }
    });
  }
}

/**
 * Handle uploaded file
 */
function handleFile(file: File, elements: DOMElements): void {
  const { previewImg, btnClear, btnAnalyze } = elements;
  const dropContent = document.getElementById('drop-content');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedImage = e.target?.result as string;
    
    if (previewImg) {
      previewImg.src = state.uploadedImage;
      previewImg.style.display = 'block';
    }
    if (dropContent) dropContent.style.display = 'none';
    if (btnClear) btnClear.style.display = 'inline-flex';
    if (btnAnalyze) btnAnalyze.disabled = false;
  };
  reader.readAsDataURL(file);
}

/**
 * Build system prompt with dashboard context
 */
function buildSystemPrompt(): string {
  let prompt = `You are DashAgent, an AI-powered Business Intelligence analyst for Tableau dashboards.
You help users analyze data, create visualizations, and provide insights.

Key capabilities:
- Analyze dashboard data and provide insights
- Create visualizations (bar charts, line charts, KPIs, etc.)
- Answer questions about the data
- Suggest improvements for dashboards

Be concise but thorough. Use markdown formatting for readability.
When showing numbers, format them appropriately (e.g., 1.2M instead of 1200000).
`;

  // Add dashboard context if available
  if (appState.dashboardContext) {
    prompt += `\n## Current Dashboard Context\n`;
    prompt += `Dashboard: ${appState.dashboardContext.dashboardName}\n`;
    prompt += `\nAvailable worksheets:\n`;
    
    for (const ws of appState.dashboardContext.worksheets || []) {
      prompt += `- ${ws.name}: ${ws.rowCount} rows\n`;
      if (ws.columns && ws.columns.length > 0) {
        const colNames = ws.columns.map((c: any) => c.fieldName).join(', ');
        prompt += `  Fields: ${colNames}\n`;
      }
    }
  }

  return prompt;
}

/**
 * Send a chat message
 */
async function sendMessage(elements: DOMElements): Promise<void> {
  const { chatMessages, chatInput, btnSend } = elements;
  
  const text = chatInput?.value.trim();
  if (!text) return;

  addMessage(chatMessages, 'user', text);
  if (chatInput) {
    chatInput.value = '';
    chatInput.style.height = 'auto';
  }
  if (btnSend) btnSend.disabled = true;

  // Add to conversation history
  appState.addToHistory({ role: 'user', content: text });

  // Check history length
  const MAX_HISTORY = 20;
  if (appState.conversationHistory.length >= MAX_HISTORY) {
    const turnsKept = Math.floor(MAX_HISTORY / 2);
    console.log(`[DashAgent] Conversation history at ${appState.conversationHistory.length} messages`);
    if (appState.conversationHistory.length === MAX_HISTORY || appState.conversationHistory.length === MAX_HISTORY + 1) {
      addMessage(chatMessages, 'system', `⚠️ **Context limit reached** — I'll remember only the last ${turnsKept} exchanges. For best results on new topics, click "Clear Chat" to start fresh.`);
    }
  }

  // Show thinking indicator
  const thinkingId = showThinking(chatMessages);
  
  // Store the user's intent for design-related requests
  // If the user asks about design/colors/accessibility but doesn't have a screenshot,
  // this intent will be used when they capture one and click "Analyze"
  const designTerms = /color|accessib|design|review|ux|ui|layout|visual|font|spacing|palette|contrast/i;
  const designPhrases = /chart.*type|look.*like|improve.*dashboard|critique|feedback/i;
  if (designTerms.test(text) || designPhrases.test(text)) {
    state.pendingAnalysisIntent = text;
    console.log('[DashAgent] Stored pending analysis intent:', text.substring(0, 50));
  }

  try {
    // Build system prompt
    const systemPrompt = buildSystemPrompt();
    
    let response: string;
    
    // Let LLM decide semantically which tool to use - NO regex trigger words!
    // Try MCP first with hasImage flag for tool routing optimization.
    // If it fails with token limit AND we have an image, retry with direct vision call.
    const hasImage = !!state.uploadedImage;
    
    try {
      console.log('[DashAgent] Attempting MCP chat...', { hasImage });
      // Pass hasImage to MCP for intelligent tool routing (reduces tokens by 80%+)
      response = await sendChatToMCP(text, systemPrompt, hasImage);
      console.log('[DashAgent] MCP response received:', response?.substring(0, 100));
    } catch (mcpError: any) {
      console.error('[DashAgent] MCP failed:', mcpError);
      
      // Check if this is a token limit error AND we have an image
      const isTokenLimitError = mcpError.message?.includes('tokens') || mcpError.message?.includes('limit');
      
      if (isTokenLimitError && hasImage) {
        // Token overflow due to image - call vision LLM directly (bypasses MCP overhead)
        console.log('[DashAgent] Token limit hit with image - using direct vision call');
        const visionPrompt = `You are DashAgent, an expert Tableau dashboard designer and data visualization consultant.

The user has provided a dashboard screenshot. Analyze it and provide SPECIFIC, ACTIONABLE feedback.

For every issue you identify:
- Describe EXACTLY what you see
- Explain WHY it's a problem
- Give a SPECIFIC fix

User request: ${text}`;
        
        response = await callLLM(visionPrompt, state.uploadedImage, 'vision');
        console.log('[DashAgent] Vision LLM response received:', response?.substring(0, 100));
      } else {
        // Other error - fall back to direct LLM without image
        console.log('[DashAgent] Falling back to direct LLM (no image)...');
        const fullPrompt = systemPrompt + '\n\nUser: ' + text;
        response = await callLLM(fullPrompt, null, 'analysis');
        console.log('[DashAgent] Direct LLM response:', response?.substring(0, 100));
      }
    }
    
    removeThinking(thinkingId, chatMessages);
    
    if (response) {
      addMessage(chatMessages, 'assistant', response);
      appState.addToHistory({ role: 'assistant', content: response });
      
      // Clear pending intent if the response doesn't ask for a screenshot
      // (i.e., the analysis was completed successfully)
      if (state.pendingAnalysisIntent && !response.includes('Capture Screen') && !response.includes('screenshot')) {
        console.log('[DashAgent] Clearing pending analysis intent - analysis completed');
        state.pendingAnalysisIntent = null;
      }
    }
  } catch (error: any) {
    removeThinking(thinkingId, chatMessages);
    console.error('[DashAgent] Chat error:', error);
    addMessage(chatMessages, 'system', `❌ Error: ${error.message || 'Failed to get response'}`);
  }
}

/**
 * Show thinking indicator
 */
function showThinking(chatMessages: Element | null): string {
  const id = 'thinking-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'message assistant thinking';
  div.innerHTML = `
    <div class="message-avatar">Dash</div>
    <div class="message-content">
      <div class="thinking-indicator">
        <span class="thinking-text">Thinking</span>
        <span class="thinking-dots"><span></span><span></span><span></span></span>
      </div>
    </div>
  `;
  chatMessages?.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return id;
}

/**
 * Remove thinking indicator
 */
function removeThinking(id: string, _chatMessages: Element | null): void {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * Add a message to chat
 */
function addMessage(chatMessages: Element | null, role: string, content: string): void {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  
  // Get avatar content based on role
  let avatarContent = '';
  if (role === 'user') {
    avatarContent = 'You';
  } else if (role === 'assistant') {
    avatarContent = 'Dash';
  } else if (role === 'system') {
    avatarContent = '⚠️';
  }
  
  // Check if this is documentation or analysis content
  // More robust detection: look for explicit triggers OR content patterns
  const hasDocTrigger = content.includes('Click the "Download PDF" button');
  const hasAnalysisTrigger = content.includes('Click the "Download Analysis PDF" button');
  
  // Pattern-based detection for documentation
  const looksLikeDocumentation = (
    (content.includes('Documentation') || content.includes('documentation')) &&
    (content.includes('Worksheet') || content.includes('worksheet') || 
     content.includes('Data Source') || content.includes('data source'))
  );
  
  // Pattern-based detection for analysis  
  const looksLikeAnalysis = (
    (content.includes('Analysis') || content.includes('analysis')) &&
    (content.includes('Finding') || content.includes('finding') ||
     content.includes('Insight') || content.includes('insight') ||
     content.includes('Recommendation') || content.includes('recommendation'))
  );
  
  const isDocumentation = hasDocTrigger || (role === 'assistant' && looksLikeDocumentation);
  const isAnalysis = hasAnalysisTrigger || (role === 'assistant' && looksLikeAnalysis && !looksLikeDocumentation);
  
  // Store content for PDF download
  if (isDocumentation) {
    state.lastGeneratedDoc = {
      markdown: content,
      data: null,
      timestamp: new Date().toISOString()
    };
  } else if (isAnalysis) {
    state.lastGeneratedAnalysis = {
      markdown: content,
      data: null,
      timestamp: new Date().toISOString()
    };
  }
  
  // Clean content - remove download instruction lines
  let cleanContent = content
    .replace(/\n---\n\*Click the "Download PDF" button below to save this documentation\.\*/, '')
    .replace(/\n---\n\*Click the "Download Analysis PDF" button below to save this report\.\*/, '');
  
  const htmlContent = convertMarkdownToHtml(cleanContent);
  
  // Create download button HTML
  const downloadButtonStyle = `
    margin-top: 12px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  `;
  
  const downloadIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>`;
  
  let downloadButton = '';
  if (isDocumentation) {
    downloadButton = `
      <button onclick="downloadDocAsPDF()" style="${downloadButtonStyle}"
        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.3)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        ${downloadIcon} Download PDF
      </button>
    `;
  } else if (isAnalysis) {
    downloadButton = `
      <button onclick="downloadAnalysisAsPDF()" style="${downloadButtonStyle}"
        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.3)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        ${downloadIcon} Download Analysis PDF
      </button>
    `;
  }
  
  div.innerHTML = `
    <div class="message-avatar">${avatarContent}</div>
    <div class="message-content" style="max-width: 100%; overflow-x: auto;">
      ${htmlContent}
      ${downloadButton}
    </div>
  `;
  
  chatMessages?.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Load settings to form
 */
function loadSettingsToForm(): void {
  const settings = appState.settings;
  
  const openaiKeyInput = document.getElementById('openai-api-key') as HTMLInputElement;
  const anthropicKeyInput = document.getElementById('anthropic-api-key') as HTMLInputElement;
  const mcpUrlInput = document.getElementById('mcp-url') as HTMLInputElement;
  const modelVisionSelect = document.getElementById('model-vision') as HTMLSelectElement;
  const modelGenerationSelect = document.getElementById('model-generation') as HTMLSelectElement;
  const modelAnalysisSelect = document.getElementById('model-analysis') as HTMLSelectElement;

  if (openaiKeyInput) openaiKeyInput.value = settings.openaiApiKey;
  if (anthropicKeyInput) anthropicKeyInput.value = settings.anthropicApiKey;
  if (mcpUrlInput) mcpUrlInput.value = settings.mcpUrl;
  if (modelVisionSelect) modelVisionSelect.value = settings.modelVision;
  if (modelGenerationSelect) modelGenerationSelect.value = settings.modelGeneration;
  if (modelAnalysisSelect) modelAnalysisSelect.value = settings.modelAnalysis;
}

/**
 * Save settings from form
 */
function saveSettingsFromForm(): void {
  const openaiKeyInput = document.getElementById('openai-api-key') as HTMLInputElement;
  const anthropicKeyInput = document.getElementById('anthropic-api-key') as HTMLInputElement;
  const mcpUrlInput = document.getElementById('mcp-url') as HTMLInputElement;
  const modelVisionSelect = document.getElementById('model-vision') as HTMLSelectElement;
  const modelGenerationSelect = document.getElementById('model-generation') as HTMLSelectElement;
  const modelAnalysisSelect = document.getElementById('model-analysis') as HTMLSelectElement;

  if (openaiKeyInput) appState.settings.openaiApiKey = openaiKeyInput.value;
  if (anthropicKeyInput) appState.settings.anthropicApiKey = anthropicKeyInput.value;
  if (mcpUrlInput) appState.settings.mcpUrl = mcpUrlInput.value;
  if (modelVisionSelect) appState.settings.modelVision = modelVisionSelect.value;
  if (modelGenerationSelect) appState.settings.modelGeneration = modelGenerationSelect.value;
  if (modelAnalysisSelect) appState.settings.modelAnalysis = modelAnalysisSelect.value;

  appState.saveSettings();
  console.log('[DashAgent] Settings saved');
}

/**
 * Initialize Tableau connection
 */
async function initializeTableau(elements: DOMElements): Promise<void> {
  const { statusDot, statusText } = elements;

  try {
    await tableau.extensions.initializeDialogAsync();
    
    if (statusDot) statusDot.classList.add('connected');
    if (statusText) statusText.textContent = 'Connected';
    
    // Fetch dashboard context
    await fetchDashboardContext();
    
    console.log('[DashAgent] Dashboard context ready:', appState.dashboardContext);
    
    // Load and rehydrate saved viz configs (dashboard is now available)
    loadVizConfigs();
    // Retry rehydration now that dashboard is ready
    rehydrateVizConfigs();
    
  } catch (error: any) {
    console.error('[DashAgent] Tableau init error:', error);
    if (statusDot) statusDot.classList.add('connected');
    if (statusText) statusText.textContent = 'Ready';
    
    loadVizConfigs();
  }

  // Connect to MCP bridge
  try {
    // Message handler for MCP server requests
    const handleMCPRequest = async (data: any): Promise<void> => {
      console.log('[DashAgent] MCP request received:', data.type, 'requestId:', data.requestId, data);
      
      try {
        let responseData: any = null;
        const dashboard = tableau.extensions.dashboardContent?.dashboard;
        const previewContainer = document.getElementById('preview-container');
        
        switch (data.type) {
          // ==================== DATA EXTRACTION ====================
          case 'get-worksheet-data':
            // Get worksheet data for a specific worksheet
            responseData = await getWorksheetData(data.worksheet);
            break;
            
          case 'extract-analysis-data': {
            // For analysis, return ALL worksheets when no specific one is requested
            // This enables proper segmentation, trend analysis, etc.
            if (data.worksheet) {
              // Specific worksheet requested
              const worksheetData = await getWorksheetData(data.worksheet);
              responseData = {
                ...worksheetData,
                analysisGoal: data.analysisGoal,
                focusMeasures: data.focusMeasures,
                focusDimensions: data.focusDimensions
              };
            } else {
              // No specific worksheet - return ALL worksheets for comprehensive analysis
              const allWorksheets: any[] = [];
              if (dashboard) {
                for (const ws of dashboard.worksheets) {
                  try {
                    const wsData = await extractWorksheetData(ws);
                    if (wsData.data && wsData.data.length > 0) {
                      allWorksheets.push(wsData);
                    }
                  } catch (e) {
                    console.log(`[DashAgent] Could not get data from ${ws.name}:`, e);
                  }
                }
              }
              responseData = {
                worksheets: allWorksheets,
                worksheetNames: allWorksheets.map(ws => ws.worksheet),
                analysisGoal: data.analysisGoal,
                focusMeasures: data.focusMeasures,
                focusDimensions: data.focusDimensions,
                tip: allWorksheets.length > 1 
                  ? `Found ${allWorksheets.length} worksheets with data. Use focusDimensions/focusMeasures to target specific fields, or specify a worksheet name.`
                  : undefined
              };
            }
            break;
          }
          
          case 'profile-data': {
            // Profile-data still works on single worksheet
            const worksheetData = await getWorksheetData(data.worksheet);
            responseData = {
              ...worksheetData,
              analysisGoal: data.analysisGoal,
              focusMeasures: data.focusMeasures,
              focusDimensions: data.focusDimensions
            };
            break;
          }
          
          case 'full-data-exploration': {
            // Full data exploration - aggregate data from all worksheets
            const allData: any[] = [];
            if (dashboard) {
              for (const ws of dashboard.worksheets) {
                try {
                  const wsData = await extractWorksheetData(ws);
                  allData.push(wsData);
                } catch (e) {
                  console.log(`[DashAgent] Could not get data from ${ws.name}:`, e);
                }
              }
            }
            responseData = {
              worksheets: allData,
              analysisDepth: data.analysisDepth,
              focusAreas: data.focusAreas
            };
            break;
          }
          
          case 'confirm-chart-fields': {
            // Confirm chart fields for a worksheet
            if (!dashboard) {
              responseData = { error: 'Dashboard not available' };
              break;
            }
            const ws = dashboard.worksheets.find((w: any) => w.name === data.worksheet);
            if (!ws) {
              responseData = { 
                error: `Worksheet "${data.worksheet}" not found`,
                available: dashboard.worksheets.map((w: any) => w.name)
              };
              break;
            }
            const summaryData = await ws.getSummaryDataAsync({ maxRows: 10 });
            const dimensions: string[] = [];
            const measures: string[] = [];
            for (const col of summaryData.columns) {
              const isMeasure = /^(SUM|AVG|COUNT|CNTD|MIN|MAX|AGG|MEDIAN)\s*\(/i.test(col.fieldName) ||
                               ['int', 'float', 'number'].includes(col.dataType);
              if (isMeasure) {
                measures.push(col.fieldName);
              } else {
                dimensions.push(col.fieldName);
              }
            }
            responseData = { dimensions, measures, worksheet: data.worksheet };
            break;
          }
          
          // ==================== FILTERS & PARAMETERS ====================
          case 'apply-filter': {
            if (!dashboard) {
              responseData = { error: 'Dashboard not available' };
              break;
            }
            const filterWs = dashboard.worksheets.find((w: any) => w.name === data.worksheet);
            if (!filterWs) {
              responseData = { error: 'Worksheet not found: ' + data.worksheet };
              break;
            }
            try {
              if (data.action === 'clear') {
                await filterWs.clearFilterAsync(data.field);
              } else if (data.action === 'exclude') {
                await filterWs.applyFilterAsync(
                  data.field,
                  data.values || [],
                  tableau.FilterUpdateType.Remove
                );
              } else {
                await filterWs.applyFilterAsync(
                  data.field,
                  data.values || [],
                  tableau.FilterUpdateType.Replace
                );
              }
              responseData = { success: true };
            } catch (e: any) {
              responseData = { error: e.message };
            }
            break;
          }
          
          case 'set-parameter': {
            if (!dashboard) {
              responseData = { error: 'Dashboard not available' };
              break;
            }
            try {
              const param = await dashboard.findParameterAsync(data.name);
              if (param) {
                await param.changeValueAsync(data.value);
                responseData = { success: true };
              } else {
                responseData = { error: 'Parameter not found: ' + data.name };
              }
            } catch (e: any) {
              responseData = { error: e.message };
            }
            break;
          }
          
          // ==================== VISUALIZATION & RENDERING ====================
          case 'render-visualization': {
            if (!dashboard) {
              responseData = { error: 'Dashboard not available' };
              break;
            }
            const ws = dashboard.worksheets.find((w: any) => w.name === data.worksheet);
            if (!ws) {
              responseData = { 
                error: `Worksheet "${data.worksheet}" not found`,
                available: dashboard.worksheets.map((w: any) => w.name)
              };
              break;
            }
            
            try {
              const vizConfig = {
                vizType: data.vizType,
                worksheetObj: ws,
                measureField: data.measureField,
                dimensionField: data.dimensionField,
                title: data.title,
                colorScheme: data.colorScheme || 'blue',
                customColors: data.customColors,
                showValues: data.showValues !== false,
                maxItems: data.maxItems || 10,
                sortOrder: data.sortOrder || 'desc',
                theme: data.theme || 'professional',
                aggregateByDate: data.aggregateByDate,
                aggregationType: data.aggregationType
              };
              
              const html = await renderVisualization(vizConfig);
              
              if (previewContainer) {
                if (data.append && state.dashboardBaseHtml) {
                  // Smart append: insert before the footer marker
                  const marker = '<!-- DASHAGENT_APPEND_MARKER -->';
                  const currentHtml = previewContainer.innerHTML;
                  if (currentHtml.includes(marker)) {
                    // Insert new chart before the marker
                    const chartWrapper = `<div style="margin-top: 20px;">${html}</div>`;
                    previewContainer.innerHTML = currentHtml.replace(marker, chartWrapper + '\n    ' + marker);
                  } else {
                    // No marker found, just append
                    previewContainer.innerHTML += html;
                  }
                } else if (data.append) {
                  // Regular append without dashboard base
                  previewContainer.innerHTML += html;
                } else {
                  // Replace entirely
                  previewContainer.innerHTML = html;
                  state.dashboardBaseHtml = ''; // Clear stored dashboard
                }
                state.generatedHtml = previewContainer.innerHTML;
              }
              
              // Store config for refresh and save to localStorage
              state.currentVizConfigs.push(vizConfig);
              try {
                const configsToSave = state.currentVizConfigs.map(c => ({
                  ...c,
                  worksheetName: c.worksheetObj?.name,
                  worksheetObj: undefined
                }));
                localStorage.setItem('dashagent_viz_configs', JSON.stringify(configsToSave));
              } catch (e) { console.error('[DashAgent] Storage error:', e); }
              
              // Show refresh/clear buttons
              const btnRefreshViz = document.getElementById('btn-refresh-viz');
              const btnClearViz = document.getElementById('btn-clear-viz');
              if (btnRefreshViz) btnRefreshViz.style.display = 'inline-block';
              if (btnClearViz) btnClearViz.style.display = 'inline-block';
              
              // Set up auto-refresh event listeners
              await setupAutoRefreshListeners(dashboard);
              
              responseData = { success: true, rendered: true };
            } catch (e: any) {
              responseData = { error: e.message };
            }
            break;
          }
          
          case 'build-dashboard': {
            console.log('[DashAgent] build-dashboard handler called with:', { 
              hasDashboard: !!dashboard, 
              dashboardWorksheetCount: dashboard?.worksheets?.length || 0,
              title: data.title,
              worksheet: data.worksheet,
              hasPreviewContainer: !!previewContainer,
              labelOverrides: data.labelOverrides,
              labelOverridesType: typeof data.labelOverrides
            });
            
            if (!dashboard) {
              console.error('[DashAgent] build-dashboard: Dashboard not available!');
              responseData = { error: 'Dashboard not available' };
              break;
            }
            
            try {
              // Get worksheets - use specified worksheet or ALL worksheets for comprehensive dashboard
              let worksheetsToUse: any[] = [];
              if (data.worksheet) {
                // Specific worksheet requested
                const ws = dashboard.worksheets.find((w: any) => w.name === data.worksheet);
                if (ws) {
                  worksheetsToUse = [ws];
                }
              }
              
              // If no specific worksheet or not found, use all worksheets
              if (worksheetsToUse.length === 0) {
                worksheetsToUse = dashboard.worksheets;
              }
              
              if (worksheetsToUse.length === 0) {
                responseData = { error: 'No worksheets available' };
                break;
              }
              
              console.log('[DashAgent] Building dashboard from', worksheetsToUse.length, 'worksheets:', worksheetsToUse.map((w: any) => w.name));
              
              // Configure dashboard options
              const includeInsights = data.includeInsights !== false; // Default true
              const includeHero = data.includeHero !== false; // Default true
              const mode = data.mode || 'full';
              
              // Build dashboard using Layout Engine (handles all modes including compact)
              console.log('[DashAgent] Building smart dashboard:', { mode, includeInsights, includeHero });
              const dashboardResult = await buildSmartDashboard(worksheetsToUse, {
                title: data.title || 'Dashboard',
                labelOverrides: data.labelOverrides || {},
                theme: data.theme || 'professional',
                customColors: data.customColors,
                maxMetrics: data.maxMetrics || 6,
                maxItems: data.maxItems || 7,
                mode: mode as 'full' | 'executive' | 'analytical' | 'compact',
                includeInsights: includeInsights,
                includeHero: includeHero,
                heroTitle: data.heroTitle,
                heroSubtitle: data.heroSubtitle,
                keyTakeaway: data.keyTakeaway,
                focusDimension: data.focusDimension,
                focusMetrics: data.focusMetrics
              });
              
              console.log('[DashAgent] Dashboard built:', { 
                htmlLength: dashboardResult.html?.length || 0,
                metrics: dashboardResult.metrics?.length || 0,
                chartsRendered: dashboardResult.chartsRendered
              });
              
              if (previewContainer) {
                previewContainer.innerHTML = dashboardResult.html;
                state.generatedHtml = dashboardResult.html;
                // Store dashboard base HTML for append functionality
                state.dashboardBaseHtml = dashboardResult.html;
                console.log('[DashAgent] Dashboard HTML set to previewContainer and stored for append');
              } else {
                console.error('[DashAgent] previewContainer is null!');
              }
              
              // Clear stale viz configs - dashboard uses different render approach
              state.currentVizConfigs = [];
              localStorage.removeItem('dashagent_viz_configs');
              
              // Hide Refresh (dashboard outputs don't support refresh), show Clear only
              const btnRefreshViz = document.getElementById('btn-refresh-viz');
              const btnClearViz = document.getElementById('btn-clear-viz');
              if (btnRefreshViz) btnRefreshViz.style.display = 'none';
              if (btnClearViz) btnClearViz.style.display = 'inline-block';
              
              // Set up auto-refresh event listeners
              await setupAutoRefreshListeners(dashboard);
              
              responseData = { success: true, rendered: true };
            } catch (e: any) {
              console.error('[DashAgent] build-dashboard error:', e);
              responseData = { error: e.message };
            }
            break;
          }
          
          case 'render': {
            // Direct HTML rendering
            if (previewContainer) {
              if (data.append) {
                previewContainer.innerHTML += data.html;
              } else {
                previewContainer.innerHTML = data.html;
              }
              state.generatedHtml = previewContainer.innerHTML;
            }
            responseData = { success: true };
            break;
          }
          
          case 'toggle-tooltips': {
            const tooltipStyle = document.getElementById('tooltip-toggle-style') as HTMLStyleElement || document.createElement('style');
            tooltipStyle.id = 'tooltip-toggle-style';
            tooltipStyle.textContent = data.enabled ? '' : '.chart-tooltip { display: none !important; }';
            if (!tooltipStyle.parentNode) document.head.appendChild(tooltipStyle);
            responseData = { success: true, tooltipsEnabled: data.enabled };
            break;
          }
          
          // ==================== DESIGN ANALYSIS ====================
          case 'get-image': {
            // Return dropped screenshot if available
            console.log('[DashAgent] get-image called, state.uploadedImage exists:', !!state.uploadedImage, 'length:', state.uploadedImage?.length || 0);
            if (state.uploadedImage) {
              console.log('[DashAgent] Returning image to MCP, size:', Math.round(state.uploadedImage.length / 1024), 'KB');
              responseData = { 
                image: state.uploadedImage,
                hasImage: true 
              };
            } else {
              // No image available - switch to Design tab and flash the capture button
              const designTab = document.querySelector('[data-panel="design"]') as HTMLElement;
              if (designTab) {
                designTab.click();
              }
              
              // Highlight the capture button briefly to draw attention
              setTimeout(() => {
                const captureBtn = document.getElementById('btn-capture');
                if (captureBtn) {
                  captureBtn.classList.add('pulse-highlight');
                  setTimeout(() => captureBtn.classList.remove('pulse-highlight'), 3000);
                }
              }, 300);
              
              responseData = { 
                image: null,
                hasImage: false,
                switchedToDesign: true,
                message: 'Switched to Design tab. Please click "Capture Screen" or drop a screenshot.'
              };
            }
            break;
          }
          
          case 'transform-to-story': {
            // Build and render a story-style visualization from ALL worksheets
            if (!dashboard) {
              responseData = { error: 'Dashboard not available. Make sure the extension is connected to a Tableau dashboard.' };
              break;
            }
            
            try {
              // Get ALL worksheets from the dashboard
              const allWorksheets = dashboard.worksheets;
              const worksheetNames = allWorksheets.map((w: any) => w.name);
              console.log('[DashAgent] transform-to-story: Analyzing ALL worksheets:', worksheetNames);
              
              if (!allWorksheets || allWorksheets.length === 0) {
                responseData = { 
                  error: 'No worksheets found in dashboard.',
                  availableWorksheets: []
                };
                break;
              }
              
              // Use the story builder with ALL worksheets
              const storyResult = await buildStoryHtml(allWorksheets, {
                title: data.title || 'Data Story',
                labelOverrides: data.labelOverrides || {},
                theme: data.theme || 'story',
                customColors: data.customColors,
                headline: data.headline,
                keyTakeaway: data.keyTakeaway
              });
              
              if (previewContainer) {
                previewContainer.innerHTML = storyResult.html;
                state.generatedHtml = storyResult.html;
              }
              
              // Clear stale viz configs - story uses different render approach
              state.currentVizConfigs = [];
              localStorage.removeItem('dashagent_viz_configs');
              
              // Hide Refresh (story outputs don't support refresh), show Clear only
              const btnRefreshViz = document.getElementById('btn-refresh-viz');
              const btnClearViz = document.getElementById('btn-clear-viz');
              if (btnRefreshViz) btnRefreshViz.style.display = 'none';
              if (btnClearViz) btnClearViz.style.display = 'inline-block';
              
              // Set up auto-refresh event listeners
              await setupAutoRefreshListeners(dashboard);
              
              responseData = { 
                success: true, 
                rendered: true,
                headline: storyResult.headline,
                keyTakeaway: storyResult.keyTakeaway,
                insights: storyResult.insights
              };
            } catch (e: any) {
              console.error('[DashAgent] transform-to-story error:', e);
              responseData = { error: e.message };
            }
            break;
          }

          case 'analyze-iron-viz-style':
          case 'analyze-color-harmony':
          case 'suggest-annotations': {
            // These need LLM processing - return data for MCP server to handle
            const wsData = await getWorksheetData(data.worksheet);
            responseData = {
              ...wsData,
              image: state.uploadedImage,
              dashboardContext: appState.dashboardContext
            };
            break;
          }
          
          case 'generate-tableau-palette': {
            // Generate and render a Tableau color palette
            const theme = (data.theme as string)?.toLowerCase() || 'corporate';
            const brandColors = data.brandColors as string[] | undefined;
            const paletteType = (data.paletteType as string) || 'categorical';
            const paletteName = (data.paletteName as string) || `DashAgent ${data.theme || 'Corporate'} Palette`;
            const colorCount = (data.colorCount as number) || 10;

            // Predefined theme palettes
            const themePalettes: Record<string, { colors: string[]; colorNames: string[]; description: string }> = {
              corporate: {
                colors: ['#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF', '#336699', '#6699CC', '#99B2CC', '#CCE0FF', '#E6F0FF'],
                colorNames: ['Navy Blue', 'Corporate Blue', 'Sky Blue', 'Light Blue', 'Ice Blue', 'Steel Blue', 'Slate Blue', 'Silver Blue', 'Pale Blue', 'Ghost Blue'],
                description: 'Professional corporate palette with trustworthy blues for business dashboards'
              },
              ocean: {
                colors: ['#0A2342', '#154360', '#1A5276', '#2471A3', '#2E86AB', '#3498DB', '#5DADE2', '#85C1E9', '#AED6F1', '#D4E6F1'],
                colorNames: ['Deep Ocean', 'Navy', 'Marine', 'Sea Blue', 'Ocean', 'Azure', 'Aqua', 'Light Sea', 'Foam', 'Mist'],
                description: 'Deep ocean-inspired palette transitioning from deep navy to light seafoam'
              },
              nature: {
                colors: ['#1B4332', '#2D5A3D', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D8F3DC', '#A8DADC', '#457B9D'],
                colorNames: ['Forest', 'Pine', 'Emerald', 'Jade', 'Mint', 'Sage', 'Seafoam', 'Spring', 'Teal', 'Ocean'],
                description: 'Natural green palette evoking growth, sustainability, and environmental themes'
              },
              sunset: {
                colors: ['#2D0A31', '#5C164E', '#A02C5D', '#D44D6E', '#F07178', '#FF8A80', '#FFB74D', '#FFD54F', '#FFEE58', '#FFF59D'],
                colorNames: ['Twilight', 'Plum', 'Raspberry', 'Coral', 'Salmon', 'Peach', 'Tangerine', 'Gold', 'Sunshine', 'Cream'],
                description: 'Warm sunset gradient from deep purple through coral to golden yellow'
              },
              tech: {
                colors: ['#1A1A2E', '#16213E', '#0F3460', '#533483', '#7952B3', '#6F42C1', '#5E35B1', '#7C4DFF', '#B388FF', '#00BCD4'],
                colorNames: ['Dark Matter', 'Deep Space', 'Midnight', 'Purple Haze', 'Electric Violet', 'Digital Purple', 'Neon Violet', 'Ultraviolet', 'Lavender', 'Cyan'],
                description: 'Modern tech palette with deep purples and electric accents for data-driven dashboards'
              },
              finance: {
                colors: ['#0D1B2A', '#1B263B', '#2C3E50', '#34495E', '#5D6D7E', '#778899', '#95A5A6', '#27AE60', '#E74C3C', '#F39C12'],
                colorNames: ['Black', 'Charcoal', 'Slate', 'Gray', 'Silver', 'Light Gray', 'Neutral', 'Green (Positive)', 'Red (Negative)', 'Gold (Warning)'],
                description: 'Financial dashboard palette with neutral grays and semantic colors for gains/losses'
              },
              healthcare: {
                colors: ['#2C3E50', '#3498DB', '#1ABC9C', '#27AE60', '#9B59B6', '#E74C3C', '#F39C12', '#ECF0F1', '#95A5A6', '#BDC3C7'],
                colorNames: ['Dark Slate', 'Medical Blue', 'Teal', 'Health Green', 'Violet', 'Alert Red', 'Caution Orange', 'White', 'Gray', 'Light Gray'],
                description: 'Healthcare palette balancing clinical blues with accessible status colors'
              },
              energy: {
                colors: ['#1A1A1A', '#2ECC71', '#27AE60', '#F1C40F', '#E67E22', '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C', '#ECF0F1'],
                colorNames: ['Carbon', 'Renewable Green', 'Growth', 'Solar Yellow', 'Gas Orange', 'Alert', 'Alternative', 'Water', 'Wind Teal', 'Clean'],
                description: 'Energy sector palette with renewable greens and fossil fuel warm tones'
              },
              retail: {
                colors: ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#34495E', '#95A5A6', '#ECF0F1'],
                colorNames: ['Sale Red', 'Trust Blue', 'Growth Green', 'Premium Purple', 'Highlight Yellow', 'Teal', 'Warm Orange', 'Slate', 'Gray', 'Light'],
                description: 'Retail-focused palette with attention-grabbing colors for sales and promotions'
              },
              minimal: {
                colors: ['#212121', '#424242', '#616161', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#EEEEEE', '#F5F5F5', '#FAFAFA'],
                colorNames: ['Charcoal', 'Dark Gray', 'Medium Dark', 'Medium', 'Gray', 'Light Gray', 'Silver', 'Pale', 'Off White', 'White'],
                description: 'Minimalist grayscale palette for clean, professional designs'
              }
            };

            // Get palette for theme (fallback to corporate if not found)
            const basePalette = themePalettes[theme] || themePalettes.corporate;
            
            // If brand colors provided, blend them into the palette
            let finalColors = basePalette.colors.slice(0, colorCount);
            let finalColorNames = basePalette.colorNames.slice(0, colorCount);
            
            if (brandColors && brandColors.length > 0) {
              for (let i = 0; i < Math.min(brandColors.length, colorCount); i++) {
                finalColors[i] = brandColors[i];
                finalColorNames[i] = `Brand Color ${i + 1}`;
              }
            }

            // Font recommendations based on theme
            const fontRecommendations: Record<string, any> = {
              corporate: { title: { font: 'Segoe UI', weight: 'bold', size: '20-24px' }, body: { font: 'Segoe UI', weight: 'normal', size: '11px' }, kpiValue: { font: 'Segoe UI Semibold', weight: 'bold', size: '32px' }, rationale: 'Professional Windows fonts for corporate environments' },
              tech: { title: { font: 'Inter', weight: 'bold', size: '22px' }, body: { font: 'Inter', weight: 'normal', size: '12px' }, kpiValue: { font: 'SF Mono', weight: 'bold', size: '36px' }, rationale: 'Modern tech fonts with monospace for metrics' },
              finance: { title: { font: 'Helvetica Neue', weight: 'bold', size: '20px' }, body: { font: 'Arial', weight: 'normal', size: '11px' }, kpiValue: { font: 'Consolas', weight: 'bold', size: '28px' }, rationale: 'Clean fonts with monospace numbers for financial accuracy' },
              minimal: { title: { font: 'Helvetica', weight: '300', size: '24px' }, body: { font: 'Helvetica', weight: 'normal', size: '11px' }, kpiValue: { font: 'Helvetica', weight: '200', size: '40px' }, rationale: 'Light weights for minimalist aesthetic' }
            };
            const fonts = fontRecommendations[theme] || fontRecommendations.corporate;

            // Generate Tableau Preferences.tps XML
            const tpsXml = `<?xml version='1.0'?>
<workbook>
  <preferences>
    <color-palette name="${paletteName}" type="${paletteType}">
${finalColors.map(c => `      <color>${c}</color>`).join('\n')}
    </color-palette>
  </preferences>
</workbook>`;

            // Generate HTML preview
            const previewHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; border-radius: 12px;">
  <h2 style="margin-top:0; display:flex; align-items:center; gap:8px;">
    🎨 ${paletteName}
  </h2>
  <p style="opacity:0.8; margin-bottom:20px;">${basePalette.description}</p>
  
  <div style="display:flex; gap:4px; margin-bottom:20px; flex-wrap:wrap;">
    ${finalColors.map((c, i) => `
      <div style="text-align:center;">
        <div style="width:60px; height:60px; background:${c}; border-radius:8px; border:2px solid rgba(255,255,255,0.2);"></div>
        <div style="font-size:10px; margin-top:4px; opacity:0.8;">${c}</div>
        ${finalColorNames[i] ? `<div style="font-size:9px; opacity:0.6;">${finalColorNames[i]}</div>` : ''}
      </div>
    `).join('')}
  </div>
  
  <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; margin-bottom:15px;">
    <strong style="display:block; margin-bottom:10px;">📝 Font Recommendations</strong>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
      <div><span style="opacity:0.7;">Title:</span> ${fonts.title.font} (${fonts.title.size})</div>
      <div><span style="opacity:0.7;">Body:</span> ${fonts.body.font}</div>
      <div><span style="opacity:0.7;">KPI Values:</span> ${fonts.kpiValue.font} (${fonts.kpiValue.size})</div>
      <div><span style="opacity:0.7;">Rationale:</span> ${fonts.rationale}</div>
    </div>
  </div>
  
  <details style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; margin-bottom:15px;">
    <summary style="cursor:pointer; font-weight:600;">📋 Tableau Preferences.tps Content</summary>
    <pre style="font-size:11px; overflow-x:auto; margin-top:10px; background:rgba(0,0,0,0.4); padding:10px; border-radius:6px;">${tpsXml.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>
  </details>
  
  <div style="background:rgba(255,255,255,0.1); padding:12px; border-radius:8px;">
    <strong>📥 How to Install:</strong>
    <ol style="margin:10px 0 0 0; padding-left:20px; font-size:13px;">
      <li>Copy the XML content above</li>
      <li>Navigate to your Tableau Repository folder:<br><code style="font-size:11px; background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px;">Documents/My Tableau Repository/Preferences.tps</code></li>
      <li>Open Preferences.tps in a text editor</li>
      <li>Paste the color-palette section inside the preferences tags</li>
      <li>Restart Tableau Desktop</li>
      <li>Find your palette under "Color" → "Select Color Palette"</li>
    </ol>
  </div>
</div>`;

            // Render to preview container
            if (previewContainer) {
              previewContainer.innerHTML = previewHtml;
              state.generatedHtml = previewHtml;
            }
            
            responseData = { 
              success: true, 
              rendered: true,
              paletteName,
              paletteType,
              colors: finalColors,
              colorNames: finalColorNames,
              description: basePalette.description,
              tpsXml,
              fontRecommendations: fonts
            };
            break;
          }
          
          // ==================== DOCUMENTATION ====================
          case 'generate-documentation':
            // Generate comprehensive dashboard documentation
            responseData = await generateDashboardDocumentation(data.options || {});
            break;
            
          default:
            console.log('[DashAgent] Unknown request type:', data.type);
            // For unknown types, try to return worksheet data as fallback
            responseData = await getWorksheetData(data.worksheet);
        }
        
        // Send response back
        console.log('[DashAgent] Sending response for', data.requestId, responseData?.rowCount || responseData?.error || 'OK');
        sendMcpResponse(data.requestId, responseData);
      } catch (error: any) {
        console.error('[DashAgent] Error handling MCP request:', error);
        sendMcpResponse(data.requestId, null, error.message);
      }
    };
    connectMCP(handleMCPRequest);
  } catch (e) {
    console.log('[DashAgent] MCP bridge not available:', e);
  }
}

/**
 * Get data from worksheets for MCP tools
 */
async function getWorksheetData(targetWorksheetName?: string): Promise<any> {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    
    // If a specific worksheet is requested, find it
    if (targetWorksheetName) {
      const targetWs = dashboard.worksheets.find((ws: any) => ws.name === targetWorksheetName);
      if (targetWs) {
        return await extractWorksheetData(targetWs);
      }
    }
    
    // Otherwise, try all worksheets and return the first one with data
    for (const ws of dashboard.worksheets) {
      try {
        const result = await extractWorksheetData(ws);
        if (result.data && result.data.length > 0) {
          return result;
        }
      } catch (e) {
        console.log(`[DashAgent] Could not get data from ${ws.name}:`, e);
      }
    }
    
    return { error: 'No worksheet data available' };
  } catch (error: any) {
    console.error('[DashAgent] getWorksheetData error:', error);
    return { error: error.message };
  }
}

/**
 * Extract data from a single worksheet
 */
async function extractWorksheetData(ws: any): Promise<any> {
  const summary = await ws.getSummaryDataAsync();
  const columns = summary.columns.map((c: any) => c.fieldName);
  const allData: any[] = [];
  
  for (const row of summary.data) {
    const rowObj: any = {};
    columns.forEach((col: string, i: number) => {
      rowObj[col] = row[i].formattedValue;
    });
    allData.push(rowObj);
  }
  
  return {
    worksheet: ws.name,
    data: allData,
    columns,
    rowCount: allData.length
  };
}

/**
 * Get summary data from a specific worksheet
 */
async function getWorksheetSummaryData(worksheetName?: string): Promise<any> {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    
    // Find the worksheet
    let targetWs = worksheetName 
      ? dashboard.worksheets.find((ws: any) => ws.name === worksheetName)
      : dashboard.worksheets[0];
    
    if (!targetWs) {
      return { error: `Worksheet "${worksheetName}" not found` };
    }
    
    const summary = await targetWs.getSummaryDataAsync();
    const columns = summary.columns.map((c: any) => ({
      fieldName: c.fieldName,
      dataType: c.dataType,
      isReferenced: c.isReferenced
    }));
    
    const data: any[] = [];
    for (const row of summary.data) {
      const rowObj: any = {};
      columns.forEach((col: any, i: number) => {
        rowObj[col.fieldName] = row[i].formattedValue;
      });
      data.push(rowObj);
    }
    
    return {
      worksheet: targetWs.name,
      columns,
      data,
      rowCount: data.length
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Infer visualization type based on fields and data
 */
function inferVisualizationType(columns: any[], summaryData: any): any {
  const dimensions = columns.filter(c => c.role === 'dimension');
  const measures = columns.filter(c => c.role === 'measure');
  const dimCount = dimensions.length;
  const measureCount = measures.length;
  const rowCount = summaryData?.data?.length || 0;
  
  // Check for date/time dimensions
  const hasDateDim = dimensions.some((d: any) => 
    d.dataType?.toLowerCase().includes('date') || 
    d.dataType?.toLowerCase().includes('time') ||
    d.fieldName?.toLowerCase().includes('date') ||
    d.fieldName?.toLowerCase().includes('year') ||
    d.fieldName?.toLowerCase().includes('month') ||
    d.fieldName?.toLowerCase().includes('quarter')
  );
  
  // Check for geographic dimensions
  const hasGeoDim = dimensions.some((d: any) =>
    d.fieldName?.toLowerCase().includes('country') ||
    d.fieldName?.toLowerCase().includes('state') ||
    d.fieldName?.toLowerCase().includes('city') ||
    d.fieldName?.toLowerCase().includes('region') ||
    d.fieldName?.toLowerCase().includes('lat') ||
    d.fieldName?.toLowerCase().includes('long') ||
    d.fieldName?.toLowerCase().includes('zip') ||
    d.fieldName?.toLowerCase().includes('postal')
  );
  
  // Infer visualization type
  let vizType = 'Unknown';
  const vizDetails: string[] = [];
  
  if (dimCount === 0 && measureCount === 1 && rowCount <= 1) {
    vizType = 'KPI / Single Value';
    vizDetails.push('Single aggregated measure displayed as a big number');
  } else if (dimCount === 0 && measureCount > 1 && rowCount <= 1) {
    vizType = 'KPI Dashboard / Scorecard';
    vizDetails.push(`${measureCount} aggregated measures displayed as metrics`);
  } else if (hasGeoDim) {
    vizType = 'Map / Geographic Visualization';
    vizDetails.push('Contains geographic dimensions');
    if (measureCount > 0) vizDetails.push(`Sized/colored by ${measures[0]?.fieldName}`);
  } else if (hasDateDim && measureCount >= 1) {
    if (measureCount === 1) {
      vizType = 'Time Series Line Chart';
      vizDetails.push(`Trend of ${measures[0]?.fieldName} over time`);
    } else {
      vizType = 'Multi-Line Time Series';
      vizDetails.push(`${measureCount} measures tracked over time`);
    }
  } else if (dimCount === 1 && measureCount === 1) {
    if (rowCount <= 10) {
      vizType = 'Bar Chart';
      vizDetails.push(`${dimensions[0]?.fieldName} by ${measures[0]?.fieldName}`);
    } else if (rowCount <= 30) {
      vizType = 'Bar Chart or Horizontal Bar';
      vizDetails.push(`${rowCount} categories - may benefit from horizontal layout`);
    } else {
      vizType = 'Large Category Chart (Bar/Treemap)';
      vizDetails.push(`${rowCount} categories - consider grouping or filtering`);
    }
  } else if (dimCount === 1 && measureCount === 2) {
    vizType = 'Dual-Axis Bar Chart or Combo Chart';
    vizDetails.push(`${dimensions[0]?.fieldName} with two measures`);
  } else if (dimCount === 2 && measureCount === 1) {
    vizType = 'Stacked Bar / Grouped Bar / Heat Map';
    vizDetails.push(
      `${dimensions[0]?.fieldName} broken down by ${dimensions[1]?.fieldName}`,
      `Colored/sized by ${measures[0]?.fieldName}`
    );
  } else if (dimCount === 0 && measureCount === 2) {
    vizType = 'Scatter Plot';
    vizDetails.push(`${measures[0]?.fieldName} vs ${measures[1]?.fieldName}`);
  } else if (dimCount === 1 && measureCount >= 3) {
    vizType = 'Parallel Coordinates or Multi-Measure Table';
    vizDetails.push(`${measureCount} measures for each ${dimensions[0]?.fieldName}`);
  } else if (dimCount >= 2 && measureCount >= 1) {
    vizType = 'Cross-Tab / Pivot Table / Heat Map';
    vizDetails.push(`${dimCount} dimensions with ${measureCount} measure(s)`);
  } else if (dimCount >= 1 && measureCount === 0) {
    vizType = 'Text Table / List';
    vizDetails.push('Dimension-only view, likely a table or filter list');
  }
  
  return {
    type: vizType,
    details: vizDetails,
    analysis: {
      dimensions: dimensions.map((d: any) => d.fieldName),
      measures: measures.map((m: any) => m.fieldName),
      hasDateDimension: hasDateDim,
      hasGeoDimension: hasGeoDim,
      rowCount: rowCount
    }
  };
}

/**
 * Generate comprehensive dashboard documentation
 */
async function generateDashboardDocumentation(options: any = {}): Promise<any> {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const docData: any = {
      dashboardName: dashboard.name,
      generatedAt: new Date().toISOString(),
      worksheets: [],
      dataSources: [],
      parameters: [],
      filters: []
    };
    
    // Get parameters
    if (options.includeParameters !== false) {
      try {
        const params = await dashboard.getParametersAsync();
        docData.parameters = params.map((p: any) => ({
          name: p.name,
          dataType: p.dataType,
          currentValue: p.currentValue?.value,
          allowableValuesType: p.allowableValues?.type
        }));
      } catch (e) {
        console.log('[DashAgent] Could not get parameters:', e);
      }
    }
    
    // Process each worksheet
    for (const ws of dashboard.worksheets) {
      const wsData: any = {
        name: ws.name,
        sheetType: ws.sheetType,
        size: ws.size ? { width: ws.size.width, height: ws.size.height } : null,
        filters: [],
        dataSources: [],
        columns: [],
        markType: null,
        inferredVizType: null,
        dimensionCount: 0,
        measureCount: 0
      };
      
      // Get summary data columns to see what fields are used
      try {
        const summaryData = await ws.getSummaryDataAsync({ maxRows: 10 });
        
        // Try to get field roles from the data source
        const fieldRoles: any = {};
        try {
          const dataSources = await ws.getDataSourcesAsync();
          if (dataSources.length > 0) {
            const fields = await dataSources[0].getFieldsAsync();
            for (const f of fields) {
              fieldRoles[f.name] = f.role;
            }
          }
        } catch (e) {
          console.error('[DashAgent] Could not get field roles for', ws.name, e);
        }
        
        wsData.columns = summaryData.columns.map((col: any) => {
          // Determine role - check from data source or infer from data type
          let role = fieldRoles[col.fieldName] || null;
          if (!role) {
            // Infer role based on data type
            if (['int', 'float', 'real', 'integer'].includes(col.dataType?.toLowerCase())) {
              role = 'measure';
            } else {
              role = 'dimension';
            }
          }
          return {
            fieldName: col.fieldName,
            dataType: col.dataType,
            isReferenced: col.isReferenced,
            role: role
          };
        });
        
        // Count dimensions and measures
        wsData.dimensionCount = wsData.columns.filter((c: any) => c.role === 'dimension').length;
        wsData.measureCount = wsData.columns.filter((c: any) => c.role === 'measure').length;
        
        // Infer visualization type based on field configuration
        wsData.inferredVizType = inferVisualizationType(wsData.columns, summaryData);
        
      } catch (e) {
        console.log('[DashAgent] Could not get summary data for', ws.name, e);
      }
      
      // Get filters for this worksheet
      if (options.includeWorksheets !== false) {
        try {
          const filters = await ws.getFiltersAsync();
          wsData.filters = filters.map((f: any) => ({
            fieldName: f.fieldName,
            filterType: f.filterType,
            appliedValues: f.appliedValues?.map((v: any) => v.value) || []
          }));
          
          // Add to global filters list
          for (const f of wsData.filters) {
            docData.filters.push({
              worksheet: ws.name,
              fieldName: f.fieldName,
              filterType: f.filterType
            });
          }
        } catch (e) {
          // Some worksheets may not support filters
          console.error('[DashAgent] Error fetching filters:', e);
        }
      }
      
      // Get data sources for this worksheet
      if (options.includeDataSources !== false) {
        try {
          const dataSources = await ws.getDataSourcesAsync();
          for (const ds of dataSources) {
            wsData.dataSources.push({ name: ds.name });
            
            // Check if we already processed this data source
            if (!docData.dataSources.some((d: any) => d.name === ds.name)) {
              const dsData: any = {
                name: ds.name,
                isExtract: ds.isExtract,
                fields: [],
                tables: [],
                connectionInfo: null
              };
              
              // Get fields
              if (options.includeFields !== false) {
                try {
                  const fields = await ds.getFieldsAsync();
                  dsData.fields = fields.map((f: any) => ({
                    name: f.name,
                    dataType: f.dataType,
                    role: f.role,
                    isCalculatedField: f.isCalculatedField,
                    description: f.description || null
                  }));
                } catch (e) {
                  console.log('[DashAgent] Could not get fields for', ds.name, e);
                }
              }
              
              // Get tables (active tables)
              try {
                const tables = await ds.getActiveTablesAsync();
                dsData.tables = tables.map((t: any) => ({
                  name: t.name,
                  connectionId: t.connectionId
                }));
              } catch (e) {
                console.log('[DashAgent] Could not get tables for', ds.name, e);
              }
              
              // Get connection info
              try {
                const connections = await ds.getConnectionSummariesAsync();
                if (connections.length > 0) {
                  const conn = connections[0];
                  dsData.connectionInfo = {
                    type: conn.type,
                    serverName: conn.serverName || null,
                    databaseName: conn.databaseName || null
                  };
                }
              } catch (e) {
                console.log('[DashAgent] Could not get connection info for', ds.name, e);
              }
              
              docData.dataSources.push(dsData);
            }
          }
        } catch (e) {
          console.log('[DashAgent] Could not get data sources for worksheet', ws.name, e);
        }
      }
      
      docData.worksheets.push(wsData);
    }
    
    return docData;
  } catch (error: any) {
    console.error('[DashAgent] generateDashboardDocumentation error:', error);
    return { error: error.message };
  }
}

/**
 * Fetch dashboard context from Tableau
 */
async function fetchDashboardContext(): Promise<void> {
  try {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    
    const worksheets: any[] = [];
    for (const ws of dashboard.worksheets) {
      try {
        const summary = await ws.getSummaryDataAsync();
        const columns = summary.columns.map((c: any) => ({
          fieldName: c.fieldName,
          dataType: c.dataType,
          isReferenced: c.isReferenced
        }));
        
        worksheets.push({
          name: ws.name,
          columns,
          rowCount: summary.data.length
        });
      } catch (e) {
        console.error('[DashAgent] Error fetching worksheet data:', e);
        worksheets.push({
          name: ws.name,
          columns: [],
          rowCount: 0,
          error: 'Could not fetch data'
        });
      }
    }

    // Extract dimensions and measures from worksheets
    const allDimensions: string[] = [];
    const allMeasures: string[] = [];
    worksheets.forEach(ws => {
      ws.columns?.forEach((col: { fieldName: string; isReferenced?: boolean }) => {
        if (col.isReferenced) {
          allMeasures.push(col.fieldName);
        } else {
          allDimensions.push(col.fieldName);
        }
      });
    });

    appState.dashboardContext = {
      dashboardName: dashboard.name,
      worksheets,
      parameters: [],
      filters: [],
      availableDimensions: [...new Set(allDimensions)],
      availableMeasures: [...new Set(allMeasures)]
    };

  } catch (error) {
    console.error('[DashAgent] Failed to fetch dashboard context:', error);
  }
}

/**
 * Save viz configs to localStorage
 */
function saveVizConfigs(): void {
  try {
    const configsToSave = state.currentVizConfigs.map(c => ({
      ...c,
      worksheetObj: undefined // Don't serialize worksheet objects
    }));
    localStorage.setItem('dashagent_viz_configs', JSON.stringify(configsToSave));
  } catch (e) {
    console.warn('[DashAgent] Failed to save viz configs:', e);
  }
}

/**
 * Load viz configs from localStorage and rehydrate with live worksheet objects
 */
function loadVizConfigs(): void {
  try {
    const saved = localStorage.getItem('dashagent_viz_configs');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Rehydrate with live worksheet objects
      const dashboard = tableau?.extensions?.dashboardContent?.dashboard;
      if (dashboard) {
        state.currentVizConfigs = parsed.map((config: any) => {
          if (config.worksheetName) {
            const ws = dashboard.worksheets.find((w: any) => w.name === config.worksheetName);
            if (ws) {
              return { ...config, worksheetObj: ws };
            }
          }
          return config;
        }).filter((config: any) => config.worksheetObj); // Only keep configs with valid worksheets
        console.log('[DashAgent] Loaded and rehydrated viz configs:', state.currentVizConfigs.length);
      } else {
        // Dashboard not ready yet, store raw configs
        state.currentVizConfigs = parsed;
        console.log('[DashAgent] Loaded viz configs (pending rehydration):', state.currentVizConfigs.length);
      }
    }
  } catch (e) {
    console.warn('[DashAgent] Failed to load viz configs:', e);
  }
}

/**
 * Rehydrate viz configs with live worksheet objects
 * Call this after dashboard becomes available if configs were loaded before init
 */
function rehydrateVizConfigs(): void {
  try {
    const dashboard = tableau?.extensions?.dashboardContent?.dashboard;
    if (!dashboard || state.currentVizConfigs.length === 0) return;
    
    // Check if any configs need rehydration (missing worksheetObj)
    const needsRehydration = state.currentVizConfigs.some(c => !c.worksheetObj && c.worksheetName);
    if (!needsRehydration) return;
    
    state.currentVizConfigs = state.currentVizConfigs.map((config: any) => {
      if (!config.worksheetObj && config.worksheetName) {
        const ws = dashboard.worksheets.find((w: any) => w.name === config.worksheetName);
        if (ws) {
          return { ...config, worksheetObj: ws };
        }
      }
      return config;
    }).filter((config: any) => config.worksheetObj);
    
    console.log('[DashAgent] Rehydrated viz configs:', state.currentVizConfigs.length);
  } catch (e) {
    console.warn('[DashAgent] Failed to rehydrate viz configs:', e);
  }
}

// Expose PDF download functions to window for onclick handlers
if (globalThis.window !== undefined) {
  (globalThis as any).downloadDocAsPDF = async function() {
    console.log('[DashAgent] Download PDF clicked, state.lastGeneratedDoc:', state.lastGeneratedDoc);
    
    if (!state.lastGeneratedDoc) {
      alert('No documentation available. Please generate documentation first.');
      return;
    }
    
    const { markdown, timestamp } = state.lastGeneratedDoc;
    console.log('[DashAgent] Generating PDF for markdown of length:', markdown?.length);
    
    // Convert markdown to HTML with proper styling
    const htmlContent = convertMarkdownToHtml(markdown);
    
    // Create a container for the PDF
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        ${htmlContent}
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          Generated by DashAgent for Tableau on ${new Date(timestamp).toLocaleString()}
        </div>
      </div>
    `;

    try {
      if (html2pdf === undefined) {
        // Fallback to print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          // Use innerHTML instead of deprecated write()
          printWindow.document.body.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Dashboard Documentation</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1, h2, h3 { color: #1f2937; }
                h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
                h2 { margin-top: 24px; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
                th { background: #f9fafb; }
                code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
                pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; }
              </style>
            </head>
            <body>
              ${htmlContent}
              <p style="margin-top: 40px; color: #9ca3af; text-align: center; font-size: 12px;">
                Generated by DashAgent on ${new Date(timestamp).toLocaleString()}
              </p>
            </body>
            </html>
          `;
          printWindow.print();
        }
      } else {
        // Use html2pdf library
        const opt = {
          margin: 10,
          filename: `dashboard-documentation-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(container).save();
      }
    } catch (e) {
      console.error('[DashAgent] PDF generation error:', e);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  (globalThis as any).downloadAnalysisAsPDF = async function() {
    console.log('[DashAgent] Download Analysis PDF clicked, state.lastGeneratedAnalysis:', state.lastGeneratedAnalysis);
    
    if (!state.lastGeneratedAnalysis) {
      alert('No analysis available. Please run an analysis first.');
      return;
    }
    
    const { markdown, timestamp } = state.lastGeneratedAnalysis;
    console.log('[DashAgent] Generating PDF for analysis of length:', markdown?.length);
    
    // Convert markdown to HTML with proper styling
    const htmlContent = convertMarkdownToHtml(markdown);
    
    // Create a container for the PDF
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        ${htmlContent}
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          Generated by DashAgent for Tableau on ${new Date(timestamp).toLocaleString()}
        </div>
      </div>
    `;

    try {
      if (html2pdf === undefined) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          // Use innerHTML instead of deprecated write()
          printWindow.document.body.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Dashboard Analysis</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1, h2, h3 { color: #1f2937; }
                table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                th { background: #f9fafb; }
              </style>
            </head>
            <body>
              ${htmlContent}
              <p style="margin-top: 40px; color: #9ca3af; text-align: center; font-size: 12px;">
                Generated by DashAgent on ${new Date(timestamp).toLocaleString()}
              </p>
            </body>
            </html>
          `;
          printWindow.print();
        }
      } else {
        // Use html2pdf library
        const opt = {
          margin: 10,
          filename: `dashboard-analysis-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(container).save();
      }
    } catch (e) {
      console.error('[DashAgent] PDF generation error:', e);
      alert('Failed to generate PDF. Check console for details.');
    }
  };
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if Tableau Extensions API is available
    if (tableau === undefined || !tableau.extensions) {
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = 'Error: Tableau API not loaded';
      console.error('[DashAgent] Tableau Extensions API not available');
      return;
    }
    
    initDashAgent();
  });
}

// Export for use by other modules
export {
  addMessage,
  showThinking,
  removeThinking,
  state,
  saveVizConfigs
};
