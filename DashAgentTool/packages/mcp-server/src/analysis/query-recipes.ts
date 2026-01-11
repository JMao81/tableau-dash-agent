/**
 * Query Recipes for Tableau MCP
 * 
 * These are pre-defined query patterns that leverage Tableau's aggregation engine
 * to get summarized data efficiently instead of pulling raw rows.
 * 
 * The agent uses these recipes with the Tableau MCP `query-datasource` tool.
 */

export interface QueryRecipe {
  name: string;
  description: string;
  purpose: string;
  query: {
    fields: Array<{
      fieldCaption: string;
      function?: string;
      fieldAlias?: string;
      binSize?: number;
      sortDirection?: 'ASC' | 'DESC';
      sortPriority?: number;
    }>;
    filters?: Array<any>;
  };
  // Placeholder markers for dynamic field insertion
  placeholders?: {
    MEASURE_FIELD?: string;
    DIMENSION_FIELD?: string;
    ID_FIELD?: string;
  };
}

export interface AnalysisStrategy {
  name: string;
  description: string;
  steps: Array<{
    step: number;
    action: string;
    tool: 'get-datasource-metadata' | 'query-datasource' | 'list-datasources';
    purpose: string;
    queryTemplate?: QueryRecipe['query'];
    expectedTokens: number;
  }>;
  totalExpectedTokens: number;
}

/**
 * Basic statistical profile queries
 */
export const STAT_RECIPES = {
  // Get total row count
  rowCount: (idField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: idField, function: 'COUNT', fieldAlias: 'Total Rows' }
    ]
  }),

  // Get measure statistics (SUM, AVG, MIN, MAX)
  measureStats: (measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: measureField, function: 'SUM', fieldAlias: `Total ${measureField}` },
      { fieldCaption: measureField, function: 'AVG', fieldAlias: `Avg ${measureField}` },
      { fieldCaption: measureField, function: 'MIN', fieldAlias: `Min ${measureField}` },
      { fieldCaption: measureField, function: 'MAX', fieldAlias: `Max ${measureField}` },
    ]
  }),

  // Get measure breakdown by dimension
  measureByDimension: (measureField: string, dimensionField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dimensionField },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: `Total ${measureField}`, sortDirection: 'DESC', sortPriority: 1 },
      { fieldCaption: measureField, function: 'AVG', fieldAlias: `Avg ${measureField}` },
      { fieldCaption: measureField, function: 'COUNT', fieldAlias: 'Count' },
    ]
  }),

  // Get distribution using bins
  distribution: (measureField: string, binSize: number): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: measureField, binSize, fieldAlias: `${measureField} Range`, sortDirection: 'ASC', sortPriority: 1 },
      { fieldCaption: measureField, function: 'COUNT', fieldAlias: 'Count' },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total' },
    ]
  }),

  // Get dimension cardinality (unique value counts)
  dimensionCardinality: (dimensionField: string, idField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dimensionField },
      { fieldCaption: idField, function: 'COUNT', fieldAlias: 'Count', sortDirection: 'DESC', sortPriority: 1 },
    ]
  }),
};

/**
 * Concentration/Pareto analysis queries
 */
export const CONCENTRATION_RECIPES = {
  // Top N by measure (for concentration analysis)
  topN: (dimensionField: string, measureField: string, n: number = 10): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dimensionField },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: `Total ${measureField}`, sortDirection: 'DESC', sortPriority: 1 },
    ],
    filters: [
      {
        field: { fieldCaption: dimensionField },
        filterType: 'TOP',
        howMany: n,
        direction: 'TOP',
        fieldToMeasure: { fieldCaption: measureField, function: 'SUM' }
      }
    ]
  }),

  // Bottom N by measure (for tail analysis)
  bottomN: (dimensionField: string, measureField: string, n: number = 10): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dimensionField },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: `Total ${measureField}`, sortDirection: 'ASC', sortPriority: 1 },
    ],
    filters: [
      {
        field: { fieldCaption: dimensionField },
        filterType: 'TOP',
        howMany: n,
        direction: 'BOTTOM',
        fieldToMeasure: { fieldCaption: measureField, function: 'SUM' }
      }
    ]
  }),

  // Get total for percentage calculation
  grandTotal: (measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Grand Total' },
    ]
  }),
};

/**
 * Segment comparison queries
 */
