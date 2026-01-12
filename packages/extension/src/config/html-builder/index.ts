/**
 * HTML Builder - Module Exports
 * Unified exports for all HTML generation utilities
 */

// Base utilities and types
export type {
  ThemeConfig,
  MeasureInfo,
  DimensionInfo,
  BreakdownData,
  AnalyzedData,
  BuildOptions
} from './base';

export {
  THEMES,
  escapeHtml,
  formatValue,
  normalizeFieldName,
  generateSparkline,
  applyCustomColors,
  analyzeWorksheetData
} from './base';

// UI Component types
export type {
  KpiCardOptions,
  BarChartOptions,
  LineChartOptions,
  InsightOptions,
  MetricComparisonOptions
} from './components';

// UI Component generators
export {
  generateKpiCard,
  generateBarChart,
  generateLineChart,
  generateInsightCallout,
  generateMetricComparison
} from './components';

// Dashboard builder
export type { DashboardResult, SmartDashboardOptions } from './dashboard';
export { buildSmartDashboard } from './dashboard';

// Story builder
export type { StoryResult, StoryOptions } from './story';
export { buildStoryHtml, buildStoryFromAnalyzedData } from './story';

// Layout Engine (Smart UI System)
export type {
  LayoutElement,
  ElementContent,
  ElementType,
  ImportanceLevel,
  SizePreference,
  ChartSubtype,
  LayoutConfig,
  LayoutResult,
  GeneratedInsight
} from './layout-engine';

export {
  layoutElements,
  createKpiElement,
  createChartElement,
  createInsightElement,
  createHeroElement,
  createKeyTakeawayElement,
  createFooterElement,
  getThemeConfig,
  generateDataInsights,
  insightsToElements
} from './layout-engine';

// LLM Context Builder (for inference-based insights)
export type {
  MeasureStats,
  SegmentStats,
  LLMContext
} from './llm-context';

export {
  buildLLMContext,
  buildMeasureStats,
  buildSegmentStats,
  formatContextForLLM,
  generateDataSummary
} from './llm-context';
