/**
 * Statistical Analysis Utilities
 * Provides functions for data profiling, anomaly detection, and insight discovery
 */

export interface ColumnStats {
  name: string;
  dataType: 'number' | 'string' | 'date' | 'boolean' | 'mixed';
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  // Numeric stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  skewness?: number;
  // String stats
  minLength?: number;
  maxLength?: number;
  topValues?: Array<{ value: string; count: number; percentage: number }>;
  // Distribution info
  distribution?: 'normal' | 'skewed-left' | 'skewed-right' | 'uniform' | 'bimodal' | 'unknown';
}

export interface DataProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnStats[];
  warnings: string[];
  insights: string[];
}

export interface Anomaly {
  type: 'outlier' | 'null-spike' | 'sudden-change' | 'unusual-pattern' | 'duplicate' | 'negative-value';
  severity: 'low' | 'medium' | 'high';
  column: string;
  description: string;
  values?: any[];
  rowIndices?: number[];
  suggestion?: string;
}

export interface HiddenInsight {
  type: 'concentration' | 'correlation' | 'trend' | 'segment' | 'gap' | 'opportunity';
  title: string;
  description: string;
  evidence: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Detect the data type of a column based on its values
 */
export function detectDataType(values: any[]): 'number' | 'string' | 'date' | 'boolean' | 'mixed' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) return 'string';
  
  const types = new Set<string>();
  
  for (const value of nonNullValues.slice(0, 100)) { // Sample first 100
    if (typeof value === 'boolean') {
      types.add('boolean');
    } else if (typeof value === 'number' || (!isNaN(Number(value)) && value !== '')) {
      types.add('number');
    } else if (value instanceof Date || (typeof value === 'string' && isValidDate(value))) {
      types.add('date');
    } else {
      types.add('string');
    }
  }
  
  if (types.size === 1) {
    const firstType = types.values().next().value;
    return firstType as 'number' | 'string' | 'date' | 'boolean' | 'mixed';
  }
  
  // If mostly numbers with some strings, treat as number
  if (types.has('number') && types.size === 2) {
    return 'number';
  }
  
  return 'mixed';
}

function isValidDate(str: string): boolean {
  const date = new Date(str);
  return date instanceof Date && !isNaN(date.getTime()) && !!str.match(/\d{4}|\d{1,2}\/\d{1,2}/);
}

/**
 * Calculate statistics for a numeric column
 */
export function calculateNumericStats(values: number[]): Partial<ColumnStats> {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v));
  
  if (nums.length === 0) {
    return {};
  }
  
  const sorted = [...nums].sort((a, b) => a - b);
  const n = sorted.length;
  
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  const variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  
  // Calculate skewness
  const skewness = nums.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;
  
  let distribution: ColumnStats['distribution'] = 'unknown';
  if (Math.abs(skewness) < 0.5) {
    distribution = 'normal';
  } else if (skewness < -0.5) {
    distribution = 'skewed-left';
  } else if (skewness > 0.5) {
    distribution = 'skewed-right';
  }
  
  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100,
    skewness: Math.round(skewness * 100) / 100,
    distribution,
  };
}

/**
 * Calculate statistics for a categorical/string column
 */