export const SEGMENT_RECIPES = {
  // Compare segments across a measure
  segmentComparison: (segmentField: string, measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: segmentField },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total', sortDirection: 'DESC', sortPriority: 1 },
      { fieldCaption: measureField, function: 'AVG', fieldAlias: 'Average' },
      { fieldCaption: measureField, function: 'COUNT', fieldAlias: 'Count' },
      { fieldCaption: measureField, function: 'MIN', fieldAlias: 'Min' },
      { fieldCaption: measureField, function: 'MAX', fieldAlias: 'Max' },
    ]
  }),

  // Two-level breakdown
  twoLevelBreakdown: (level1: string, level2: string, measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: level1 },
      { fieldCaption: level2 },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total', sortDirection: 'DESC', sortPriority: 1 },
    ]
  }),
};

/**
 * Time-based analysis queries
 */
export const TIME_RECIPES = {
  // Monthly trend
  monthlyTrend: (dateField: string, measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dateField, function: 'TRUNC_MONTH', fieldAlias: 'Month', sortDirection: 'ASC', sortPriority: 1 },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total' },
      { fieldCaption: measureField, function: 'COUNT', fieldAlias: 'Count' },
    ]
  }),

  // Yearly summary
  yearlySummary: (dateField: string, measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dateField, function: 'YEAR', fieldAlias: 'Year', sortDirection: 'ASC', sortPriority: 1 },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total' },
      { fieldCaption: measureField, function: 'AVG', fieldAlias: 'Average' },
      { fieldCaption: measureField, function: 'COUNT', fieldAlias: 'Count' },
    ]
  }),

  // Quarter comparison
  quarterlyTrend: (dateField: string, measureField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dateField, function: 'TRUNC_QUARTER', fieldAlias: 'Quarter', sortDirection: 'ASC', sortPriority: 1 },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total' },
    ]
  }),
};

/**
 * Anomaly detection queries
 */
export const ANOMALY_RECIPES = {
  // Find negative values (potential returns/errors)
  negativeValues: (measureField: string, dimensionField: string): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: dimensionField },
      { fieldCaption: measureField, function: 'SUM', fieldAlias: 'Total' },
    ],
    filters: [
      {
        field: { fieldCaption: measureField, function: 'SUM' },
        filterType: 'QUANTITATIVE_NUMERICAL',
        quantitativeFilterType: 'MAX',
        max: 0,
      }
    ]
  }),

  // Find outliers using distribution
  outlierDistribution: (measureField: string, binSize: number): QueryRecipe['query'] => ({
    fields: [
      { fieldCaption: measureField, binSize, fieldAlias: 'Range' },
      { fieldCaption: measureField, function: 'COUNT', fieldAlias: 'Count' },
    ]
  }),
};

/**
 * Pre-built analysis strategies that combine multiple queries
 */
export const ANALYSIS_STRATEGIES: Record<string, AnalysisStrategy> = {
  'quick-profile': {
    name: 'Quick Data Profile',
    description: 'Fast overview of a datasource with key statistics',
    steps: [
      {
        step: 1,
        action: 'Get field metadata to understand data structure',
        tool: 'get-datasource-metadata',
        purpose: 'Identify dimensions, measures, and their types',
        expectedTokens: 200,
      },
      {
        step: 2,
        action: 'Get row count and basic stats for main measures',
        tool: 'query-datasource',
        purpose: 'Understand data volume and measure ranges',
        expectedTokens: 100,
      },
      {
        step: 3,
        action: 'Get cardinality for key dimensions',
        tool: 'query-datasource',
        purpose: 'Understand how many unique values exist',
        expectedTokens: 150,
      },
    ],
    totalExpectedTokens: 450,
  },

  'concentration-analysis': {
    name: 'Concentration/Pareto Analysis',
    description: 'Find if a few items dominate the results (80/20 rule)',
    steps: [
      {
        step: 1,
        action: 'Get grand total for the measure',
        tool: 'query-datasource',
        purpose: 'Baseline for percentage calculations',
        expectedTokens: 50,
      },
      {
        step: 2,
        action: 'Get top 10 contributors',
        tool: 'query-datasource',
        purpose: 'Identify major contributors',
        expectedTokens: 100,
      },
      {
        step: 3,
        action: 'Get top 20% count and their total',
        tool: 'query-datasource',
        purpose: 'Calculate Pareto ratio',
        expectedTokens: 100,
      },
    ],
    totalExpectedTokens: 250,
  },

  'segment-deep-dive': {
    name: 'Segment Comparison',
    description: 'Compare performance across categories/segments',
    steps: [
      {
        step: 1,
        action: 'Get segment-level aggregations',
        tool: 'query-datasource',
        purpose: 'Compare totals, averages, and counts across segments',
        expectedTokens: 150,
      },
      {
        step: 2,
        action: 'Get two-level breakdown (segment + sub-category)',
        tool: 'query-datasource',
        purpose: 'Understand composition within segments',
        expectedTokens: 200,
      },
    ],
    totalExpectedTokens: 350,
  },

  'trend-analysis': {
    name: 'Time Trend Analysis',
    description: 'Analyze performance over time',
    steps: [
      {
        step: 1,
        action: 'Get yearly summary',
        tool: 'query-datasource',
        purpose: 'High-level trend over years',
        expectedTokens: 100,
      },
      {
        step: 2,
        action: 'Get monthly trend for recent period',
        tool: 'query-datasource',
        purpose: 'Detailed recent performance',
        expectedTokens: 150,
      },
    ],
    totalExpectedTokens: 250,
  },

  'anomaly-scan': {
    name: 'Anomaly Detection',
    description: 'Find unusual patterns in the data',
    steps: [
      {
        step: 1,
        action: 'Get distribution of key measures',
        tool: 'query-datasource',
        purpose: 'Identify outlier ranges',
        expectedTokens: 100,
      },
      {
        step: 2,
        action: 'Check for negative values in typically positive measures',
        tool: 'query-datasource',
        purpose: 'Find potential data quality issues',
        expectedTokens: 100,
      },
      {
        step: 3,
        action: 'Get bottom performers',
        tool: 'query-datasource',
        purpose: 'Identify underperformers or errors',
        expectedTokens: 100,
      },
    ],
    totalExpectedTokens: 300,
  },
};

