/**
 * Application State Management
 * Centralized state for the DashAgent extension
 */

import type { 
  DashboardContext, 
  Settings, 
  ModelConfig, 
  ChatMessage, 
  VizConfig,
  StoryCache
} from './types';

// Default story cache state
function createDefaultStoryCache(): StoryCache {
  return {
    cacheKey: {
      worksheetNames: [],
      dataHash: null,
      rowCount: 0,
      filterState: '',
      timestamp: null
    },
    isStale: true,
    staleReason: 'initial',
    extractedData: {
      rankings: {},
      statistics: {},
      topPerformers: {},
      totals: {},
      anomalies: [],
      dimensionBreakdowns: {},
      rawMetrics: [],
      worksheetSummaries: []
    },
    analysisResult: {
      heroHeadline: null,
      keyTakeaway: null,
      insights: [],
      recommendations: [],
      trustStatement: null,
      analysisAngle: null,
      audience: null
    },
    designPreferences: {
      theme: 'professional',
      colorScheme: ['#0B5CAD', '#1F9FB5', '#F4A261', '#E76F51'],
      layout: 'standard',
      emphasis: null
    },
    explorationState: {
      fieldProfiles: {},
      correlationMatrix: {},
      dataQuality: {
        completeness: 0,
        uniqueness: 0,
        consistency: 0,
        issues: []
      },
      drillPath: [],
      focusedSegments: [],
      regressionModels: {},
      clusterAnalysis: {},
      seasonalityPatterns: {}
    }
  };
}

// Settings with helpers
function createSettings(): Settings {
  const settings = {
    // API Keys for both providers
    openaiApiKey: localStorage.getItem('dashagent_openai_apikey') || '',
    anthropicApiKey: localStorage.getItem('dashagent_anthropic_apikey') || '',
    
    // Model selection by task type (format: "provider:model")
    modelVision: localStorage.getItem('dashagent_model_vision') || 'openai:gpt-5.2',
    modelGeneration: localStorage.getItem('dashagent_model_generation') || 'anthropic:claude-sonnet-4-20250514',
    modelAnalysis: localStorage.getItem('dashagent_model_analysis') || 'openai:gpt-5.2',
    
    // MCP Server
    mcpUrl: localStorage.getItem('dashagent_mcpurl') || 'ws://localhost:3001',
    wsAuthToken: localStorage.getItem('dashagent_ws_auth_token') || 'dashagent-dev-token-2024',  // Must match DASHAGENT_WS_TOKEN on server
    
    // Helper to get model config for a task type
    getModelConfig(taskType: 'vision' | 'generation' | 'analysis'): ModelConfig {
      let modelString: string;
      switch (taskType) {
        case 'vision': modelString = this.modelVision; break;
        case 'generation': modelString = this.modelGeneration; break;
        case 'analysis': 
        default: modelString = this.modelAnalysis; break;
      }
      const [provider, model] = modelString.split(':') as ['openai' | 'anthropic', string];
      const apiKey = provider === 'openai' ? this.openaiApiKey : this.anthropicApiKey;
      return { provider, model, apiKey };
    },
    
    // Helper to get the correct token parameter for OpenAI models
    getOpenAITokenParam(_model: string, tokens: number = 4096): { max_completion_tokens: number } {
      // Note: max_completion_tokens is required for newer OpenAI models (GPT-4o, o1, etc.)
      return { max_completion_tokens: tokens };
    }
  };
  
  return settings;
}

// Application state singleton
export class AppState {
  // Settings
  settings: Settings = createSettings();
  
  // Dashboard context
  dashboardContext: DashboardContext | null = null;
  
  // Conversation history
  conversationHistory: ChatMessage[] = [];
  
  // Last generated analysis (for follow-up questions)
  lastGeneratedAnalysis: { markdown?: string } | null = null;
  
  // Visualization state
  currentVizConfigs: VizConfig[] = [];
  vizEventListeners: any[] = [];
  dashboardBaseHtml: string = '';
  tooltipsEnabled: boolean = true;
  generatedHtml: string = '';
  
