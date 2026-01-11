/**
 * MCP Tools - UNIFIED Tool definitions and handlers
 * 
 * ARCHITECTURE: All tools live here in the MCP server.
 * Extension is a thin client that handles:
 * - Tableau API calls (data extraction, filters, parameters)
 * - HTML rendering
 * - Screenshot capture
 * 
 * TOOL CATEGORIES (26 tools total):
 * 
 * 📊 DATA ANALYSIS (6 tools):
 * - analyze-dashboard-smart: Primary analysis tool with 5 modes
 * - full-data-exploration: Comprehensive data science analysis
 * - profile-data-for-visualization: Pre-viz data profiling
 * - get-worksheet-data: Get data from worksheets
 * - get-analysis-strategy: Query optimization for Tableau MCP
 * - get-semantic-metadata: Datasource metadata
 * 
 * 🎯 INTERPRETATION (2 tools):
 * - interpret-concentration: Pareto/80-20 analysis
 * - interpret-segments: Segment comparison
 * 
 * 📈 VISUALIZATION (5 tools):
 * - build-dashboard: Create complete dashboards
 * - render-visualization: Render single charts
 * - transform-to-story: Add storytelling elements
 * - toggle-tooltips: Toggle chart tooltips
 * - confirm-chart-fields: Validate fields before rendering
 * 
 * 🎨 DESIGN (5 tools):
 * - analyze-design: Vision AI design review
 * - analyze-iron-viz-style: Iron Viz competition scoring
 * - analyze-color-harmony: Color palette analysis
 * - generate-tableau-palette: Create Tableau color palettes
 * - suggest-annotations: Annotation recommendations
 * 
 * 🔧 INTERACTION (3 tools):
 * - apply-filter: Apply worksheet filters
 * - set-parameter: Set Tableau parameters
 * - get-dashboard-screenshot: Capture screenshots
 * 
 * 📄 DOCUMENTATION (1 tool):
 * - generate-documentation: Create dashboard docs
 * 
 * 🛠️ UTILITY (4 tools):
 * - check-connection: Check extension connection
 * - clear-canvas: Clear extension canvas
 * - render-component: Render custom HTML
 * - agentic-analyst: AI workflow orchestrator
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketBridge } from '../websocket-bridge.js';
import {
  ANALYSIS_STRATEGIES,
  generateAnalysisInstructions,
  interpretConcentration,
  interpretSegmentComparison,
} from '../analysis/query-recipes.js';

// Optional TWB helper module (refactor placeholder)
// import { parseWorkbookXml, getWorkbookSummary } from '../twb/index.js';

// ==================== CACHED SCREENSHOT ====================
// Store screenshot temporarily to avoid passing huge base64 through LLM context
let cachedScreenshot: { image: string; timestamp: number } | null = null;
const SCREENSHOT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function setCachedScreenshot(image: string): void {
  cachedScreenshot = { image, timestamp: Date.now() };
}

function getCachedScreenshotImage(): string | null {
  if (!cachedScreenshot) return null;
  if (Date.now() - cachedScreenshot.timestamp > SCREENSHOT_CACHE_TTL) {
    cachedScreenshot = null;
    return null;
  }
  return cachedScreenshot.image;
}

// ==================== CACHED API KEYS ====================
// Store API keys and vision model from extension for use in tool handlers (e.g., vision calls)
interface VisionModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

interface CachedApiKeys {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  visionModelConfig?: VisionModelConfig;  // User-selected vision model
  timestamp: number;
}
let cachedApiKeys: CachedApiKeys | null = null;
const API_KEY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function setCachedApiKeys(openaiKey?: string, anthropicKey?: string, visionConfig?: VisionModelConfig): void {
  cachedApiKeys = {
    openaiApiKey: openaiKey,
    anthropicApiKey: anthropicKey,
    visionModelConfig: visionConfig,
    timestamp: Date.now(),
  };
}

function getCachedApiKey(provider: 'openai' | 'anthropic'): string | null {
  if (!cachedApiKeys) return null;
  if (Date.now() - cachedApiKeys.timestamp > API_KEY_CACHE_TTL) {
    cachedApiKeys = null;
    return null;
  }
  return provider === 'openai' ? cachedApiKeys.openaiApiKey || null : cachedApiKeys.anthropicApiKey || null;
}

function getCachedVisionModel(): VisionModelConfig | null {
  if (!cachedApiKeys?.visionModelConfig) return null;
  if (Date.now() - cachedApiKeys.timestamp > API_KEY_CACHE_TTL) {
    return null;
  }
  return cachedApiKeys.visionModelConfig;
}

// ==================== TOOL DEFINITIONS ====================
export const tools: Tool[] = [
  // ==================== TABLEAU MCP INTEGRATION TOOLS ====================
  {
    name: 'get-analysis-strategy',
    description: `Get an optimized analysis strategy with pre-built query templates for Tableau MCP.

IMPORTANT: Use this instead of pulling raw data! Returns efficient aggregation queries for Tableau MCP's query-datasource tool.

Available strategies:
- quick-profile: Fast overview with key statistics (~450 tokens)
- concentration-analysis: Find if few items dominate (80/20 rule) (~250 tokens)
- segment-deep-dive: Compare performance across categories (~350 tokens)
- trend-analysis: Analyze performance over time (~250 tokens)
- anomaly-scan: Find unusual patterns (~300 tokens)

Returns ready-to-use query templates that leverage Tableau's aggregation engine.`,
    inputSchema: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          enum: ['quick-profile', 'concentration-analysis', 'segment-deep-dive', 'trend-analysis', 'anomaly-scan'],
          description: 'The type of analysis to perform',
        },
        datasourceLuid: {
          type: 'string',
          description: 'The LUID of the Tableau datasource (from mcp_tableau_list-datasources)',
        },
        measures: {
          type: 'array',
          items: { type: 'string' },
          description: 'Measure field names to analyze (e.g., ["Sales", "Profit"])',
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimension field names to analyze (e.g., ["Category", "Region"])',
        },
        dateFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Date field names for time analysis (e.g., ["Order Date"])',
        },
      },
      required: ['strategy'],
    },
  },
  {
    name: 'interpret-concentration',
    description: 'Interpret concentration/Pareto analysis results from Tableau MCP queries. Pass in results from a TOP N query and grand total to get insights about concentration risk.',
    inputSchema: {
      type: 'object',
      properties: {
        topNData: {
          type: 'array',
          items: { type: 'object' },
          description: 'Results from a TOP N query (array of objects with dimension and measure values)',
        },
        grandTotal: {
          type: 'number',
          description: 'The grand total of the measure (from a SUM query)',
        },
        measureField: {
          type: 'string',
          description: 'Name of the measure field analyzed',
        },
        dimensionField: {
          type: 'string',
          description: 'Name of the dimension field analyzed',
        },
      },
      required: ['topNData', 'grandTotal', 'measureField', 'dimensionField'],
    },
  },
  {
    name: 'interpret-segments',
    description: 'Interpret segment comparison results from Tableau MCP queries. Pass in results from a segment aggregation query to get insights about performance variance.',
    inputSchema: {
      type: 'object',
      properties: {
        segmentData: {
          type: 'array',
          items: { type: 'object' },
          description: 'Results from a segment comparison query (array of objects)',
        },
        measureField: {
          type: 'string',
          description: 'Name of the measure field analyzed',
        },
        segmentField: {
          type: 'string',
          description: 'Name of the segment/dimension field',
        },
      },
      required: ['segmentData', 'measureField', 'segmentField'],
    },
  },
  {
    name: 'get-semantic-metadata',
    description: `Fetch rich semantic layer metadata from Tableau MCP for a datasource. Returns field types, roles, data categories, descriptions, calculated field formulas, and parameters.

Use this to understand the datasource schema before running analysis queries. The metadata includes:
- Field names, data types (STRING, INTEGER, REAL, DATE, etc.)
- Roles (DIMENSION, MEASURE)
- Data categories (NOMINAL, ORDINAL, QUANTITATIVE)
- Calculated field formulas
- Parameters with min/max/step values

This enriches the analysis by providing proper field classification.`,
    inputSchema: {
      type: 'object',
      properties: {
        datasourceLuid: {
          type: 'string',
          description: 'The LUID of the datasource (get from mcp_tableau_list-datasources)',
        },
        datasourceName: {
          type: 'string',
          description: 'Optional: datasource name to search for if LUID unknown',
        },
      },
    },
  },

  // ==================== AGENTIC ORCHESTRATION TOOL ====================
  {
    name: 'agentic-analyst',
    description: `High-level orchestration tool for AI-driven dashboard analysis workflow.

This tool returns a structured plan that guides you through the complete agentic analyst workflow:
1. UNDERSTAND: Get dashboard context and datasource metadata
2. ANALYZE: Profile data, find patterns, detect anomalies
3. RECOMMEND: Generate actionable insights
4. REDESIGN (optional): Propose improved visualizations

WORKFLOW MODES:
- full-analysis: Complete understand → analyze → recommend flow (~3-5 tool calls)
- quick-insights: Fast profiling with immediate recommendations (~2-3 tool calls)
- design-critique: Analyze current design and suggest improvements (~2-3 tool calls)
- redesign: Full analysis plus new dashboard generation (~5-7 tool calls)

Returns a step-by-step execution plan with the exact tools to call in sequence.`,
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['full-analysis', 'quick-insights', 'design-critique', 'redesign'],
          description: 'The workflow mode to execute',
          default: 'full-analysis',
        },
        focusArea: {
          type: 'string',
          description: 'Optional focus area (e.g., "sales performance", "customer segments", "regional trends")',
        },
        includeDesignReview: {
          type: 'boolean',
          description: 'Whether to include visual design analysis (requires screenshot)',
          default: false,
        },
      },
      required: ['mode'],
    },
  },

  // ==================== DESIGN ANALYSIS TOOLS ====================
  {
    name: 'analyze-design',
    description: `Analyze a dashboard screenshot using vision AI to identify design issues and suggest improvements.

**TRIGGER PHRASES (use this tool when user says):**
- "review my dashboard design"
- "what's wrong with my dashboard"
- "how can I improve my dashboard"
- "check my dashboard"
- "design feedback"
- "design improvements"
- "analyze the screenshot"
- "look at my dashboard"
- "what do you see"
- "analyze this"
- "give me feedback"

**REQUIRES:** A screenshot must be captured first via "Capture Screen" button or dropped into the extension.

IMAGE SOURCE OPTIONS:
1. User drops a screenshot in the extension (default)
2. Provide viewId to fetch from Tableau Cloud/Server via Tableau MCP

ANALYSIS TYPES:
- design-review: UX/UI issues, layout, color usage, chart selection
- storytelling: Data narrative, insights clarity, audience focus
- accessibility: Color contrast, text size, screen reader compatibility
- shelf-detection: Extract Rows/Columns/Marks shelf configurations

**AFTER CALLING:** Provide specific, actionable design recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Additional context or specific aspects to analyze (e.g., "focus on color accessibility", "check if the story is clear")',
        },
        analysisType: {
          type: 'string',
          enum: ['design-review', 'storytelling', 'accessibility', 'shelf-detection', 'general'],
          description: 'Type of analysis to perform',
          default: 'design-review',
        },
        viewId: {
          type: 'string',
          description: 'Optional: Tableau view ID to fetch image from Tableau Cloud/Server. If not provided, uses the screenshot dropped in the extension.',
        },
      },
    },
  },
  {
    name: 'get-dashboard-screenshot',
    description: `Get a screenshot of a Tableau dashboard or view for analysis.

Use this to capture the current state of a dashboard for design review.
Returns the image that can then be analyzed with analyze-design tool.

SOURCES:
- From dropped screenshot in extension (if available)
- From Tableau Cloud/Server via viewId (requires Tableau MCP connection)`,
    inputSchema: {
      type: 'object',
      properties: {
        viewId: {
          type: 'string',
          description: 'Tableau view ID to fetch from Tableau Cloud/Server. If not provided, returns the screenshot dropped in the extension.',
        },
      },
    },
  },



  // ==================== UTILITY TOOLS ====================
  {
    name: 'check-connection',
    description: 'Check if a Tableau Extension is connected to the MCP server',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clear-canvas',
    description: 'Clear all rendered content from the extension canvas',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'render-component',
    description: 'Render an HTML component in the Tableau Extension. For custom HTML content not covered by other tools.',
    inputSchema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description: 'The HTML content to render in the extension canvas',
        },
        append: {
          type: 'boolean',
          description: 'If true, append to existing content. If false, replace all content.',
          default: false,
        },
      },
      required: ['html'],
    },
  },

  // ==================== DATA ANALYSIS TOOLS ====================
  {
    name: 'analyze-dashboard-smart',
    description: `PRIMARY TOOL for data analysis. Analyzes connected Tableau dashboard data.

**TRIGGER PHRASES (use this tool when user says):**
- "analyze this dashboard"
- "what are the key metrics"
- "show me insights"
- "which X has the highest Y"
- "break down by..."
- "top performers"
- "compare segments"
- "find patterns"
- "80/20 analysis"
- "concentration analysis"
- "trend analysis"
- "what's the data telling me"

**Returns data from ALL worksheets** when no specific worksheet is specified.
This enables analysis across Summary, Detail, Timeline, and other views.

**CHOOSE THE RIGHT ANALYSIS TYPE:**

| User Question | analysisGoal | focusMeasures | focusDimensions |
|---------------|--------------|---------------|-----------------|
| "Analyze the dashboard" | quick-profile | - | - |
| "Which X has highest Y" | segment-deep-dive | ["Y"] | ["X"] |
| "Y by X" or "break down Y by X" | segment-deep-dive | ["Y"] | ["X"] |
| "Show concentration" | concentration-analysis | - | - |
| "Trends over time" | trend-analysis | - | - |
| "Find outliers" | anomaly-scan | - | - |

**Example: "Which Region has the highest Sales?"**
→ analysisGoal: "segment-deep-dive"
→ focusMeasures: ["Sales"]  
→ focusDimensions: ["Region"]`,
    inputSchema: {
      type: 'object',
      properties: {
        analysisGoal: {
          type: 'string',
          enum: ['quick-profile', 'concentration-analysis', 'segment-deep-dive', 'trend-analysis', 'anomaly-scan'],
          description: 'Type of analysis to perform',
        },
        worksheet: {
          type: 'string',
          description: 'Optional: specific worksheet name to analyze. If omitted, analyzes ALL worksheets.',
        },
        focusMeasures: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to analyze, e.g., ["Sales", "Open Rate"]',
        },
        focusDimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions to break down by, e.g., ["Region", "Program Name"]',
        },
        forceRefresh: {
          type: 'boolean',
          description: 'Force fresh data extraction, bypassing cache',
          default: false,
        },
      },
      required: ['analysisGoal'],
    },
  },
  {
    name: 'full-data-exploration',
    description: `COMPREHENSIVE data exploration for data scientists. Creates an in-depth statistical analysis report.

Includes:
- Field profiling (types, nulls, distributions)
- Statistical analysis (correlations, regressions)
- Data quality assessment
- Outlier detection (IQR method)
- Concentration analysis (Gini coefficient)
- Seasonality detection
- Key driver analysis

Returns a detailed Markdown report suitable for data scientists.`,
    inputSchema: {
      type: 'object',
      properties: {
        analysisDepth: {
          type: 'string',
          enum: ['quick', 'standard', 'comprehensive'],
          description: 'Depth: quick (5-10s), standard (15-20s), comprehensive (30s+)',
          default: 'standard',
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string', enum: ['profiling', 'correlations', 'quality', 'outliers', 'distributions', 'trends', 'drivers'] },
          description: 'Specific areas to focus on. Default: all',
        },
        targetMeasure: {
          type: 'string',
          description: 'Primary measure for driver analysis',
        },
      },
    },
  },
  {
    name: 'profile-data-for-visualization',
    description: `Profile worksheet data before visualization to understand structure, quality, and best chart approach.

Returns:
- Field classification (dimension vs measure, date vs categorical)
- Distribution statistics (min, max, avg, median)
- Data quality (nulls, duplicates, outliers)
- Recommended chart types
- Pre-flight warnings

**Best Practice:** Call this BEFORE render-visualization.`,
    inputSchema: {
      type: 'object',
      properties: {
        worksheet: {
          type: 'string',
          description: 'Name of the worksheet to profile',
        },
        focusMeasure: {
          type: 'string',
          description: 'Specific measure to focus on',
        },
        focusDimension: {
          type: 'string',
          description: 'Specific dimension to focus on',
        },
        intendedVizType: {
          type: 'string',
          enum: ['bar', 'line', 'area', 'pie', 'donut', 'table', 'kpi', 'auto'],
          description: 'Intended chart type for compatibility check',
        },
      },
      required: ['worksheet'],
    },
  },
  {
    name: 'get-worksheet-data',
    description: `Get data from a Tableau worksheet with structure analysis.

Returns:
- Column names and data types
- Sample rows
- Data quality flags (timestamps, duplicates, suggested aggregation)`,
    inputSchema: {
      type: 'object',
      properties: {
        worksheet: {
          type: 'string',
          description: 'Name of the worksheet',
        },
        maxRows: {
          type: 'number',
          description: 'Maximum rows to return',
          default: 100,
        },
      },
      required: ['worksheet'],
    },
  },

  // ==================== VISUALIZATION TOOLS ====================
  {
    name: 'build-dashboard',
    description: `Create a professional dashboard with KPIs, insights, and charts.

**TRIGGER PHRASES (use this tool when user says):**
- "build a dashboard"
- "create a dashboard"
- "redesign my dashboard"
- "make me a dashboard"
- "executive dashboard" or "KPI dashboard"
- "dashboard with insights" ← INCLUDE INSIGHTS!
- "smart dashboard"

**⚠️ FOR "STORY" OR "NARRATIVE" REQUESTS:**
- If user says "transform to story", "story mode", "narrative summary" → use transform-to-story tool
- If user says "dashboard with insights" or "executive dashboard" → use THIS tool with includeInsights: true

**CHART TYPES:**
- This tool auto-detects: categorical → bar charts, date/time → line charts
- For explicit line/area/table: Use render-visualization separately with append: true

**MODES:**
- full: KPIs + insights + charts (DEFAULT - includes auto-generated insights!)
- executive: Hero headline + key takeaway + KPIs + insights (great for executives)
- analytical: Detailed breakdowns with all metrics
- compact: Clean, minimal design (KPIs only)

**INSIGHT PARAMETERS:**
- includeInsights: true (default) - Auto-generate data insights (concentration, trends, anomalies)
- includeHero: true (default) - Show hero headline with dashboard title
- keyTakeaway: "Custom key insight text" - Override auto-generated takeaway

**EXAMPLE - FULL DASHBOARD WITH INSIGHTS:**
{
  "title": "Email Campaign Performance",
  "mode": "full",
  "includeInsights": true,
  "labelOverrides": { "AGG(Open Rate)": "Open Rate" },
  "theme": "professional"
}

**EXAMPLE - EXECUTIVE OVERVIEW:**
{
  "title": "Q4 Performance Summary",
  "mode": "executive",
  "includeInsights": true,
  "includeHero": true,
  "keyTakeaway": "Revenue up 15% YoY driven by enterprise segment"
}

**AFTER CALLING:** Tell the user "Check the Preview tab to see your dashboard."`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'REQUIRED: Dashboard title',
        },
        mode: {
          type: 'string',
          enum: ['full', 'executive', 'analytical', 'compact'],
          description: 'Dashboard mode: full (with insights), executive (hero+KPIs+insights), analytical (detailed), compact (KPIs only)',
          default: 'full',
        },
        includeInsights: {
          type: 'boolean',
          description: 'Include auto-generated insights (concentration, trends, anomalies)',
          default: true,
        },
        includeHero: {
          type: 'boolean',
          description: 'Include hero headline section',
          default: true,
        },
        heroTitle: {
          type: 'string',
          description: 'Custom hero title (defaults to dashboard title)',
        },
        heroSubtitle: {
          type: 'string',
          description: 'Custom hero subtitle',
        },
        keyTakeaway: {
          type: 'string',
          description: 'Custom key takeaway text (overrides auto-generated)',
        },
        theme: {
          type: 'string',
          enum: ['professional', 'modern', 'minimal', 'colorful', 'blue', 'green', 'purple', 'corporate', 'story'],
          description: 'Visual theme',
          default: 'professional',
        },
        customColors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom hex colors',
        },
        worksheet: {
          type: 'string',
          description: 'Specific worksheet to focus on',
        },
        focusMetrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to highlight',
        },
        focusDimension: {
          type: 'string',
          description: 'Dimension to break down by',
        },
        maxMetrics: {
          type: 'number',
          description: 'Maximum KPI cards',
          default: 6,
        },
        maxItems: {
          type: 'number',
          description: 'Maximum items per chart',
          default: 7,
        },
        labelOverrides: {
          type: 'object',
          description: 'REQUIRED: Map field names to labels',
        },
      },
      required: ['title', 'labelOverrides'],
    },
  },
  {
    name: 'render-visualization',
    description: `Render a SINGLE interactive chart from Tableau data in the Preview tab.

**TRIGGER PHRASES - TIME SERIES (vizType: "line" or "area"):**
- "time series"
- "trend chart"
- "line chart"
- "show me trends"
- "over time"
- "by date"
- "historical chart"
- "area chart"

**TRIGGER PHRASES - DATA TABLES (vizType: "table"):**
- "data table"
- "show me a table"
- "table of top 10"
- "list the data"
- "tabular view"

**TRIGGER PHRASES - BAR CHARTS (vizType: "horizontal-bar" or "bar"):**
- "show me a chart"
- "bar chart"
- "top 10 by..."
- "show me top performers"

**⚠️ CRITICAL VIZTYPE SELECTION:**
| User Request                | vizType to Use   |
|-----------------------------|------------------|
| "time series" / "trends"    | "line" or "area" |
| "over time" / "by date"     | "line"           |
| "data table" / "table"      | "table"          |
| "top N by X"                | "horizontal-bar" |
| "bar chart"                 | "bar" or "horizontal-bar" |

**FOR COMPOSITE DASHBOARDS (KPIs + line charts + tables):**
1. First: build-dashboard with mode: "executive" (KPIs only)
2. Then: render-visualization with vizType: "line", append: true
3. Then: render-visualization with vizType: "table", append: true

**IMPORTANT:** Set append: true when adding to existing dashboard!

**AFTER RENDERING:** ALWAYS tell the user "Check the Preview tab to see your chart."

Chart types: bar, horizontal-bar, pie, donut, kpi, line, area, table, metric-cards`,
    inputSchema: {
      type: 'object',
      properties: {
        vizType: {
          type: 'string',
          enum: ['bar', 'horizontal-bar', 'pie', 'donut', 'kpi', 'line', 'area', 'table', 'metric-cards'],
          description: 'Chart type',
        },
        worksheet: {
          type: 'string',
          description: 'Worksheet to pull data from',
        },
        measureField: {
          type: 'string',
          description: 'Measure field for values',
        },
        dimensionField: {
          type: 'string',
          description: 'Dimension field for categories',
        },
        title: {
          type: 'string',
          description: 'Chart title',
        },
        colorScheme: {
          type: 'string',
          enum: ['blue', 'green', 'purple', 'orange', 'teal', 'tableau', 'categorical'],
          description: 'Color scheme',
          default: 'blue',
        },
        customColors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom hex colors',
        },
        showValues: {
          type: 'boolean',
          description: 'Show value labels',
          default: true,
        },
        maxItems: {
          type: 'number',
          description: 'Maximum items to show',
          default: 10,
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order',
          default: 'desc',
        },
        append: {
          type: 'boolean',
          description: 'Append instead of replace',
          default: false,
        },
        theme: {
          type: 'string',
          enum: ['professional', 'modern'],
          description: 'Visual theme',
          default: 'professional',
        },
        aggregateByDate: {
          type: 'boolean',
          description: 'Aggregate values by date for time series',
          default: false,
        },
        aggregationType: {
          type: 'string',
          enum: ['sum', 'average', 'count', 'max', 'min'],
          description: 'Aggregation type when aggregateByDate=true',
          default: 'sum',
        },
      },
      required: ['vizType', 'worksheet'],
    },
  },
  {
    name: 'confirm-chart-fields',
    description: `Validate dimension and measure fields before rendering.

Call this BEFORE render-visualization to:
1. Get all available fields from worksheet
2. Match user's requested fields
3. Get confirmation or corrections`,
    inputSchema: {
      type: 'object',
      properties: {
        worksheet: {
          type: 'string',
          description: 'Worksheet to get fields from',
        },
        requestedDimension: {
          type: 'string',
          description: 'Dimension user asked for',
        },
        requestedMeasure: {
          type: 'string',
          description: 'Measure user asked for',
        },
        vizType: {
          type: 'string',
          description: 'Chart type for recommendations',
        },
      },
      required: ['worksheet', 'requestedDimension', 'requestedMeasure'],
    },
  },
  {
    name: 'transform-to-story',
    description: `⚠️ **NOT TABLEAU STORY** - This tool creates a **narrative text layout** (like an executive summary) from dashboard data.

If user mentions "Tableau Story", "Story Points", or "Story tab", they are referring to Tableau's built-in Story feature - DO NOT USE this tool for that.

Transform dashboard metrics into a storytelling narrative layout with headlines, insights, and recommendations.

**TRIGGER PHRASES (use this tool when user says):**
- "tell me the story of this data"
- "what's the story here" (lowercase, not "Tableau Story")
- "create insights from this"
- "summarize the dashboard"
- "explain these metrics"
- "turn this into insights"
- "narrative view"
- "executive summary"
- "what does this data mean"
- "interpret these numbers"
- "key takeaways"
- "make this readable"

Multi-stage pipeline:
1. Data extraction (cached)
2. Analysis (cached)
3. Design generation
4. HTML rendering

Generates: Hero headline, key takeaway box, narrative flow, insight callouts, recommended actions.

**AFTER CALLING:** Tell the user "Check the Preview tab to see your narrative summary."`,
    inputSchema: {
      type: 'object',
      properties: {
        storyAngle: {
          type: 'string',
          description: 'Narrative angle: performance, comparison, trend, problem-solution, opportunity',
        },
        audience: {
          type: 'string',
          description: 'Target: executive, analyst, general, technical',
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Include action recommendations',
          default: true,
        },
        forceRefresh: {
          type: 'boolean',
          description: 'Force re-analysis even if cached',
          default: false,
        },
        designRequest: {
          type: 'string',
          description: 'Custom design request without re-analyzing',
        },
      },
    },
  },
  {
    name: 'toggle-tooltips',
    description: 'Toggle tooltips on/off for charts.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'true to enable, false to disable',
        },
      },
      required: ['enabled'],
    },
  },

  // ==================== DESIGN TOOLS ====================
  {
    name: 'analyze-iron-viz-style',
    description: `Analyze dashboard against Iron Viz competition design principles.

**TRIGGER PHRASES (use this tool when user says):**
- "Iron Viz review"
- "competition-ready"
- "rate my design"
- "score my dashboard"
- "design scorecard"
- "how does this compare to Iron Viz"

**REQUIRES:** A screenshot must be captured first.

Evaluates: visual hierarchy, color harmony, white space, typography, storytelling, custom elements.
Returns scorecard with improvement suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        screenshotBase64: {
          type: 'string',
          description: 'Base64 screenshot. If not provided, uses dropped image.',
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Focus areas: color, layout, typography, storytelling, impact',
        },
      },
    },
  },
  {
    name: 'analyze-color-harmony',
    description: `Analyze existing color palette for harmony, accessibility, and emotional impact.

**TRIGGER PHRASES (use this tool when user says):**
- "check my colors"
- "are my colors accessible"
- "color accessibility"
- "analyze my palette"
- "is this colorblind safe"
- "color contrast check"

**REQUIRES:** Either provide hex colors or have a screenshot captured.

**NOTE:** To CREATE a new palette, use generate-tableau-palette instead. This tool ANALYZES existing colors.

Returns: harmony type, accessibility score, colorblind safety, suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        colors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hex colors to analyze',
        },
        screenshotBase64: {
          type: 'string',
          description: 'Screenshot to extract colors from',
        },
        checkAccessibility: {
          type: 'boolean',
          description: 'Include WCAG analysis',
          default: true,
        },
      },
    },
  },
  {
    name: 'generate-tableau-palette',
    description: `Generate custom Tableau color palette with visual preview and downloadable .tps Preferences file.

**TRIGGER PHRASES (use this tool when user says):**
- "generate a color palette"
- "recommend colors"
- "suggest a color scheme"
- "create a palette"
- "what colors should I use"
- "give me a color palette"
- "color recommendations"
- "pick colors for my dashboard"
- "I need colors for..."
- "corporate colors"
- "professional color scheme"
- "theme colors"
- "brand colors"

**YOU MUST CALL THIS TOOL** to generate the palette - don't just describe what colors to use!

AVAILABLE THEMES: corporate, ocean, nature, sunset, tech, finance, healthcare, energy, retail, minimal

RETURNS:
- Visual preview of colors rendered in the Preview tab
- Tableau Preferences.tps XML ready to copy
- Font recommendations for the theme
- Installation instructions

**AFTER CALLING:** Tell the user "Check the Preview tab to see your color palette preview!"`,
    inputSchema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          description: 'Theme: corporate, nature, ocean, sunset, tech, finance, healthcare, energy, retail, minimal',
        },
        brandColors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional brand colors (hex) to incorporate into the palette',
        },
        paletteType: {
          type: 'string',
          enum: ['sequential', 'diverging', 'categorical'],
          description: 'Palette type (default: categorical)',
        },
        paletteName: {
          type: 'string',
          description: 'Custom name for the palette',
        },
        colorCount: {
          type: 'number',
          description: 'Number of colors (default: 10)',
        },
      },
      required: ['theme'],
    },
  },
  {
    name: 'suggest-annotations',
    description: `Analyze dashboard data and suggest where to add annotations.

Identifies key data points, outliers, trends and suggests annotation text and placement.`,
    inputSchema: {
      type: 'object',
      properties: {
        worksheetName: {
          type: 'string',
          description: 'Worksheet to analyze',
        },
        annotationStyle: {
          type: 'string',
          enum: ['minimal', 'detailed', 'storytelling'],
          description: 'Annotation style',
        },
      },
    },
  },
  // ==================== INTERACTION TOOLS ====================
  {
    name: 'apply-filter',
    description: `Apply, modify, or clear a filter on a Tableau worksheet.

Actions: set (include values), exclude (exclude values), clear (reset filter).`,
    inputSchema: {
      type: 'object',
      properties: {
        worksheet: {
          type: 'string',
          description: 'Worksheet to filter',
        },
        field: {
          type: 'string',
          description: 'Field to filter on',
        },
        values: {
          type: 'array',
          items: { type: 'string' },
          description: 'Values to filter (not required for clear)',
        },
        action: {
          type: 'string',
          enum: ['set', 'exclude', 'clear'],
          description: 'Filter action',
          default: 'set',
        },
      },
      required: ['worksheet', 'field'],
    },
  },
  {
    name: 'set-parameter',
    description: 'Set a Tableau parameter value.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Parameter name',
        },
        value: {
          type: 'string',
          description: 'Value to set',
        },
      },
      required: ['name', 'value'],
    },
  },

  // ==================== DOCUMENTATION TOOLS ====================
  {
    name: 'generate-documentation',
    description: `Generate comprehensive Markdown documentation for the dashboard.

Includes: data sources, fields, calculated fields, worksheets, filters, parameters.`,
    inputSchema: {
      type: 'object',
      properties: {
        includeDataSources: {
          type: 'boolean',
          description: 'Include data sources',
          default: true,
        },
        includeFields: {
          type: 'boolean',
          description: 'Include field inventory',
          default: true,
        },
        includeWorksheets: {
          type: 'boolean',
          description: 'Include worksheets',
          default: true,
        },
        includeParameters: {
          type: 'boolean',
          description: 'Include parameters',
          default: true,
        },
      },
    },
  },
];

// ==================== TOOL HANDLERS ====================
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  bridge: WebSocketBridge
): Promise<any> {
  switch (name) {
    // ==================== TABLEAU MCP INTEGRATION HANDLERS ====================
    
    case 'get-analysis-strategy': {
      const strategy = args.strategy as keyof typeof ANALYSIS_STRATEGIES;
      const datasourceLuid = args.datasourceLuid as string || 'YOUR_DATASOURCE_LUID';
      const measures = args.measures as string[] || ['Sales', 'Profit'];
      const dimensions = args.dimensions as string[] || ['Category', 'Region'];
      const dateFields = args.dateFields as string[] || ['Order Date'];
      
      const strategyInfo = ANALYSIS_STRATEGIES[strategy];
      if (!strategyInfo) {
        return {
          error: `Unknown strategy: ${strategy}`,
          availableStrategies: Object.keys(ANALYSIS_STRATEGIES),
        };
      }
      
      const instructions = generateAnalysisInstructions(strategy, datasourceLuid, {
        measures,
        dimensions,
        dateFields,
        idField: dimensions[0],
      });
      
      return {
        strategy: strategyInfo.name,
        description: strategyInfo.description,
        estimatedTokens: strategyInfo.totalExpectedTokens,
        stepCount: strategyInfo.steps.length,
        instructions,
        usage: `Use Tableau MCP's query-datasource tool with datasourceLuid "${datasourceLuid}" and the query templates above.`,
        tip: 'These queries use Tableau\'s aggregation engine - much more efficient than fetching raw rows!',
      };
    }
    
    case 'interpret-concentration': {
      const topNData = args.topNData as Array<Record<string, any>>;
      const grandTotal = args.grandTotal as number;
      const measureField = args.measureField as string;
      const dimensionField = args.dimensionField as string;
      
      if (!topNData || !Array.isArray(topNData)) {
        return { error: 'topNData must be an array of results from a TOP N query' };
      }
      
      const result = interpretConcentration(topNData, grandTotal, measureField, dimensionField);
      
      return {
        success: true,
        analysis: 'Concentration/Pareto Analysis',
        ...result,
        recommendation: result.isConcentrated
          ? 'Consider diversifying to reduce dependency on top contributors.'
          : 'Distribution is healthy. Monitor for changes over time.',
      };
    }
    
    case 'interpret-segments': {
      const segmentData = args.segmentData as Array<Record<string, any>>;
      const measureField = args.measureField as string;
      const segmentField = args.segmentField as string;
      
      if (!segmentData || !Array.isArray(segmentData)) {
        return { error: 'segmentData must be an array of results from a segment query' };
      }
      
      const result = interpretSegmentComparison(segmentData, measureField, segmentField);
      
      return {
        success: true,
        analysis: 'Segment Comparison',
        ...result,
        recommendation: result.variance > 50
          ? `High variance (${result.variance.toFixed(1)}% CV) suggests investigating underperforming segments.`
          : `Moderate variance (${result.variance.toFixed(1)}% CV). Segments are relatively balanced.`,
      };
    }
    
    case 'get-semantic-metadata': {
      const datasourceLuid = args.datasourceLuid as string;
      const datasourceName = args.datasourceName as string;
      
      // This tool provides instructions for using Tableau MCP to get semantic metadata
      // The actual call to Tableau MCP happens via the LLM orchestrating mcp_tableau_get-datasource-metadata
      
      if (datasourceLuid) {
        return {
          success: true,
          instruction: 'Use mcp_tableau_get-datasource-metadata with this LUID to get semantic metadata',
          datasourceLuid,
          expectedFields: ['name', 'dataType', 'columnClass', 'defaultAggregation', 'dataCategory', 'role', 'formula', 'description'],
          usage: `Call: mcp_tableau_get-datasource-metadata({ datasourceLuid: "${datasourceLuid}" })`,
        };
      } else if (datasourceName) {
        return {
          success: true,
          instruction: 'First find the datasource LUID, then get metadata',
          steps: [
            `1. Call mcp_tableau_list-datasources({ filter: "name:eq:${datasourceName}*" })`,
            `2. Extract the 'id' from the result`,
            `3. Call mcp_tableau_get-datasource-metadata({ datasourceLuid: "<id from step 2>" })`,
          ],
        };
      } else {
        return {
          success: true,
          instruction: 'To get semantic metadata, you need either a datasource LUID or name',
          steps: [
            '1. Call mcp_tableau_list-datasources() to see available datasources',
            '2. Pick a datasource and note its "id" (the LUID)',
            '3. Call mcp_tableau_get-datasource-metadata({ datasourceLuid: "<luid>" })',
          ],
          expectedMetadata: {
            fields: [
              { name: 'Field name', dataType: 'STRING|INTEGER|REAL|DATE', role: 'DIMENSION|MEASURE', dataCategory: 'NOMINAL|ORDINAL|QUANTITATIVE' },
            ],
            parameters: [
              { name: 'Parameter name', dataType: 'INTEGER|REAL|STRING', value: 'current value', min: 'minimum', max: 'maximum' },
            ],
          },
        };
      }
    }

    // ==================== AGENTIC ORCHESTRATION HANDLER ====================
    
    case 'agentic-analyst': {
      const mode = args.mode as string || 'full-analysis';
      const focusArea = args.focusArea as string || null;
      const includeDesignReview = args.includeDesignReview as boolean || false;
      
      // Define workflow plans for each mode
      const workflows: Record<string, any> = {
        'full-analysis': {
          name: 'Full Analysis Workflow',
          description: 'Complete understand → analyze → recommend flow',
          estimatedSteps: 5,
          steps: [
            {
              step: 1,
              name: 'Understand Dashboard Context',
              tool: 'check-connection',
              purpose: 'Get connected worksheets, fields, and current state',
              nextAction: 'Use the dashboard context to understand available data',
            },
            {
              step: 2,
              name: 'Get Datasource Metadata',
              tool: 'mcp_tableau_list-datasources',
              purpose: 'Find the underlying datasource LUID',
              nextAction: 'Then call mcp_tableau_get-datasource-metadata with the LUID',
            },
            {
              step: 3,
              name: 'Profile Data',
              tool: 'get-analysis-strategy',
              toolArgs: { strategy: 'quick-profile' },
              purpose: 'Get optimized queries for data profiling',
              nextAction: 'Execute the queries via mcp_tableau query-datasource',
            },
            {
              step: 4,
              name: 'Deep Analysis',
              tool: 'analyze-dashboard-smart',
              toolArgs: { analysisGoal: 'concentration-analysis' },
              purpose: 'Find patterns, concentration, and anomalies',
              nextAction: 'Interpret results using interpret-concentration or interpret-segments',
            },
            {
              step: 5,
              name: 'Generate Recommendations',
              action: 'synthesize',
              purpose: 'Combine all insights into actionable recommendations',
              output: 'Executive summary with key findings and next steps',
            },
          ],
        },
        'quick-insights': {
          name: 'Quick Insights Workflow',
          description: 'Fast profiling with immediate recommendations',
          estimatedSteps: 3,
          steps: [
            {
              step: 1,
              name: 'Get Dashboard Data',
              tool: 'get-worksheet-data',
              purpose: 'Quickly extract current worksheet data',
              nextAction: 'Analyze the data structure and values',
            },
            {
              step: 2,
              name: 'Smart Analysis',
              tool: 'analyze-dashboard-smart',
              toolArgs: { analysisGoal: 'quick-profile' },
              purpose: 'Get rapid insights from the data',
              nextAction: 'Generate recommendations based on findings',
            },
            {
              step: 3,
              name: 'Deliver Insights',
              action: 'synthesize',
              purpose: 'Format findings as actionable bullet points',
              output: '3-5 key insights with supporting metrics',
            },
          ],
        },
        'design-critique': {
          name: 'Design Critique Workflow',
          description: 'Analyze current design and suggest improvements',
          estimatedSteps: 3,
          requiresScreenshot: true,
          steps: [
            {
              step: 1,
              name: 'Capture Current Design',
              tool: 'get-dashboard-screenshot',
              purpose: 'Get the current dashboard visual',
              nextAction: 'Analyze the screenshot for design issues',
            },
            {
              step: 2,
              name: 'Design Analysis',
              tool: 'analyze-design',
              toolArgs: { analysisType: 'design-review' },
              purpose: 'Identify UX/UI issues, layout problems, color usage',
              alternatives: ['analyze-iron-viz-style', 'analyze-color-harmony'],
            },
            {
              step: 3,
              name: 'Generate Design Recommendations',
              action: 'synthesize',
              purpose: 'Provide specific, actionable design improvements',
              output: 'Prioritized list of design changes with before/after suggestions',
            },
          ],
        },
        'redesign': {
          name: 'Full Redesign Workflow',
          description: 'Complete analysis plus new dashboard generation',
          estimatedSteps: 7,
          steps: [
            {
              step: 1,
              name: 'Understand Current State',
              tool: 'check-connection',
              purpose: 'Get dashboard context and available data',
            },
            {
              step: 2,
              name: 'Analyze Current Design',
              tool: 'analyze-design',
              toolArgs: { analysisType: 'design-review' },
              condition: 'If screenshot available',
            },
            {
              step: 3,
              name: 'Profile Underlying Data',
              tool: 'analyze-dashboard-smart',
              toolArgs: { analysisGoal: 'quick-profile' },
              purpose: 'Understand data characteristics for optimal visualization',
            },
            {
              step: 4,
              name: 'Identify Key Metrics',
              action: 'analyze',
              purpose: 'Determine the most important KPIs and dimensions',
            },
            {
              step: 5,
              name: 'Generate New Dashboard',
              tool: 'build-dashboard',
              purpose: 'Create an improved dashboard layout with better visualizations',
              note: 'Uses insights from analysis to inform chart selection',
            },
            {
              step: 6,
              name: 'Add Storytelling Elements',
              tool: 'transform-to-story',
              purpose: 'Add narrative elements, key takeaways, and context',
            },
            {
              step: 7,
              name: 'Final Review',
              action: 'synthesize',
              purpose: 'Summarize changes and improvements made',
              output: 'Before/after comparison with rationale for each change',
            },
          ],
        },
      };
      
      const workflow = workflows[mode];
      if (!workflow) {
        return {
          error: `Unknown workflow mode: ${mode}`,
          availableModes: Object.keys(workflows),
        };
      }
      
      // Add focus area context if provided
      if (focusArea) {
        workflow.focusArea = focusArea;
        workflow.focusGuidance = `Focus your analysis on: "${focusArea}". Prioritize metrics, dimensions, and visualizations related to this area.`;
      }
      
      // Add design review step if requested
      if (includeDesignReview && mode !== 'design-critique' && mode !== 'redesign') {
        workflow.steps.push({
          step: workflow.steps.length + 1,
          name: 'Optional Design Review',
          tool: 'analyze-design',
          purpose: 'Review visual design for accessibility and best practices',
          condition: 'If screenshot is available',
        });
      }
      
      return {
        success: true,
        workflowPlan: workflow,
        executionInstructions: `
Execute each step in order. After each tool call:
1. Review the output
2. Extract key information needed for subsequent steps
3. Proceed to the next step

For steps marked "action: synthesize", use your reasoning to combine insights from previous steps.

IMPORTANT: 
- Use Tableau MCP tools (mcp_tableau_*) for datasource queries
- Use DashAgent tools for visualization and interaction
- Keep token usage efficient by using aggregation queries, not raw data pulls
`,
        tips: [
          'Start with check-connection to verify the extension is connected',
          'Use get-analysis-strategy to get optimized query templates',
          'Prefer mcp_tableau query-datasource over get-worksheet-data for large datasets',
          'When building dashboards, provide labelOverrides to translate field names',
        ],
      };
    }

    // ==================== DESIGN ANALYSIS HANDLER ====================
    
    case 'get-dashboard-screenshot': {
      // First try to get from extension (dropped screenshot)
      const response = await bridge.sendToExtension({
        type: 'get-image',
      });
      
      if (response?.image) {
        // Cache the image instead of returning it (too large for LLM context)
        setCachedScreenshot(response.image);
        const imageSizeKB = Math.round(response.image.length / 1024);
        console.error(`[get-dashboard-screenshot] Cached screenshot: ${imageSizeKB}KB`);
        
        return {
          success: true,
          source: 'extension',
          hasImage: true,
          imageSizeKB,
          // NOTE: Image is cached, not returned - it's too large for LLM context
          instructions: 'Screenshot captured and cached. Now call analyze-design to analyze it.',
        };
      }
      
      // If no dropped screenshot, provide instructions for Tableau MCP
      const viewId = args.viewId as string;
      if (viewId) {
        return {
          success: true,
          source: 'tableau-mcp',
          viewId,
          instructions: `To get the view image, call the Tableau MCP tool:
mcp_tableau_get-view-image({ viewId: "${viewId}" })

Then pass the resulting image to analyze-design.`,
        };
      }
      
      return {
        error: 'No screenshot available',
        howToGet: [
          '1. Drop a screenshot in the DashAgent extension Design tab',
          '2. OR provide a viewId to fetch from Tableau Cloud/Server',
          '3. OR use Tableau MCP: mcp_tableau_list-views() to find views, then mcp_tableau_get-view-image({ viewId: "..." })',
        ],
      };
    }
    
    case 'analyze-design': {
      const analysisType = args.analysisType as string || 'design-review';
      const viewId = args.viewId as string;
      let imageBase64: string | null = null;
      let imageSource = 'none';
      
      // First check cached screenshot (from get-dashboard-screenshot)
      const cachedImage = getCachedScreenshotImage();
      if (cachedImage) {
        imageBase64 = cachedImage;
        imageSource = 'cached';
        console.error('[analyze-design] Using cached screenshot');
      }
      
      // If no cache, try to get image from extension directly
      if (!imageBase64) {
        console.error('[analyze-design] No cached image, fetching from extension...');
        try {
          const response = await bridge.sendToExtension({
            type: 'get-image',
          });
          
          console.error('[analyze-design] Extension response:', {
            hasImage: !!response?.image,
            imageLength: response?.image?.length || 0,
            hasImageFlag: response?.hasImage,
            switchedToDesign: response?.switchedToDesign
          });
          
          if (response?.image) {
            imageBase64 = response.image;
            imageSource = 'extension';
            // Also cache it for future use
            setCachedScreenshot(response.image);
            console.error('[analyze-design] Got image from extension:', Math.round(response.image.length / 1024), 'KB');
          } else if (response?.switchedToDesign) {
            // Extension switched to design tab but no image yet
            console.error('[analyze-design] No image - extension switched to Design tab');
          }
        } catch (err) {
          console.error('[analyze-design] Failed to get image from extension:', err);
        }
      }
      
      // If no image and viewId provided, give instructions to use Tableau MCP
      if (!imageBase64 && viewId) {
        return {
          success: false,
          needsImage: true,
          viewId,
          instructions: `To analyze this view, first get its image using Tableau MCP:

1. Call: mcp_tableau_get-view-image({ viewId: "${viewId}" })
2. The image will be returned as base64
3. Then call analyze-design again with the image available

Alternatively, take a screenshot of the dashboard and drop it in the DashAgent extension.`,
        };
      }
      
      if (!imageBase64) {
        // No cached image - need to prompt user
        // First switch to design tab
        try {
          await bridge.sendToExtension({
            type: 'get-image', // This will trigger the tab switch
          });
        } catch (e) {
          console.error('[MCP] Error switching to design tab:', e);
        }
        
        return {
          success: false,
          needsScreenshot: true,
          message: `I need a screenshot to analyze the design.\n\n**To capture your dashboard:**\n1. **Switch to the Design tab** in the DashAgent extension\n2. **Click "Capture Screen"** or **paste a screenshot** (Ctrl+V)\n3. **Ask me again** to analyze the design\n\nAlternatively, you can drag & drop an image file into the drop zone.`,
        };
      }

      let analysisPrompt = args.prompt as string || '';
      
      // Build comprehensive prompt based on analysis type
      let fullPrompt = '';
      if (analysisType === 'storytelling') {
        fullPrompt = `${analysisPrompt}

**IMPORTANT: First, briefly describe what you SEE in this dashboard image** (2-3 sentences about the layout, colors, charts you observe). This confirms you're analyzing the actual screenshot.

Then analyze this dashboard for data storytelling effectiveness:

## Story Clarity
1. **Main Message**: What is the primary insight this dashboard conveys? Is it immediately clear?
2. **Visual Hierarchy**: Does the layout guide the eye to the most important information first?
3. **Title & Context**: Does the title tell a story? Is there sufficient context for the data?

## Audience Focus
4. **Who is this for?**: What audience does this seem designed for (executive, analyst, operations)?
5. **Actionability**: Can the viewer take action based on what they see?
6. **Cognitive Load**: Is there too much information competing for attention?

## Design Choices
7. **Chart Selection**: Are the chart types appropriate for the data and message?
8. **Color Usage**: Does color add meaning or distract? Is there a clear color logic?
9. **Annotations**: Are there callouts highlighting key insights?

## Recommendations
- What is working well?
- What should change?
- How could the story be stronger?`;
      } else if (analysisType === 'shelf-detection') {
        fullPrompt = `${analysisPrompt}

**IMPORTANT: First, briefly describe what you SEE in this dashboard image** (1-2 sentences about the visualization type and overall layout).

Then analyze this Tableau worksheet/dashboard screenshot and extract:

1. **Rows Shelf**: What field(s) are on the Rows shelf? (look at vertical axis labels, row headers)
2. **Columns Shelf**: What field(s) are on the Columns shelf? (horizontal axis labels, column headers)
3. **Marks Type**: What type of marks? (Bar, Line, Circle, Square, Shape, Text, Map, Pie, etc.)
4. **Color Encoding**: Is there a Color field? What values/categories in the legend?
5. **Size Encoding**: Is there a Size field? Are marks varying in size?
6. **Labels**: Are there labels on marks? What field is displayed?
7. **Filters**: Any visible filter controls or quick filters?
8. **Aggregation**: What aggregations are visible? (SUM, AVG, COUNT, etc.)
9. **Visualization Type**: (Bar Chart, Stacked Bar, Line Chart, Scatter Plot, Map, Treemap, etc.)
10. **Axis Information**: Min/max values, axis titles, number formatting

Return structured JSON if possible.`;
      } else if (analysisType === 'accessibility') {
        fullPrompt = `${analysisPrompt}

**IMPORTANT: First, briefly describe what you SEE in this dashboard image** (2-3 sentences about the layout, colors, charts you observe). This confirms you're analyzing the actual screenshot.

Then analyze this dashboard for accessibility issues:

1. **Color Contrast**: Are there sufficient contrast ratios? Any issues for colorblind users?
2. **Text Size**: Is text legible? Any text too small?
3. **Color-Only Encoding**: Does the viz rely solely on color to convey meaning?
4. **Alt Text/Labels**: Are there descriptive labels and titles?
5. **Recommendations**: Specific improvements for WCAG compliance`;
      } else if (analysisType === 'design-review') {
        fullPrompt = `${analysisPrompt}

**IMPORTANT: First, briefly describe what you SEE in this dashboard image** (2-3 sentences about the layout, colors, charts you observe). This confirms you're analyzing the actual screenshot.

Then perform a comprehensive design review of this dashboard:

## Layout & Composition
1. **Visual Balance**: Is the layout balanced or cluttered?
2. **White Space**: Is there appropriate use of white space?
3. **Grid Alignment**: Are elements aligned properly?
4. **Size Proportions**: Are chart sizes appropriate for importance?

## Visual Design
5. **Color Palette**: Is the color scheme cohesive and meaningful?
6. **Typography**: Are fonts consistent and readable?
7. **Data-Ink Ratio**: Is there unnecessary chart junk or decoration?

## Data Visualization
8. **Chart Selection**: Are chart types appropriate for the data?
9. **Axis & Labels**: Are axes labeled clearly? Appropriate scales?
10. **Legends**: Are legends necessary and well-placed?

## User Experience
11. **Interactivity Cues**: Are filters and interactive elements discoverable?
12. **Information Hierarchy**: Is the most important info prominent?

## Grade & Recommendations
- Give an overall design grade (A-F)
- Top 3 things done well
- Top 3 things to improve
- Specific actionable recommendations`;
      } else {
        fullPrompt = `${analysisPrompt || 'Analyze this dashboard design and provide recommendations for improvement.'}

**IMPORTANT: First, briefly describe what you SEE in this dashboard image** (2-3 sentences about the layout, colors, charts you observe). This confirms you're analyzing the actual screenshot.

Then consider layout, color choices, data-ink ratio, clarity, storytelling, and user experience.`;
      }

      // Call vision API directly to analyze the image
      // This avoids returning the huge base64 to the LLM context
      console.error(`[analyze-design] Calling vision API with ${Math.round(imageBase64.length / 1024)}KB image`);
      
      // Get vision model config from cache (set by LLM handler when chat starts)
      const visionConfig = getCachedVisionModel();
      
      // Determine which provider and model to use
      const visionProvider = visionConfig?.provider || 'openai';
      const visionModel = visionConfig?.model || 'gpt-4o';
      const visionApiKey = visionConfig?.apiKey || getCachedApiKey(visionProvider) || process.env.OPENAI_API_KEY;
      
      console.error(`[analyze-design] Using vision model: ${visionProvider}:${visionModel}`);
      
      if (!visionApiKey) {
        return {
          success: false,
          error: 'No API key available for vision analysis.',
          tip: 'Make sure you have entered your API key in the DashAgent extension settings. The design analysis feature requires a vision-capable model.',
        };
      }
      
      try {
        let analysisResult: string;
        
        if (visionProvider === 'anthropic') {
          // Anthropic Claude vision API
          const visionResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': visionApiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: visionModel,
              max_tokens: 4096,
              system: 'You are DashAgent, an expert Tableau dashboard designer and data visualization consultant. Provide specific, actionable feedback based on what you see in the image.',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: fullPrompt },
                    { 
                      type: 'image', 
                      source: { 
                        type: 'base64',
                        media_type: 'image/png',
                        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                      } 
                    },
                  ],
                },
              ],
            }),
          });

          if (!visionResponse.ok) {
            const error = await visionResponse.json();
            throw new Error(error.error?.message || 'Anthropic Vision API request failed');
          }

          const visionData = await visionResponse.json();
          analysisResult = visionData.content[0]?.text || 'Analysis complete but no content returned.';
        } else {
          // OpenAI GPT-4o vision API
          const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${visionApiKey}`,
            },
            body: JSON.stringify({
              model: visionModel,
              max_completion_tokens: 4096,
              messages: [
                {
                  role: 'system',
                  content: 'You are DashAgent, an expert Tableau dashboard designer and data visualization consultant. Provide specific, actionable feedback based on what you see in the image.',
                },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: fullPrompt },
                    { 
                      type: 'image_url', 
                      image_url: { 
                        url: imageBase64,
                        detail: 'high'
                      } 
                    },
                  ],
                },
              ],
            }),
          });

          if (!visionResponse.ok) {
            const error = await visionResponse.json();
            throw new Error(error.error?.message || 'OpenAI Vision API request failed');
          }

          const visionData = await visionResponse.json();
          analysisResult = visionData.choices[0]?.message?.content || 'Analysis complete but no content returned.';
        }

        return {
          success: true,
          analysisType,
          imageSource,
          visionModel: `${visionProvider}:${visionModel}`,
          analysis: analysisResult,
        };
      } catch (error) {
        console.error('[analyze-design] Vision API error:', error);
        return {
          success: false,
          error: `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          tip: 'Make sure your API key is configured in the DashAgent extension settings. The analyze-design tool requires a vision-capable model.',
        };
      }
    }



    // ==================== UTILITY HANDLERS ====================
    
    case 'check-connection': {
      const connected = bridge.hasConnectedExtension();
      const extensions = bridge.getConnectedExtensions();
      return {
        connected,
        extensionCount: extensions.length,
        extensions,
      };
    }

    case 'clear-canvas': {
      bridge.sendToExtensionNoWait({
        type: 'render',
        html: '',
        append: false,
      });
      return { success: true, message: 'Canvas cleared' };
    }

    case 'render-component': {
      bridge.sendToExtensionNoWait({
        type: 'render',
        html: args.html,
        append: args.append || false,
      });
      return { success: true, message: 'Component rendered in extension' };
    }

    // ==================== UNIFIED ANALYSIS HANDLERS ====================
    // These tools delegate to the extension for Tableau API operations
    // and handle business logic here in the MCP server

    case 'analyze-dashboard-smart': {
      const analysisGoal = args.analysisGoal as string || 'quick-profile';
      const worksheet = args.worksheet as string | undefined;
      const focusMeasures = args.focusMeasures as string[] || [];
      const focusDimensions = args.focusDimensions as string[] || [];
      const forceRefresh = args.forceRefresh as boolean || false;

      // Request data extraction from extension
      // If no worksheet specified, extension returns ALL worksheets
      const extractResponse = await bridge.sendToExtension({
        type: 'extract-analysis-data',
        analysisGoal,
        worksheet,
        focusMeasures,
        focusDimensions,
        forceRefresh,
      });

      if (extractResponse?.error) {
        return { success: false, error: extractResponse.error };
      }

      return {
        success: true,
        analysisGoal,
        ...extractResponse,
      };
    }

    case 'full-data-exploration': {
      const analysisDepth = args.analysisDepth as string || 'standard';
      const focusAreas = args.focusAreas as string[] || [];
      const targetMeasure = args.targetMeasure as string;

      const response = await bridge.sendToExtension({
        type: 'full-data-exploration',
        analysisDepth,
        focusAreas,
        targetMeasure,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'profile-data-for-visualization': {
      const worksheet = args.worksheet as string;
      const focusMeasure = args.focusMeasure as string;
      const focusDimension = args.focusDimension as string;
      const intendedVizType = args.intendedVizType as string;

      const response = await bridge.sendToExtension({
        type: 'profile-data',
        worksheet,
        focusMeasure,
        focusDimension,
        intendedVizType,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'get-worksheet-data': {
      const worksheet = args.worksheet as string;
      const maxRows = args.maxRows as number || 100;

      if (!worksheet) {
        return { success: false, error: 'worksheet is required' };
      }

      const response = await bridge.sendToExtension({
        type: 'get-worksheet-data',
        worksheet,
        maxRows,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'build-dashboard': {
      const title = args.title as string || 'Dashboard';
      // Ensure labelOverrides is a valid object, not a number or other primitive
      const rawLabelOverrides = args.labelOverrides;
      console.error('[build-dashboard] rawLabelOverrides type:', typeof rawLabelOverrides, 'value:', JSON.stringify(rawLabelOverrides));
      const labelOverrides: Record<string, string> = (rawLabelOverrides && typeof rawLabelOverrides === 'object' && !Array.isArray(rawLabelOverrides)) 
        ? rawLabelOverrides as Record<string, string> 
        : {};
      const mode = args.mode as string || 'auto';
      const theme = args.theme as string || 'professional';
      const worksheet = args.worksheet as string;
      const focusMetrics = args.focusMetrics as string[];
      const focusDimension = args.focusDimension as string;
      const maxMetrics = args.maxMetrics as number || 6;
      const maxItems = args.maxItems as number || 7;
      const customColors = args.customColors as string[];

      console.error('[build-dashboard] Processed labelOverrides:', Object.keys(labelOverrides).length, 'keys:', Object.keys(labelOverrides).slice(0, 3));

      const response = await bridge.sendToExtension({
        type: 'build-dashboard',
        title,
        labelOverrides,
        mode,
        theme,
        worksheet,
        focusMetrics,
        focusDimension,
        maxMetrics,
        maxItems,
        customColors,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: `✅ Dashboard "${title}" created successfully. **Tell the user to check the Preview tab** to see their dashboard.`,
        previewTabNote: 'IMPORTANT: Always tell the user to check the Preview tab to see their dashboard!',
        ...response,
      };
    }

    case 'render-visualization': {
      const vizType = args.vizType as string;
      const worksheet = args.worksheet as string;
      const measureField = args.measureField as string;
      const dimensionField = args.dimensionField as string;
      const title = args.title as string;
      const colorScheme = args.colorScheme as string || 'blue';
      const customColors = args.customColors as string[];
      const showValues = args.showValues !== false;
      const maxItems = args.maxItems as number || 10;
      const sortOrder = args.sortOrder as string || 'desc';
      const append = args.append as boolean || false;
      const theme = args.theme as string || 'professional';
      const aggregateByDate = args.aggregateByDate as boolean || false;
      const aggregationType = args.aggregationType as string || 'sum';

      if (!vizType || !worksheet) {
        return { success: false, error: 'vizType and worksheet are required' };
      }

      const response = await bridge.sendToExtension({
        type: 'render-visualization',
        vizType,
        worksheet,
        measureField,
        dimensionField,
        title,
        colorScheme,
        customColors,
        showValues,
        maxItems,
        sortOrder,
        append,
        theme,
        aggregateByDate,
        aggregationType,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      // Build descriptive message with Preview tab reminder
      const chartTypeLabels: Record<string, string> = {
        'horizontal-bar': 'horizontal bar chart',
        'bar': 'vertical bar chart',
        'pie': 'pie chart',
        'donut': 'donut chart',
        'kpi': 'KPI card',
        'line': 'line chart',
        'area': 'area chart',
        'table': 'data table',
        'metric-cards': 'metric cards'
      };
      const chartTypeLabel = chartTypeLabels[vizType] || vizType;
      
      return {
        success: true,
        message: `✅ ${chartTypeLabel} rendered successfully. **Tell the user to check the Preview tab** to see their chart.`,
        vizType,
        worksheet,
        previewTabNote: 'IMPORTANT: Always tell the user to check the Preview tab to see their chart!',
        ...response,
      };
    }

    case 'confirm-chart-fields': {
      const worksheet = args.worksheet as string;
      const requestedDimension = args.requestedDimension as string;
      const requestedMeasure = args.requestedMeasure as string;
      const vizType = args.vizType as string;

      const response = await bridge.sendToExtension({
        type: 'confirm-chart-fields',
        worksheet,
        requestedDimension,
        requestedMeasure,
        vizType,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'transform-to-story': {
      const storyAngle = args.storyAngle as string;
      const audience = args.audience as string;
      const includeRecommendations = args.includeRecommendations !== false;
      const forceRefresh = args.forceRefresh as boolean || false;
      const designRequest = args.designRequest as string;

      const response = await bridge.sendToExtension({
        type: 'transform-to-story',
        storyAngle,
        audience,
        includeRecommendations,
        forceRefresh,
        designRequest,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: 'Story transformation applied',
        ...response,
      };
    }

    case 'toggle-tooltips': {
      const enabled = args.enabled as boolean;
      
      bridge.sendToExtensionNoWait({
        type: 'toggle-tooltips',
        enabled,
      });
      
      return { 
        success: true, 
        message: `Tooltips ${enabled ? 'enabled' : 'disabled'}` 
      };
    }

    case 'analyze-iron-viz-style': {
      const focusAreas = args.focusAreas as string[];
      
      // Get screenshot from extension
      const imageResponse = await bridge.sendToExtension({ type: 'get-image' });
      
      if (!imageResponse?.image) {
        return {
          success: false,
          error: 'No screenshot available. Please drop a dashboard screenshot in the Design tab.',
        };
      }

      const response = await bridge.sendToExtension({
        type: 'analyze-iron-viz-style',
        screenshotBase64: imageResponse.image,
        focusAreas,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'analyze-color-harmony': {
      const colors = args.colors as string[];
      const checkAccessibility = args.checkAccessibility !== false;

      const response = await bridge.sendToExtension({
        type: 'analyze-color-harmony',
        colors,
        checkAccessibility,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'generate-tableau-palette': {
      const theme = args.theme as string;
      const brandColors = args.brandColors as string[];
      const paletteType = (args.paletteType as string) || 'categorical';
      const paletteName = (args.paletteName as string) || `DashAgent ${theme} Palette`;
      const colorCount = (args.colorCount as number) || 10;

      if (!theme) {
        return { success: false, error: 'theme is required' };
      }

      // Send to extension for rendering (same pattern as transform-to-story)
      const response = await bridge.sendToExtension({
        type: 'generate-tableau-palette',
        theme,
        brandColors,
        paletteType,
        paletteName,
        colorCount,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: `✅ "${response.paletteName || paletteName}" palette generated. **Check the Preview tab** to see the visual preview and copy the Tableau Preferences.tps XML.`,
        previewTabNote: 'IMPORTANT: Tell the user to check the Preview tab!',
        ...response,
      };
    }

    case 'suggest-annotations': {
      const worksheetName = args.worksheetName as string;
      const annotationStyle = args.annotationStyle as string;

      const response = await bridge.sendToExtension({
        type: 'suggest-annotations',
        worksheetName,
        annotationStyle,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    case 'apply-filter': {
      const worksheet = args.worksheet as string;
      const field = args.field as string;
      const values = args.values as string[];
      const action = args.action as string || 'set';

      if (!worksheet || !field) {
        return { success: false, error: 'worksheet and field are required' };
      }

      const response = await bridge.sendToExtension({
        type: 'apply-filter',
        worksheet,
        field,
        values,
        action,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: `Filter ${action === 'clear' ? 'cleared' : 'applied'} on ${field}`,
        ...response,
      };
    }

    case 'set-parameter': {
      const name = args.name as string;
      const value = args.value as string;

      if (!name || value === undefined) {
        return { success: false, error: 'name and value are required' };
      }

      const response = await bridge.sendToExtension({
        type: 'set-parameter',
        name,
        value,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: `Parameter "${name}" set to "${value}"`,
        ...response,
      };
    }

    case 'generate-documentation': {
      const options = {
        includeDataSources: args.includeDataSources !== false,
        includeFields: args.includeFields !== false,
        includeWorksheets: args.includeWorksheets !== false,
        includeParameters: args.includeParameters !== false,
      };

      const response = await bridge.sendToExtension({
        type: 'generate-documentation',
        options,
      });

      if (response?.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        ...response,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