/**
 * Generate analysis instructions for the agent
 */
export function generateAnalysisInstructions(
  strategyName: keyof typeof ANALYSIS_STRATEGIES,
  datasourceLuid: string,
  fieldInfo: {
    measures: string[];
    dimensions: string[];
    dateFields: string[];
    idField?: string;
  }
): string {
  const strategy = ANALYSIS_STRATEGIES[strategyName];
  if (!strategy) {
    return `Unknown strategy: ${strategyName}`;
  }

  const instructions: string[] = [
    `## ${strategy.name}`,
    '',
    `**Purpose:** ${strategy.description}`,
    `**Estimated tokens:** ~${strategy.totalExpectedTokens}`,
    `**Datasource:** ${datasourceLuid}`,
    '',
    '### Available Fields:',
    `- **Measures:** ${fieldInfo.measures.join(', ') || 'None identified'}`,
    `- **Dimensions:** ${fieldInfo.dimensions.join(', ') || 'None identified'}`,
    `- **Date Fields:** ${fieldInfo.dateFields.join(', ') || 'None identified'}`,
    '',
    '### Recommended Queries:',
    '',
  ];

  // Add strategy-specific query examples
  const primaryMeasure = fieldInfo.measures[0] || 'Sales';
  const primaryDimension = fieldInfo.dimensions[0] || 'Category';
  const idField = fieldInfo.idField || fieldInfo.dimensions[0] || 'Order ID';

  switch (strategyName) {
    case 'quick-profile':
      instructions.push(
        '1. **Row Count:**',
        '```json',
        JSON.stringify(STAT_RECIPES.rowCount(idField), null, 2),
        '```',
        '',
        `2. **${primaryMeasure} Statistics:**`,
        '```json',
        JSON.stringify(STAT_RECIPES.measureStats(primaryMeasure), null, 2),
        '```',
        '',
        `3. **${primaryDimension} Distribution:**`,
        '```json',
        JSON.stringify(STAT_RECIPES.dimensionCardinality(primaryDimension, idField), null, 2),
        '```',
      );
      break;

    case 'concentration-analysis':
      instructions.push(
        '1. **Grand Total:**',
        '```json',
        JSON.stringify(CONCENTRATION_RECIPES.grandTotal(primaryMeasure), null, 2),
        '```',
        '',
        `2. **Top 10 ${primaryDimension} by ${primaryMeasure}:**`,
        '```json',
        JSON.stringify(CONCENTRATION_RECIPES.topN(primaryDimension, primaryMeasure, 10), null, 2),
        '```',
      );
      break;

    case 'segment-deep-dive':
      instructions.push(
        `1. **${primaryDimension} Comparison:**`,
        '```json',
        JSON.stringify(SEGMENT_RECIPES.segmentComparison(primaryDimension, primaryMeasure), null, 2),
        '```',
      );
      break;

    case 'trend-analysis': {
      const dateField = fieldInfo.dateFields[0] || 'Order Date';
      instructions.push(
        '1. **Yearly Trend:**',
        '```json',
        JSON.stringify(TIME_RECIPES.yearlySummary(dateField, primaryMeasure), null, 2),
        '```',
        '',
        '2. **Monthly Trend:**',
        '```json',
        JSON.stringify(TIME_RECIPES.monthlyTrend(dateField, primaryMeasure), null, 2),
        '```',
      );
      break;
    }

    case 'anomaly-scan':
      instructions.push(
        `1. **${primaryMeasure} Distribution (binSize: 1000):**`,
        '```json',
        JSON.stringify(ANOMALY_RECIPES.outlierDistribution(primaryMeasure, 1000), null, 2),
        '```',
        '',
        `2. **Negative ${primaryMeasure} Check:**`,
        '```json',
        JSON.stringify(ANOMALY_RECIPES.negativeValues(primaryMeasure, primaryDimension), null, 2),
        '```',
      );
      break;
  }

  return instructions.join('\n');
}