  // Story cache
  storyCache: StoryCache = createDefaultStoryCache();
  
  // Uploaded image (for design analysis)
  uploadedImage: string | null = null;
  
  // MCP connection state
  mcpSocket: WebSocket | null = null;
  mcpRequestId: number = 0;
  mcpCallbacks: Record<string, Function> = {};
  
  // Refresh debounce timer
  refreshDebounceTimer: number | null = null;
  
  // Save settings to localStorage
  saveSettings(): void {
    localStorage.setItem('dashagent_openai_apikey', this.settings.openaiApiKey);
    localStorage.setItem('dashagent_anthropic_apikey', this.settings.anthropicApiKey);
    localStorage.setItem('dashagent_model_vision', this.settings.modelVision);
    localStorage.setItem('dashagent_model_generation', this.settings.modelGeneration);
    localStorage.setItem('dashagent_model_analysis', this.settings.modelAnalysis);
    localStorage.setItem('dashagent_mcpurl', this.settings.mcpUrl);
    localStorage.setItem('dashagent_ws_auth_token', this.settings.wsAuthToken);
  }
  
  // Clear conversation history
  clearConversation(): void {
    this.conversationHistory = [];
    this.lastGeneratedAnalysis = null;
  }
  
  // Add message to history
  addToHistory(message: ChatMessage): void {
    this.conversationHistory.push(message);
    // Limit history size
    const MAX_HISTORY = 20;
    if (this.conversationHistory.length > MAX_HISTORY) {
      this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY);
    }
  }
  
  // Mark story cache as stale
  markStoryCacheStale(reason: string): void {
    this.storyCache.isStale = true;
    this.storyCache.staleReason = reason;
    console.log(`[StoryCache] Marked stale: ${reason}`);
  }
  
  // Check if story cache is valid
  isStoryCacheValid(worksheetNames: string[], rowCount: number): boolean {
    if (this.storyCache.isStale) return false;
    if (this.storyCache.cacheKey.rowCount !== rowCount) return false;
    if (JSON.stringify(this.storyCache.cacheKey.worksheetNames) !== JSON.stringify(worksheetNames)) return false;
    // Cache expires after 10 minutes
    const timestamp = this.storyCache.cacheKey.timestamp;
    if (!timestamp || Date.now() - timestamp > 600000) return false;
    return true;
  }
  
  // Save viz configs to localStorage
  saveVizConfigs(): void {
    const configsToSave = this.currentVizConfigs.map(c => {
      const { worksheetObj, ...rest } = c as any;
      return { ...rest, worksheetName: worksheetObj?.name || c.worksheet };
    });
    localStorage.setItem('dashagent_viz_configs', JSON.stringify(configsToSave));
  }
  
  // Load viz configs from localStorage
  loadVizConfigs(dashboard: any): void {
    try {
      const saved = localStorage.getItem('dashagent_viz_configs');
      if (saved) {
        const configs = JSON.parse(saved);
        if (dashboard) {
          this.currentVizConfigs = configs.map((c: any) => {
            const ws = dashboard.worksheets.find((w: any) => w.name === (c.worksheetName || c.worksheet));
            return { ...c, worksheetObj: ws };
          }).filter((c: any) => c.worksheetObj);
        }
      }
    } catch (e) {
      console.log('Could not load viz configs:', e);
    }
  }
  
  // Clear visualizations
  clearVisualizations(): void {
    this.currentVizConfigs = [];
    this.generatedHtml = '';
    this.dashboardBaseHtml = '';
    for (const listener of this.vizEventListeners) {
      try { listener.unregister(); } catch (e) {}
    }
    this.vizEventListeners = [];
    localStorage.removeItem('dashagent_viz_configs');
  }
}

// Export singleton instance
export const appState = new AppState();

// Export for direct access to settings
export const settings = appState.settings;
