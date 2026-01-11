/**
 * Tool Router - Dynamic tool selection with caching
 * 
 * Instead of sending all 37+ tools to the LLM (50-100K tokens),
 * we classify the request intent and only send relevant tools (5-15K tokens).
 * 
 * ARCHITECTURE:
 * 1. Classify intent from user message (lightweight, no LLM needed)
 * 2. Return only tools relevant to that intent category
 * 3. Cache converted tool formats (OpenAI/Anthropic) for reuse
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/index.js';

// ==================== TOOL CATEGORIES ====================
// Each category maps intent patterns to the tools needed

export type ToolCategory = 
  | 'vision'      // Design review with images
  | 'dashboard'   // Build/render dashboards
  | 'analysis'    // Data analysis
  | 'interaction' // Filters, parameters
  | 'workbook'    // Download/modify/publish
  | 'utility'     // Connection, clear canvas
  | 'core';       // Default subset for general queries

const TOOL_CATEGORIES: Record<ToolCategory, string[]> = {
  // Vision/Design - requires screenshot, pure analysis
  vision: [
    'analyze-design',
    'analyze-iron-viz-style', 
    'analyze-color-harmony',
    'suggest-annotations',
    'get-dashboard-screenshot',  // Needed to capture screenshots for design analysis
  ],
  
  // Dashboard building - create visualizations
  dashboard: [
    'build-dashboard',
    'render-visualization',
    'transform-to-story',
    'clear-visualization',
    'toggle-tooltips',
    'generate-tableau-palette',
    'render-component',
  ],
  
  // Data analysis - work with Tableau data
  analysis: [
    'analyze-dashboard-smart',
    'full-data-exploration',
    'get-analysis-strategy',
    'get-worksheet-data',
    'interpret-concentration',
    'interpret-segments',
    'profile-data-for-visualization',
    'agentic-analyst',
  ],
  
  // Tableau interaction - filters, parameters
  interaction: [
    'apply-filter',
    'set-parameter',
    'get-dashboard-screenshot',
  ],
  
  // Workbook management - download/modify/publish
  workbook: [
    'download-workbook',
    'modify-workbook',
    'publish-workbook',
    'apply-design-recommendations',
    'parse-workbook-xml',
    'generate-documentation',
  ],
  
  // Utility - basic operations
  utility: [
    'check-connection',
    'clear-canvas',
  ],
  
  // Core - default subset for general/unclear queries
  core: [
    'analyze-dashboard-smart',
    'agentic-analyst',
    'build-dashboard',
    'apply-filter',
    'check-connection',
    'get-worksheet-data',
    'render-visualization',
    'clear-canvas',
  ],
};

// ==================== INTENT CLASSIFICATION ====================
// Fast regex-based classification (no LLM call needed)

interface IntentMatch {
  category: ToolCategory;
  confidence: number;
}

const INTENT_PATTERNS: Array<{ pattern: RegExp; category: ToolCategory; weight: number }> = [
  // Vision/Design patterns (high priority when image present)
  { pattern: /design.*analy|analy.*design|ux.*review|ui.*review/i, category: 'vision', weight: 0.95 },  // "design analysis" - high priority
  { pattern: /review.*dashboard|critique|feedback|assess|evaluate|audit/i, category: 'vision', weight: 0.8 },
  { pattern: /iron.?viz|competition|design.*score/i, category: 'vision', weight: 0.9 },
  { pattern: /color.*harmon|palette.*analy|accessibility|colorblind/i, category: 'vision', weight: 0.85 },
  { pattern: /look.*at.*dashboard|check.*design|design.*improvement|what.*wrong/i, category: 'vision', weight: 0.85 },
  
  // Dashboard building patterns (high priority to ensure build-dashboard is called)
  { pattern: /build.*dashboard|create.*dashboard|generate.*dashboard|make.*dashboard/i, category: 'dashboard', weight: 0.95 },
  { pattern: /redesign|improve.*dashboard|new.*dashboard|design.*dashboard/i, category: 'dashboard', weight: 0.95 },
  { pattern: /render|display|show.*chart|visualization/i, category: 'dashboard', weight: 0.8 },
  { pattern: /kpi.*dashboard|executive.*dashboard|dashboard.*kpi/i, category: 'dashboard', weight: 0.9 },
  { pattern: /top.*\d+|horizontal.*bar|bar.*chart|pie.*chart/i, category: 'dashboard', weight: 0.85 },
  
  // Color palette generation patterns (high priority)
  { pattern: /color.*palette|generate.*color|recommend.*color|suggest.*color|color.*scheme/i, category: 'dashboard', weight: 0.95 },
  { pattern: /what.*color|pick.*color|choose.*color|corporate.*color|brand.*color/i, category: 'dashboard', weight: 0.9 },
  { pattern: /theme.*color|professional.*color|finance.*color|tech.*color/i, category: 'dashboard', weight: 0.9 },
  
  // Story/Narrative patterns (differentiate from Tableau Story)
  // NOTE: "Tableau Story" should NOT trigger transform-to-story
  { pattern: /transform.*story|convert.*story|turn.*into.*story/i, category: 'dashboard', weight: 0.95 },
  { pattern: /tell.*story|data.*story|story.*telling|storytelling/i, category: 'dashboard', weight: 0.9 },
  { pattern: /narrative|summarize|explain.*metric|interpret.*data/i, category: 'dashboard', weight: 0.85 },
  { pattern: /key.*takeaway|insight|readable.*format|executive.*summary/i, category: 'dashboard', weight: 0.8 },
  
  // Analysis patterns
  { pattern: /analyze|analysis|insight|trend|pattern/i, category: 'analysis', weight: 0.7 },
  { pattern: /concentration|pareto|80.?20/i, category: 'analysis', weight: 0.9 },
  { pattern: /segment|breakdown|by.*region|by.*category/i, category: 'analysis', weight: 0.8 },
  { pattern: /which.*has.*highest|top.*perform/i, category: 'analysis', weight: 0.85 },
  { pattern: /profile|explore.*data|statistics/i, category: 'analysis', weight: 0.75 },
  
  // Agentic workflow patterns (high priority for orchestration requests)
  { pattern: /agentic|full.*analysis|complete.*workflow/i, category: 'analysis', weight: 0.95 },
  { pattern: /understand.*and.*analyze|analyze.*and.*recommend/i, category: 'analysis', weight: 0.9 },
  { pattern: /end.?to.?end|workflow|orchestrat/i, category: 'analysis', weight: 0.85 },
  { pattern: /what.*should.*i.*do|recommend.*action|next.*step/i, category: 'analysis', weight: 0.8 },
  
  // Interaction patterns
  { pattern: /filter|set.*filter|apply.*filter/i, category: 'interaction', weight: 0.9 },
  { pattern: /parameter|set.*param/i, category: 'interaction', weight: 0.9 },
  { pattern: /screenshot|capture|snapshot/i, category: 'interaction', weight: 0.8 },
  
  // Workbook patterns
  { pattern: /download|fetch.*workbook|get.*workbook/i, category: 'workbook', weight: 0.9 },
  { pattern: /publish|upload|save.*to.*server/i, category: 'workbook', weight: 0.9 },
  { pattern: /modify|change.*workbook|update.*xml/i, category: 'workbook', weight: 0.85 },
  { pattern: /document|documentation|describe.*dashboard/i, category: 'workbook', weight: 0.8 },
  
  // Utility patterns
  { pattern: /connect|check.*connection|status/i, category: 'utility', weight: 0.9 },
  { pattern: /clear|reset|clean/i, category: 'utility', weight: 0.7 },
];

/**
 * Negative patterns - if matched, BLOCK specific categories
 * Used to disambiguate similar phrases (e.g., "Tableau Story" vs "transform-to-story")
 */
