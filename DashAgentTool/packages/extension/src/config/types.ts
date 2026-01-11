/**
 * Type definitions for DashAgent Extension
 */

// Dashboard context from Tableau
export interface DashboardContext {
  dashboardName: string;
  worksheets: WorksheetInfo[];
  parameters: ParameterInfo[];
  filters: FilterInfo[];
  availableDimensions: string[];
  availableMeasures: string[];
}

export interface WorksheetInfo {
  name: string;
  fields?: FieldInfo[];
  columns?: { fieldName: string; dataType: string; isReferenced?: boolean }[];
  rowCount?: number;
  error?: string;
}

export interface FieldInfo {
  name: string;
  dataType: string;
  isAggregated?: boolean;
}

export interface ParameterInfo {
  name: string;
  currentValue?: string | number;
  dataType: string;
}

export interface FilterInfo {
  worksheet: string;
  fieldName: string;
  filterType: string;
}

// Settings configuration
export interface Settings {
  openaiApiKey: string;
  anthropicApiKey: string;
  modelVision: string;
  modelGeneration: string;
  modelAnalysis: string;
  mcpUrl: string;
  wsAuthToken: string;
  getModelConfig(taskType: 'vision' | 'generation' | 'analysis'): ModelConfig;
  getOpenAITokenParam(model: string, tokens?: number): { max_completion_tokens: number };
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

// Chat message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Visualization config
export interface VizConfig {
  worksheet: string;
  worksheetObj?: any;
  vizType: string;
  dimension?: string;
  measure?: string;
  title?: string;
  colors?: string[];
  showValues?: boolean;
  showLegend?: boolean;
  layout?: string;
  theme?: string;
  colorMode?: string;
  limit?: number;
  sortOrder?: string;
  showAverageLine?: boolean;
}

// Story cache structure
export interface StoryCache {
  cacheKey: {
    worksheetNames: string[];
    dataHash: string | null;
    rowCount: number;
    filterState: string;
    timestamp: number | null;
  };
  isStale: boolean;
  staleReason: string | null;
  extractedData: ExtractedData;
  analysisResult: AnalysisResult;
  designPreferences: DesignPreferences;
  explorationState: ExplorationState;
}

export interface ExtractedData {
  rankings: Record<string, RankingItem[]>;
  statistics: Record<string, Statistics>;
  topPerformers: Record<string, Record<string, PerformerItem>>;
  totals: Record<string, number>;
  anomalies: AnomalyItem[];
  dimensionBreakdowns: Record<string, DimensionBreakdown[]>;
  rawMetrics: any[];
  worksheetSummaries: WorksheetSummary[];
}

export interface RankingItem {
  rank: number;
  name: string;
  value: number;
  formatted: string;
}

export interface Statistics {
  count: number;
  sum: number;
  avg: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  formattedAvg: string;
  formattedMax: string;
  formattedMin: string;
  values?: number[];
  formatted?: string[];
}

export interface PerformerItem {
  name: string;
  value: number;
  formatted: string;
}

export interface AnomalyItem {
  type: 'high_outlier' | 'low_outlier';
  dimension: string;
  dimensionValue: string;
  measure: string;
  value: number;
  formatted: string;
  reason: string;
}

export interface DimensionBreakdown {
  name: string;
  metrics: Record<string, MetricValue>;
}

export interface MetricValue {
  value: number;
  formatted: string;
  originalFormatted?: string;
}

export interface WorksheetSummary {
  name: string;
  rowCount: number;
  dimensions: string[];
  measures: string[];
}

export interface AnalysisResult {
  heroHeadline: string | null;
  keyTakeaway: string | null;
  insights: InsightItem[];
  recommendations: RecommendationItem[];
  trustStatement: string | null;
  analysisAngle: string | null;
  audience: string | null;
  footer?: string;
}

export interface InsightItem {
  headline: string;
  text: string;
  metric: string;
  metricLabel?: string;
}

export interface RecommendationItem {
  text: string;
  priority: 'high' | 'medium' | 'low';
  rationale?: string;
}

export interface DesignPreferences {
  theme: string;
  colorScheme: string[];
  layout: string;
  emphasis: string | null;
}

export interface ExplorationState {
  fieldProfiles: Record<string, any>;
  correlationMatrix: Record<string, any>;
  dataQuality: {
    completeness: number;
    uniqueness: number;
    consistency: number;
    issues: any[];
  };
  drillPath: any[];
  focusedSegments: any[];
  regressionModels: Record<string, any>;
  clusterAnalysis: Record<string, any>;
  seasonalityPatterns: Record<string, any>;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  html?: string;
}