export function calculateCategoricalStats(values: any[]): Partial<ColumnStats> {
  const strings = values.filter(v => v !== null && v !== undefined).map(String);
  
  if (strings.length === 0) {
    return {};
  }
  
  const lengths = strings.map(s => s.length);
  const valueCounts = new Map<string, number>();
  
  for (const val of strings) {
    valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
  }
  
  const sortedCounts = [...valueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const topValues = sortedCounts.map(([value, count]) => ({
    value,
    count,
    percentage: Math.round((count / strings.length) * 100 * 10) / 10,
  }));
  
  return {
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    topValues,
  };
}

/**
 * Profile an entire dataset
 */
export function profileData(data: Record<string, any>[]): DataProfile {
  if (!data || data.length === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      columns: [],
      warnings: ['No data to analyze'],
      insights: [],
    };
  }
  
  const columnNames = Object.keys(data[0]);
  const columns: ColumnStats[] = [];
  const warnings: string[] = [];
  const insights: string[] = [];
  
  for (const colName of columnNames) {
    const values = data.map(row => row[colName]);
    const dataType = detectDataType(values);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues);
    
    const baseStats: ColumnStats = {
      name: colName,
      dataType,
      totalCount: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueValues.size,
    };
    
    // Add type-specific stats
    if (dataType === 'number') {
      const numericValues = values
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(n => !isNaN(n));
      Object.assign(baseStats, calculateNumericStats(numericValues));
    } else {
      Object.assign(baseStats, calculateCategoricalStats(values));
    }
    
    columns.push(baseStats);
    
    // Generate warnings
    const nullPct = (baseStats.nullCount / baseStats.totalCount) * 100;
    if (nullPct > 10) {
      warnings.push(`${colName}: ${nullPct.toFixed(1)}% null values`);
    }
    
    if (baseStats.uniqueCount === 1) {
      warnings.push(`${colName}: Only one unique value (constant column)`);
    }
    
    if (baseStats.uniqueCount === baseStats.totalCount && dataType !== 'number') {
      insights.push(`${colName}: All unique values - potential ID column`);
    }
  }
  
  // High-level insights
  if (data.length < 100) {
    warnings.push(`Small dataset (${data.length} rows) - statistical measures may not be reliable`);
  }
  
  return {
    rowCount: data.length,
    columnCount: columnNames.length,
    columns,
    warnings,
    insights,
  };
}

/**
 * Detect anomalies in the data
 */
