/**
 * LLM Context Builder
 * 
 * Prepares data, metadata, and statistics for LLM inference.
 * NO hardcoded thresholds or domain-specific assumptions.
 * The LLM will interpret the data and make contextual judgments.
 */

import { MeasureInfo, BreakdownData, AnalyzedData, DateRange } from './base';

// ==================== TYPES ====================

/**
 * Statistical summary of a measure - pure math, no judgments
 */
export interface MeasureStats {
  name: string;
  displayName: string;
  type: 'rate' | 'volume' | 'count' | 'currency' | 'value';
  
  // Core statistics
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  
  // Distribution info
  range: number;           // max - min
  spreadRatio: number;     // range / avg (coefficient of variation proxy)
  
  // Position relative to dataset
  percentile?: number;     // Where this measure's avg falls in its own distribution
  
  // Trend info (if time series available)
  trend?: {
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    firstValue: number;
    lastValue: number;
  };
  
  // Raw values for LLM to analyze
  sampleValues?: number[];
}

/**
 * Breakdown/segment analysis - pure data, no judgments
 */
export interface SegmentStats {
  dimension: string;
  measure: string;
  totalValue: number;
  segmentCount: number;
  
  // Concentration metrics
  topSegment: { name: string; value: number; share: number };
  top3Share: number;       // What % of total the top 3 represent
  bottomSegment: { name: string; value: number; share: number };
  
  // Distribution
  giniCoefficient?: number; // 0 = perfect equality, 1 = perfect inequality
  
  // All segments for LLM to analyze
  segments: Array<{ name: string; value: number; share: number; rank: number }>;
}

/**
 * Complete context for LLM inference
 */
export interface LLMContext {
  // Metadata
  dashboardName?: string;
  worksheetNames: string[];
  dataSourceNames: string[];
  dateRange?: { start: string; end: string; fieldName: string };
  
  // Semantic information
  fieldDescriptions: Record<string, string>;  // From Tableau metadata
  calculatedFieldFormulas: Record<string, string>;  // From Tableau
  
  // Statistical summaries
  measures: MeasureStats[];
  segments: SegmentStats[];
  
  // Comparative context
  rateMeasures: MeasureStats[];   // Filtered view for convenience
  volumeMeasures: MeasureStats[]; // Filtered view for convenience
  
  // Relationships detected
  relationships: Array<{
    type: 'rate-volume' | 'hierarchy' | 'correlation';
    field1: string;
    field2: string;
    description: string;
  }>;
}

// ==================== CONTEXT BUILDERS ====================

/**
 * Calculate trend from values array
 */
function calculateTrend(values: number[]): MeasureStats['trend'] | undefined {
  if (!values || values.length < 2) return undefined;
  
  const first = values[0];
  const last = values[values.length - 1];
  
  if (first === 0 && last === 0) return { direction: 'stable', changePercent: 0, firstValue: 0, lastValue: 0 };
  if (first === 0) return { direction: 'increasing', changePercent: 100, firstValue: 0, lastValue: last };
  
  const changePercent = ((last - first) / Math.abs(first)) * 100;
  
  // Use a small threshold to determine direction
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(changePercent) < 2) {
    direction = 'stable';
  } else if (changePercent > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }
  
  return { direction, changePercent, firstValue: first, lastValue: last };
}

/**
 * Detect measure type from name and values - no domain assumptions
 */
function detectMeasureType(measure: MeasureInfo): MeasureStats['type'] {
  const nameLower = measure.name.toLowerCase();
  
  // Rate detection
  if (measure.isRate || nameLower.match(/rate|percent|%|ratio|pct|margin|share/)) {
    return 'rate';
  }
  
  // Currency detection
  if (nameLower.match(/revenue|sales|price|cost|profit|amount|dollar|\$/)) {
    return 'currency';
  }
  
  // Count detection
  if (nameLower.match(/count|total|sum|volume|quantity|num|number/)) {
    return 'count';
  }
  
  // Volume detection (large aggregates)
  if (measure.sum > 1000 && !measure.isRate) {
    return 'volume';
  }
  
  return 'value';
}

/**
 * Build statistics for a single measure
 */