const NEGATIVE_PATTERNS: Array<{ pattern: RegExp; blockedCategories: ToolCategory[] }> = [
  // "Tableau Story" is a Tableau feature for presentation, NOT our transform-to-story tool
  { pattern: /tableau.*story|story.*point|storypoint/i, blockedCategories: ['dashboard'] },
  // "Published dashboard" queries should not trigger build-dashboard
  { pattern: /publish|published.*dashboard|server.*dashboard/i, blockedCategories: ['dashboard'] },
];

/**
 * Classify user message intent to determine which tool category to use
 */
function classifyIntent(message: string, hasImage: boolean): IntentMatch[] {
  const matches: IntentMatch[] = [];
  
  // Check for negative patterns first
  const blockedCategories = new Set<ToolCategory>();
  for (const { pattern, blockedCategories: blocked } of NEGATIVE_PATTERNS) {
    if (pattern.test(message)) {
      blocked.forEach(cat => blockedCategories.add(cat));
    }
  }
  
  for (const { pattern, category, weight } of INTENT_PATTERNS) {
    if (pattern.test(message)) {
      // Skip if this category is blocked by negative patterns
      if (blockedCategories.has(category)) {
        console.log(`[ToolRouter] Category '${category}' blocked by negative pattern`);
        continue;
      }
      
      // Boost vision category if we have an image
      const confidence = (category === 'vision' && hasImage) 
        ? Math.min(weight + 0.15, 1.0)
        : weight;
      
      matches.push({ category, confidence });
    }
  }
  
  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}

/**
 * Get tool categories for a request
 * Returns primary category + any secondary categories that might be needed
 */
