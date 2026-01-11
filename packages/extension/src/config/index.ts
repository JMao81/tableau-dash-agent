/**
 * DashAgent Config Main Entry Point
 * 
 * This is the main entry point for the refactored config.html JavaScript.
 * Import this file to get access to all DashAgent functionality.
 */

// Import app to auto-initialize on DOMContentLoaded
import './app';

// Re-export all types
export * from './types';

// Re-export state management
export { appState, AppState } from './state';

// Re-export utilities
export * from './utils';

// Re-export LLM client
export { callLLM } from './llm-client';

// Re-export MCP client
export { 
  connectMCP, 
  sendMcpRequest, 
  sendChatToMCP, 
  sendMcpResponse
} from './mcp-client';

// Re-export renderers (explicit to avoid conflicts)
export {
  renderVisualization,
  renderBarChart,
  renderHorizontalBarChart,
  renderPieChart,
  renderDonutChart,
  renderLineChart,
  renderAreaChart,
  renderKPICard,
  renderMetricCards,
  renderDataTable,
  setTooltipsEnabled,
  COLOR_SCHEMES,
  getDefaultTheme
} from './renderers';

// Import for initialization
import { appState } from './state';
import { setTooltipsEnabled } from './renderers';
import type { DashboardContext } from './types';

/**
 * Initialize DashAgent
 * Call this when the extension loads
 */
export async function initDashAgent(): Promise<void> {
  console.log('[DashAgent] Initializing...');
  
  // Load saved settings from localStorage
  const savedSettings = localStorage.getItem('dashagent_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      Object.assign(appState.settings, parsed);
    } catch (e) {
      console.warn('[DashAgent] Failed to parse saved settings:', e);
    }
  }
  
  // Set tooltip state (default true)
  setTooltipsEnabled(true);
  
  console.log('[DashAgent] Initialization complete');
}

/**
 * Get current settings
 */
export function getSettings() {
  return appState.settings;
}

/**
 * Update settings
 */
export function updateSettings(updates: Partial<typeof appState.settings>): void {
  Object.assign(appState.settings, updates);
  appState.saveSettings();
}

/**
 * Get dashboard context
 */
export function getDashboardContext() {
  return appState.dashboardContext;
}

/**
 * Update dashboard context
 */
export function updateDashboardContext(context: Partial<DashboardContext>): void {
  if (appState.dashboardContext) {
    Object.assign(appState.dashboardContext, context);
  } else {
    appState.dashboardContext = context as DashboardContext;
  }
}

/**
 * Clear all state and reset
 */
export function resetDashAgent(): void {
  appState.clearConversation();
  appState.clearVisualizations();
  console.log('[DashAgent] State reset');
}