export function buildMeasureStats(
  measure: MeasureInfo,
  labelOverrides: Record<string, string> = {}
): MeasureStats {
  const displayName = labelOverrides[measure.name] || 
    measure.name
      .replace(/^(AGG|SUM|AVG|COUNT|CNTD|MIN|MAX|ATTR)\s*\(\s*/gi, '')
      .replace(/\s*\)$/g, '')
      .trim();
  
  const range = measure.max - measure.min;
  const spreadRatio = measure.avg > 0 ? range / measure.avg : 0;
  
  return {
    name: measure.name,
    displayName,
    type: detectMeasureType(measure),
    sum: measure.sum,
    avg: measure.avg,
    min: measure.min,
    max: measure.max,
    count: measure.count,
    range,
    spreadRatio,
    trend: calculateTrend(measure.values),
    sampleValues: measure.values?.slice(0, 10) // First 10 for context
  };
}

/**
 * Build segment statistics from breakdown data
 */
export function buildSegmentStats(breakdown: BreakdownData): SegmentStats {
  const totalValue = breakdown.data.reduce((sum, d) => sum + d.value, 0);
  const sorted = [...breakdown.data].sort((a, b) => b.value - a.value);
  
  const segments = sorted.map((d, i) => ({
    name: d.label || (d as any).dimension || 'Unknown',
    value: d.value,
    share: totalValue > 0 ? d.value / totalValue : 0,
    rank: i + 1
  }));
  
  const top3Share = segments.slice(0, 3).reduce((sum, s) => sum + s.share, 0);
  
  return {
    dimension: breakdown.dimension,
    measure: breakdown.measure.name,
    totalValue,
    segmentCount: segments.length,
    topSegment: segments[0] || { name: 'N/A', value: 0, share: 0 },
    top3Share,
    bottomSegment: segments[segments.length - 1] || { name: 'N/A', value: 0, share: 0 },
    segments
  };
}

/**
 * Detect relationships between measures - based on naming patterns
 */
function detectRelationships(measures: MeasureStats[]): LLMContext['relationships'] {
  const relationships: LLMContext['relationships'] = [];
  
  const rates = measures.filter(m => m.type === 'rate');
  const volumes = measures.filter(m => m.type === 'volume' || m.type === 'count');
  
  // Find rate-volume relationships by shared words
  for (const rate of rates) {
    const rateWords = rate.displayName.toLowerCase().split(/\s+/);
    
    for (const volume of volumes) {
      const volumeWords = volume.displayName.toLowerCase().split(/\s+/);
      const sharedWords = rateWords.filter(w => 
        volumeWords.some(vw => vw.includes(w) || w.includes(vw))
      );
      
      if (sharedWords.length > 0) {
        relationships.push({
          type: 'rate-volume',
          field1: rate.name,
          field2: volume.name,
          description: `${rate.displayName} may be calculated from ${volume.displayName}`
        });
      }
    }
  }
  
  return relationships;
}

/**
 * Build complete LLM context from analyzed data
 */
export function buildLLMContext(
  analyzed: AnalyzedData | AnalyzedData[],
  options: {
    dashboardName?: string;
    labelOverrides?: Record<string, string>;
    fieldDescriptions?: Record<string, string>;
    calculatedFieldFormulas?: Record<string, string>;
  } = {}
): LLMContext {
  // Normalize to array
  const dataArray = Array.isArray(analyzed) ? analyzed : [analyzed];
  
  // Merge all measures and breakdowns
  const allMeasures: MeasureInfo[] = [];
  const allBreakdowns: BreakdownData[] = [];
  const worksheetNames: string[] = [];
  const dataSourceNames: string[] = [];
  let dateRange: DateRange | undefined;
  
  for (const data of dataArray) {
    allMeasures.push(...data.measures);
    allBreakdowns.push(...data.breakdowns);
    if (data.dateRange && !dateRange) {
      dateRange = data.dateRange;
    }
  }
  
  // Build measure stats
  const measureStats = allMeasures.map(m => 
    buildMeasureStats(m, options.labelOverrides || {})
  );
  
  // Build segment stats
  const segmentStats = allBreakdowns.map(bd => buildSegmentStats(bd));
  
  // Detect relationships
  const relationships = detectRelationships(measureStats);
  
  return {
    dashboardName: options.dashboardName,
    worksheetNames,
    dataSourceNames,
    dateRange: dateRange ? {
      start: dateRange.minDate?.toISOString() || '',
      end: dateRange.maxDate?.toISOString() || '',
      fieldName: dateRange.fieldName
    } : undefined,
    fieldDescriptions: options.fieldDescriptions || {},
    calculatedFieldFormulas: options.calculatedFieldFormulas || {},
    measures: measureStats,
    segments: segmentStats,
    rateMeasures: measureStats.filter(m => m.type === 'rate'),
    volumeMeasures: measureStats.filter(m => m.type === 'volume' || m.type === 'count'),
    relationships
  };
}