/**
 * Interpret aggregated results and generate insights
 */
export function interpretConcentration(
  topNData: Array<Record<string, any>>,
  grandTotal: number,
  measureField: string,
  dimensionField: string
): {
  paretoRatio: number;
  isConcentrated: boolean;
  topContributors: Array<{ name: string; value: number; percentage: number }>;
  insight: string;
} {
  const topContributors = topNData.map(row => {
    const value = row[`Total ${measureField}`] || row['Total'] || row[measureField] || 0;
    return {
      name: String(row[dimensionField]),
      value: Number(value),
      percentage: grandTotal > 0 ? (Number(value) / grandTotal) * 100 : 0,
    };
  });

  const topNTotal = topContributors.reduce((sum, c) => sum + c.value, 0);
  const paretoRatio = grandTotal > 0 ? (topNTotal / grandTotal) * 100 : 0;
  const isConcentrated = paretoRatio > 50; // Top 10 > 50% is concentrated

  let insight = '';
  if (paretoRatio > 80) {
    insight = `⚠️ High concentration risk: Top ${topNData.length} ${dimensionField}s represent ${paretoRatio.toFixed(1)}% of total ${measureField}. This creates significant dependency.`;
  } else if (paretoRatio > 50) {
    insight = `📊 Moderate concentration: Top ${topNData.length} ${dimensionField}s represent ${paretoRatio.toFixed(1)}% of total ${measureField}.`;
  } else {
    insight = `✅ Healthy distribution: Top ${topNData.length} ${dimensionField}s represent only ${paretoRatio.toFixed(1)}% of total ${measureField}.`;
  }

  return {
    paretoRatio,
    isConcentrated,
    topContributors,
    insight,
  };
}

/**
 * Interpret segment comparison results
 */
export function interpretSegmentComparison(
  segmentData: Array<Record<string, any>>,
  measureField: string,
  segmentField: string
): {
  segments: Array<{ name: string; total: number; avg: number; count: number }>;
  variance: number;
  topSegment: string;
  bottomSegment: string;
  insight: string;
} {
  const segments = segmentData.map(row => ({
    name: String(row[segmentField]),
    total: Number(row['Total'] || row[`Total ${measureField}`] || 0),
    avg: Number(row['Average'] || row[`Avg ${measureField}`] || 0),
    count: Number(row['Count'] || 0),
  })).sort((a, b) => b.total - a.total);

  const topSegment = segments[0]?.name || 'Unknown';
  const bottomSegment = segments.at(-1)?.name || 'Unknown';

  const avgTotal = segments.reduce((sum, s) => sum + s.total, 0) / segments.length;
  const variance = segments.reduce((sum, s) => sum + Math.pow(s.total - avgTotal, 2), 0) / segments.length;
  const coeffOfVariation = avgTotal > 0 ? (Math.sqrt(variance) / avgTotal) * 100 : 0;

  let insight = '';
  if (segments.length >= 2) {
    const ratio = segments[0].total / (segments.at(-1)!.total || 1);
    if (ratio > 5) {
      insight = `⚠️ Large disparity: "${topSegment}" has ${ratio.toFixed(1)}x more ${measureField} than "${bottomSegment}". Consider investigating underperforming segments.`;
    } else if (ratio > 2) {
      insight = `📊 Moderate variance: "${topSegment}" leads with ${ratio.toFixed(1)}x more than "${bottomSegment}".`;
    } else {
      insight = `✅ Balanced segments: All ${segmentField}s perform within 2x of each other.`;
    }
  }

  return {
    segments,
    variance: coeffOfVariation,
    topSegment,
    bottomSegment,
    insight,
  };
}