export function getCategoriesForRequest(message: string, hasImage: boolean): ToolCategory[] {
  const matches = classifyIntent(message, hasImage);
  
  if (matches.length === 0) {
    // No clear match - use core subset
    return ['core'];
  }
  
  const categories: ToolCategory[] = [];
  const primaryCategory = matches[0].category;
  categories.push(primaryCategory);
  
  // Add secondary categories if confidence is high enough
  for (let i = 1; i < matches.length && i < 2; i++) {
    if (matches[i].confidence >= 0.7) {
      categories.push(matches[i].category);
    }
  }
  
  // If user has an image AND is talking about design/dashboard, include vision tools
  // This allows analyze-design to be available when they have a screenshot
  if (hasImage && !categories.includes('vision')) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('design') || lowerMessage.includes('dashboard') || 
        lowerMessage.includes('look') || lowerMessage.includes('screenshot') ||
        lowerMessage.includes('image') || lowerMessage.includes('review')) {
      categories.push('vision');
    }
  }
  
  // Always include utility for basic operations
  if (!categories.includes('utility')) {
    categories.push('utility');
  }
  
  return categories;
}

// ==================== TOOL FILTERING ====================

/**
 * Get tools for specific categories
 */
export function getToolsForCategories(categories: ToolCategory[]): Tool[] {
  const toolNames = new Set<string>();
  
  for (const category of categories) {
    const categoryTools = TOOL_CATEGORIES[category] || [];
    for (const toolName of categoryTools) {
      toolNames.add(toolName);
    }
  }
  
  return tools.filter(tool => toolNames.has(tool.name));
}

/**
 * Get tools for a specific request (main entry point)
 */
export function getToolsForRequest(message: string, hasImage: boolean): Tool[] {
  const categories = getCategoriesForRequest(message, hasImage);
  console.error(`[Tool Router] Categories: ${categories.join(', ')} for: "${message.substring(0, 50)}..."`);
  return getToolsForCategories(categories);
}

// ==================== CACHED TOOL FORMATS ====================
// Cache converted tool formats to avoid repeated conversion

interface CachedToolSet {
  tools: Tool[];
  openai: any[];
  anthropic: any[];
  hash: string;
}

const toolCache = new Map<string, CachedToolSet>();

function hashToolNames(tools: Tool[]): string {
  return tools.map(t => t.name).sort().join(',');
}

/**
 * Get tools in OpenAI format with caching
 */
export function getOpenAIToolsForRequest(message: string, hasImage: boolean): any[] {
  const filteredTools = getToolsForRequest(message, hasImage);
  const hash = hashToolNames(filteredTools);
  
  // Check cache
  const cached = toolCache.get(hash);
  if (cached && cached.openai) {
    console.error(`[Tool Router] Cache HIT - ${filteredTools.length} tools`);
    return cached.openai;
  }
  
  // Convert to OpenAI format
  console.error(`[Tool Router] Cache MISS - converting ${filteredTools.length} tools`);
  const openaiTools = filteredTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
  
  // Cache the result
  toolCache.set(hash, {
    tools: filteredTools,
    openai: openaiTools,
    anthropic: [],
    hash,
  });
  
  return openaiTools;
}

/**
 * Get tools in Anthropic format with caching
 */
export function getAnthropicToolsForRequest(message: string, hasImage: boolean): any[] {
  const filteredTools = getToolsForRequest(message, hasImage);
  const hash = hashToolNames(filteredTools);
  
  // Check cache
  const cached = toolCache.get(hash);
  if (cached && cached.anthropic && cached.anthropic.length > 0) {
    console.error(`[Tool Router] Cache HIT - ${filteredTools.length} tools`);
    return cached.anthropic;
  }
  
  // Convert to Anthropic format
  console.error(`[Tool Router] Cache MISS - converting ${filteredTools.length} tools`);
  const anthropicTools = filteredTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
  
  // Update cache
  const existing = toolCache.get(hash);
  if (existing) {
    existing.anthropic = anthropicTools;
  } else {
    toolCache.set(hash, {
      tools: filteredTools,
      openai: [],
      anthropic: anthropicTools,
      hash,
    });
  }
  
  return anthropicTools;
}

/**
 * Get all tools (for MCP protocol discovery - not for LLM calls)
 */
export function getAllTools(): Tool[] {
  return tools;
}

/**
 * Get available tools in simplified format (for UI display)
 */
export function getAvailableTools(): { name: string; description: string }[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
  }));
}

/**
 * Clear the tool cache (useful for testing)
 */
export function clearToolCache(): void {
  toolCache.clear();
}

// ==================== STATS ====================

export function getRouterStats(): { 
  totalTools: number; 
  categories: Record<string, number>;
  cacheSize: number;
} {
  const categoryStats: Record<string, number> = {};
  for (const [category, toolNames] of Object.entries(TOOL_CATEGORIES)) {
    categoryStats[category] = toolNames.length;
  }
  
  return {
    totalTools: tools.length,
    categories: categoryStats,
    cacheSize: toolCache.size,
  };
}