/**
 * Format context as a prompt-friendly string for LLM
 */
export function formatContextForLLM(context: LLMContext): string {
  const parts: string[] = [];
  
  // Header
  if (context.dashboardName) {
    parts.push(`Dashboard: ${context.dashboardName}`);
  }
  
  if (context.dateRange) {
    parts.push(`Date Range: ${context.dateRange.start} to ${context.dateRange.end}`);
  }
  
  // Measures summary
  parts.push('\n## Measures');
  for (const m of context.measures) {
    const trendStr = m.trend 
      ? ` | Trend: ${m.trend.direction} (${m.trend.changePercent.toFixed(1)}%)`
      : '';
    parts.push(`- ${m.displayName} (${m.type}): avg=${m.avg.toFixed(4)}, sum=${m.sum.toFixed(2)}, range=[${m.min.toFixed(4)}, ${m.max.toFixed(4)}]${trendStr}`);
  }
  
  // Segments summary
  if (context.segments.length > 0) {
    parts.push('\n## Segment Analysis');
    for (const s of context.segments) {
      parts.push(`- ${s.measure} by ${s.dimension}: ${s.segmentCount} segments`);
      parts.push(`  Top: ${s.topSegment.name} (${(s.topSegment.share * 100).toFixed(1)}%)`);
      parts.push(`  Top 3 share: ${(s.top3Share * 100).toFixed(1)}%`);
    }
  }
  
  // Relationships
  if (context.relationships.length > 0) {
    parts.push('\n## Detected Relationships');
    for (const r of context.relationships) {
      parts.push(`- ${r.description}`);
    }
  }
  
  // Calculated field formulas (if available)
  if (Object.keys(context.calculatedFieldFormulas).length > 0) {
    parts.push('\n## Calculated Field Formulas');
    for (const [name, formula] of Object.entries(context.calculatedFieldFormulas)) {
      parts.push(`- ${name}: ${formula}`);
    }
  }
  
  return parts.join('\n');
}

/**
 * Generate a data-driven summary without making judgments
 * This provides raw facts that LLM can interpret
 */
export function generateDataSummary(context: LLMContext): {
  factualStatements: string[];
  comparisons: string[];
  distributions: string[];
} {
  const factualStatements: string[] = [];
  const comparisons: string[] = [];
  const distributions: string[] = [];
  
  // Factual statements about measures
  for (const m of context.measures) {
    if (m.type === 'rate') {
      factualStatements.push(`${m.displayName} is ${(m.avg * 100).toFixed(1)}%`);
    } else {
      factualStatements.push(`Total ${m.displayName} is ${m.sum.toLocaleString()}`);
    }
    
    if (m.trend && m.trend.direction !== 'stable') {
      factualStatements.push(
        `${m.displayName} ${m.trend.direction === 'increasing' ? 'increased' : 'decreased'} ` +
        `by ${Math.abs(m.trend.changePercent).toFixed(1)}% over the period`
      );
    }
  }
  
  // Comparisons between measures
  const rates = context.rateMeasures;
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => b.avg - a.avg);
    comparisons.push(
      `${sorted[0].displayName} (${(sorted[0].avg * 100).toFixed(1)}%) is the highest rate, ` +
      `while ${sorted[sorted.length - 1].displayName} (${(sorted[sorted.length - 1].avg * 100).toFixed(1)}%) is the lowest`
    );
  }
  
  // Distribution insights
  for (const s of context.segments) {
    distributions.push(
      `${s.dimension} has ${s.segmentCount} segments. ` +
      `"${s.topSegment.name}" leads with ${(s.topSegment.share * 100).toFixed(1)}% share. ` +
      `Top 3 segments account for ${(s.top3Share * 100).toFixed(1)}% of total.`
    );
  }
  
  return { factualStatements, comparisons, distributions };
}