export function detectAnomalies(data: Record<string, any>[]): Anomaly[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  const anomalies: Anomaly[] = [];
  const columnNames = Object.keys(data[0]);
  
  for (const colName of columnNames) {
    const values = data.map(row => row[colName]);
    const dataType = detectDataType(values);
    
    // Detect outliers for numeric columns
    if (dataType === 'number') {
      const numericValues = values
        .map((v, idx) => ({ value: Number(v), index: idx }))
        .filter(item => !isNaN(item.value));
      
      if (numericValues.length > 10) {
        const nums = numericValues.map(item => item.value);
        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outliers = numericValues.filter(
          item => item.value < lowerBound || item.value > upperBound
        );
        
        if (outliers.length > 0 && outliers.length < numericValues.length * 0.1) {
          anomalies.push({
            type: 'outlier',
            severity: outliers.length > 5 ? 'high' : 'medium',
            column: colName,
            description: `${outliers.length} outlier values detected outside range [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
            values: outliers.slice(0, 10).map(o => o.value),
            rowIndices: outliers.slice(0, 10).map(o => o.index),
            suggestion: `Review these extreme values: ${outliers.slice(0, 5).map(o => o.value).join(', ')}`,
          });
        }
        
        // Detect negative values in typically positive columns
        const negatives = numericValues.filter(item => item.value < 0);
        const positives = numericValues.filter(item => item.value > 0);
        
        if (negatives.length > 0 && negatives.length < positives.length * 0.1) {
          // Most values are positive, but some negatives exist
          const colNameLower = colName.toLowerCase();
          if (colNameLower.includes('sales') || colNameLower.includes('revenue') || 
              colNameLower.includes('quantity') || colNameLower.includes('amount')) {
            anomalies.push({
              type: 'negative-value',
              severity: 'medium',
              column: colName,
              description: `${negatives.length} negative values in typically positive column`,
              values: negatives.slice(0, 10).map(n => n.value),
              rowIndices: negatives.slice(0, 10).map(n => n.index),
              suggestion: 'These might be returns, refunds, or data entry errors',
            });
          }
        }
      }
    }
    
    // Detect null spikes
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const nullPct = (nullCount / values.length) * 100;
    
    if (nullPct > 20 && nullPct < 100) {
      anomalies.push({
        type: 'null-spike',
        severity: nullPct > 50 ? 'high' : 'medium',
        column: colName,
        description: `${nullPct.toFixed(1)}% of values are null or empty`,
        suggestion: 'Consider data quality investigation or imputation strategies',
      });
    }
    
    // Detect duplicates for ID-like columns
    if (dataType === 'string') {
      const colNameLower = colName.toLowerCase();
      if (colNameLower.includes('id') || colNameLower.includes('key') || colNameLower.includes('code')) {
        const valueCounts = new Map<string, number>();
        values.forEach((v, idx) => {
          if (v) {
            const key = String(v);
            valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
          }
        });
        
        const duplicates = [...valueCounts.entries()].filter(([_, count]) => count > 1);
        if (duplicates.length > 0 && duplicates.length < valueCounts.size * 0.1) {
          anomalies.push({
            type: 'duplicate',
            severity: 'medium',
            column: colName,
            description: `${duplicates.length} duplicate values found in ID column`,
            values: duplicates.slice(0, 5).map(([val, count]) => `${val} (${count}x)`),
            suggestion: 'Verify if duplicates are expected or indicate data issues',
          });
        }
      }
    }
  }
  
  return anomalies;
}

/**
 * Find hidden insights in the data - patterns that might not be obvious
 */
export function findHiddenInsights(data: Record<string, any>[], context?: string): HiddenInsight[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  const insights: HiddenInsight[] = [];
  const columnNames = Object.keys(data[0]);
  
  // Find numeric and categorical columns
  const numericCols: string[] = [];
  const categoricalCols: string[] = [];
  
  for (const col of columnNames) {
    const dataType = detectDataType(data.map(row => row[col]));
    if (dataType === 'number') {
      numericCols.push(col);
    } else if (dataType === 'string') {
      categoricalCols.push(col);
    }
  }
  
  // 1. Concentration Analysis - are a few items dominating?
  for (const col of categoricalCols) {
    const valueCounts = new Map<string, number>();
    let total = 0;
    
    data.forEach(row => {
      const val = row[col];
      if (val) {
        valueCounts.set(String(val), (valueCounts.get(String(val)) || 0) + 1);
        total++;
      }
    });
    
    const sorted = [...valueCounts.entries()].sort((a, b) => b[1] - a[1]);
    
    if (sorted.length >= 10) {
      // Check if top 20% of categories represent 80%+ of data (Pareto)
      const top20Pct = Math.ceil(sorted.length * 0.2);
      const top20Count = sorted.slice(0, top20Pct).reduce((sum, [_, count]) => sum + count, 0);
      const top20Ratio = top20Count / total;
      
      if (top20Ratio > 0.8) {
        insights.push({
          type: 'concentration',
          title: `High concentration in ${col}`,
          description: `Top ${top20Pct} values (${Math.round(top20Ratio * 100)}%) dominate ${col}`,
          evidence: `Top values: ${sorted.slice(0, 3).map(([v, c]) => `${v} (${c})`).join(', ')}`,
          actionable: true,
          priority: 'high',
        });
      }
    }
    
    // Check if single value dominates
    if (sorted.length > 1) {
      const [topValue, topCount] = sorted[0];
      const topPct = topCount / total;
      
      if (topPct > 0.5) {
        insights.push({
          type: 'concentration',
          title: `Dominant value in ${col}`,
          description: `"${topValue}" represents ${Math.round(topPct * 100)}% of all ${col} values`,
          evidence: `${topCount} out of ${total} rows`,
          actionable: true,
          priority: topPct > 0.8 ? 'high' : 'medium',
        });
      }
    }
  }
  
  // 2. Segment Analysis - find segments with different behavior
  for (const catCol of categoricalCols.slice(0, 3)) { // Limit to first 3 categorical cols
    for (const numCol of numericCols.slice(0, 3)) { // Limit to first 3 numeric cols
      const segmentStats = new Map<string, { sum: number; count: number; values: number[] }>();
      
      data.forEach(row => {
        const cat = String(row[catCol] || 'Unknown');
        const num = Number(row[numCol]);
        
        if (!isNaN(num)) {
          if (!segmentStats.has(cat)) {
            segmentStats.set(cat, { sum: 0, count: 0, values: [] });
          }
          const stats = segmentStats.get(cat)!;
          stats.sum += num;
          stats.count++;
          stats.values.push(num);
        }
      });
      
      if (segmentStats.size >= 2 && segmentStats.size <= 20) {
        const segmentAvgs = [...segmentStats.entries()]
          .map(([cat, stats]) => ({
            category: cat,
            avg: stats.sum / stats.count,
            count: stats.count,
          }))
          .filter(s => s.count >= 5) // Minimum sample size
          .sort((a, b) => b.avg - a.avg);
        
        if (segmentAvgs.length >= 2) {
          const top = segmentAvgs[0];
          const bottom = segmentAvgs[segmentAvgs.length - 1];
          const ratio = top.avg / bottom.avg;
          
          if (ratio > 2 && isFinite(ratio)) {
            insights.push({
              type: 'segment',
              title: `${numCol} varies significantly by ${catCol}`,
              description: `"${top.category}" has ${ratio.toFixed(1)}x higher average ${numCol} than "${bottom.category}"`,
              evidence: `${top.category}: ${top.avg.toFixed(2)} (n=${top.count}) vs ${bottom.category}: ${bottom.avg.toFixed(2)} (n=${bottom.count})`,
              actionable: true,
              priority: ratio > 5 ? 'high' : 'medium',
            });
          }
        }
      }
    }
  }
  
  // 3. Gap Analysis - find missing expected values
  for (const col of categoricalCols) {
    const colNameLower = col.toLowerCase();
    
    // Check for common patterns
    if (colNameLower.includes('month') || colNameLower.includes('day') || colNameLower.includes('year')) {
      const uniqueValues = new Set(data.map(row => row[col]).filter(v => v));
      
      // This is a simplified check - could be extended for specific patterns
      if (uniqueValues.size > 0 && uniqueValues.size < 12) {
        // Potentially missing months
        insights.push({
          type: 'gap',
          title: `Potential gaps in ${col}`,
          description: `Only ${uniqueValues.size} unique values found`,
          evidence: `Values present: ${[...uniqueValues].slice(0, 5).join(', ')}${uniqueValues.size > 5 ? '...' : ''}`,
          actionable: true,
          priority: 'low',
        });
      }
    }
  }
  
  // 4. Correlation hints (simplified)
  if (numericCols.length >= 2) {
    for (let i = 0; i < Math.min(numericCols.length - 1, 3); i++) {
      for (let j = i + 1; j < Math.min(numericCols.length, 4); j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];
        
        const pairs = data
          .map(row => ({ x: Number(row[col1]), y: Number(row[col2]) }))
          .filter(p => !isNaN(p.x) && !isNaN(p.y));
        
        if (pairs.length >= 20) {
          const correlation = calculateCorrelation(pairs);
          
          if (Math.abs(correlation) > 0.7) {
            insights.push({
              type: 'correlation',
              title: `Strong correlation: ${col1} ↔ ${col2}`,
              description: `${correlation > 0 ? 'Positive' : 'Negative'} correlation (r=${correlation.toFixed(2)})`,
              evidence: `As ${col1} ${correlation > 0 ? 'increases' : 'increases'}, ${col2} tends to ${correlation > 0 ? 'increase' : 'decrease'}`,
              actionable: true,
              priority: Math.abs(correlation) > 0.9 ? 'high' : 'medium',
            });
          }
        }
      }
    }
  }
  
  return insights;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(pairs: Array<{ x: number; y: number }>): number {
  const n = pairs.length;
  if (n < 2) return 0;
  
  const sumX = pairs.reduce((s, p) => s + p.x, 0);
  const sumY = pairs.reduce((s, p) => s + p.y, 0);
  const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
  const sumY2 = pairs.reduce((s, p) => s + p.y * p.y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}
