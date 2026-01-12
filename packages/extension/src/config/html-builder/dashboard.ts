/**
 * HTML Builder - Dashboard Generator
 * Builds complete dashboard HTML with KPIs and charts
 */

import { 
  THEMES, 
  BuildOptions, 
  AnalyzedData,
  MeasureInfo,
  BreakdownData,
  formatValue, 
  normalizeFieldName, 
  generateSparkline,
  applyCustomColors,
  analyzeWorksheetData
} from './base';
import { generateKpiCard, generateBarChart, generateLineChart } from './components';
import {
  LayoutElement,
  layoutElements,
  createKpiElement,
  createChartElement,
  createHeroElement,
  createKeyTakeawayElement,
  createFooterElement,
  getThemeConfig,
  generateDataInsights,
  insightsToElements
} from './layout-engine';

// ==================== SHARED HELPERS ====================

/**
 * Result from analyzing all worksheets
 */
interface WorksheetAnalysisResult {
  allMeasures: MeasureInfo[];
  allBreakdowns: BreakdownData[];
  worksheetDetails: { name: string; measures: number; rows: number }[];
}

/**
 * Shared analyzer that processes all worksheets and merges measures/breakdowns.
 * Used by both buildDashboardHtml and buildSmartDashboard to avoid duplication.
 */
async function analyzeAllWorksheets(
  worksheets: any[],
  options: BuildOptions,
  logPrefix: string = '[analyzeAllWorksheets]'
): Promise<WorksheetAnalysisResult> {
  const allMeasures: MeasureInfo[] = [];
  const allBreakdowns: BreakdownData[] = [];
  const worksheetDetails: { name: string; measures: number; rows: number }[] = [];

  for (const ws of worksheets) {
    if (!ws) continue;
    try {
      const analyzed = await analyzeWorksheetData(ws, options);
      worksheetDetails.push({
        name: ws.name || 'unknown',
        measures: analyzed.measures.length,
        rows: analyzed.rowCount || 0
      });

      // Merge measures (avoiding duplicates by name)
      for (const measure of analyzed.measures) {
        const existing = allMeasures.find(m => m.name === measure.name);
        if (!existing) {
          allMeasures.push(measure);
        } else {
          // For volumes, merge by adding sums but keep values array from the one with more points
          if (!measure.isRate) {
            existing.sum += measure.sum;
            existing.count += measure.count;
            existing.avg = existing.count > 0 ? existing.sum / existing.count : 0;
            if (measure.values && measure.values.length > (existing.values?.length || 0)) {
              existing.values = measure.values;
            }
          } else if (measure.count > existing.count) {
            // For rates, use the measure with more data points
            Object.assign(existing, measure);
          }
        }
      }

      allBreakdowns.push(...analyzed.breakdowns);
    } catch (e) {
      console.error(`${logPrefix} Error analyzing worksheet:`, ws.name, e);
    }
  }

  console.log(`${logPrefix} Analysis complete:`, {
    worksheetsAnalyzed: worksheetDetails.length,
    totalMeasures: allMeasures.length,
    totalBreakdowns: allBreakdowns.length,
    worksheetDetails
  });

  return { allMeasures, allBreakdowns, worksheetDetails };
}

// ==================== DASHBOARD BUILDER ====================

export interface DashboardResult {
  html: string;
  metrics: { name: string; value: string; raw: number }[];
  theme: string;
  chartsRendered: number;
}

// ==================== SMART DASHBOARD BUILDER (Layout Engine) ====================

/**
 * Extended options for smart dashboard
 */
export interface SmartDashboardOptions extends BuildOptions {
  includeInsights?: boolean;
  includeHero?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  keyTakeaway?: string;
  mode?: 'executive' | 'analytical' | 'compact' | 'full';
}

/**
 * Build smart dashboard using the Layout Engine
 * 
 * This function uses semantic element types and design heuristics
 * instead of hardcoded layouts. The layout engine intelligently
 * arranges elements based on their importance and type.
 */
export async function buildSmartDashboard(
  worksheets: any[],
  options: SmartDashboardOptions = {}
): Promise<DashboardResult> {
  const {
    title = 'Dashboard',
    labelOverrides = {},
    theme: themeName = 'professional',
    customColors,
    maxMetrics = 6,
    maxItems = 7,
    includeInsights = true,
    includeHero = true,
    heroTitle,
    heroSubtitle,
    keyTakeaway,
    mode = 'full'
  } = options;

  // Get theme
  const theme = getThemeConfig(themeName, customColors);

  // Analyze worksheets (same as before)
  console.log('[buildSmartDashboard] Analyzing', worksheets.length, 'worksheets');
  
  if (!worksheets || worksheets.length === 0) {
    return {
      html: `<div style="padding: 40px; text-align: center; color: #666;">No worksheet data available</div>`,
      metrics: [],
      theme: themeName,
      chartsRendered: 0
    };
  }

  // Collect measures and breakdowns from ALL worksheets
  const allMeasures: MeasureInfo[] = [];
  const allBreakdowns: BreakdownData[] = [];
  let globalDateRange: { minDate: Date | null; maxDate: Date | null; fieldName: string } | undefined;

  for (const ws of worksheets) {
    if (!ws) continue;
    try {
      const analyzed = await analyzeWorksheetData(ws, options);
      
      // Capture date range from first worksheet that has one
      if (analyzed.dateRange && !globalDateRange) {
        globalDateRange = analyzed.dateRange;
        console.log('[buildSmartDashboard] Found date range:', globalDateRange);
      }
      
      // Merge measures (avoiding duplicates)
      for (const measure of analyzed.measures) {
        const existing = allMeasures.find(m => m.name === measure.name);
        if (!existing) {
          allMeasures.push(measure);
        } else if (!measure.isRate) {
          existing.sum += measure.sum;
          existing.count += measure.count;
          existing.avg = existing.count > 0 ? existing.sum / existing.count : 0;
          if (measure.values && measure.values.length > (existing.values?.length || 0)) {
            existing.values = measure.values;
          }
        } else if (measure.count > existing.count) {
          Object.assign(existing, measure);
        }
      }
      
      allBreakdowns.push(...analyzed.breakdowns);
    } catch (e) {
      console.error('[buildSmartDashboard] Error analyzing worksheet:', ws.name, e);
    }
  }

  // Filter out identifier fields that shouldn't be treated as metrics
  const identifierPatterns = /^(id|ids|pk|key|guid|uuid|record_?id|row_?id|unique_?id|identifier)$/i;
  const filteredMeasures = allMeasures.filter(m => {
    // Extract the core field name (remove AGG, CNTD, etc.)
    const coreName = m.name
      .replace(/^(AGG|SUM|AVG|COUNT|CNTD|MIN|MAX|ATTR)\s*\(\s*/gi, '')
      .replace(/\s*\)$/g, '')
      .trim();
    
    // Skip if it matches identifier patterns
    if (identifierPatterns.test(coreName)) {
      console.log('[buildSmartDashboard] Filtering out identifier field:', m.name);
      return false;
    }
    return true;
  });
  
  console.log('[buildSmartDashboard] Filtered measures:', allMeasures.length, '->', filteredMeasures.length);
  
  // Debug: Log all measures with their values
  console.log('[buildSmartDashboard] All measures:');
  for (const m of filteredMeasures) {
    console.log(`  - ${m.name}: sum=${m.sum}, avg=${m.avg}, isRate=${m.isRate}`);
  }

  if (filteredMeasures.length === 0) {
    return {
      html: `<div style="padding: 40px; text-align: center; color: #666;">
        <h3>No Metrics Found</h3>
        <p>Analyzed ${worksheets.length} worksheets but found no numeric measures.</p>
      </div>`,
      metrics: [],
      theme: themeName,
      chartsRendered: 0
    };
  }

  // ==================== FIX RATE VALUES ====================
  // Look for a Summary worksheet that might have pre-calculated aggregates
  const summaryWorksheet = worksheets.find(ws => 
    ws?.name?.toLowerCase().includes('summary') || 
    ws?.name?.toLowerCase().includes('totals') ||
    ws?.name?.toLowerCase().includes('overview')
  );
  
  // Try to extract correct rate values from Summary worksheet
  const summaryRates: Map<string, number> = new Map();
  if (summaryWorksheet) {
    try {
      const summaryData = await summaryWorksheet.getSummaryDataAsync();
      const columns = summaryData.columns;
      const rows = summaryData.data;
      
      console.log('[buildSmartDashboard] Summary worksheet columns:', columns.map((c: any) => c.fieldName));
      console.log('[buildSmartDashboard] Summary worksheet rows:', rows.length);
      
      // Look for "Measure Names" / "Measure Values" pattern (common in Tableau)
      const measureNamesIdx = columns.findIndex((c: any) => 
        c.fieldName?.toLowerCase().includes('measure names')
      );
      const measureValuesIdx = columns.findIndex((c: any) => 
        c.fieldName?.toLowerCase().includes('measure values')
      );
      
      if (measureNamesIdx >= 0 && measureValuesIdx >= 0) {
        // Pattern 1: Measure Names / Measure Values pivoted format
        for (const row of rows) {
          const name = row[measureNamesIdx]?.value || '';
          const valueStr = row[measureValuesIdx]?.value || '0';
          const value = Number.parseFloat(String(valueStr).replaceAll(/[,%]/g, '')) || 0;
          
          // Store rate values (values between 0 and 1 or names containing 'rate')
          if (name.toLowerCase().includes('rate') || (value >= 0 && value <= 1)) {
            // Normalize if in percentage format (> 1)
            const normalizedValue = value > 1 ? value / 100 : value;
            summaryRates.set(name.toLowerCase(), normalizedValue);
            console.log('[buildSmartDashboard] Found summary rate (MN/MV):', name, '=', value, '→', normalizedValue);
          }
        }
      } else {
        // Pattern 2: Direct columns for each metric (e.g., "Open Rate" column)
        console.log('[buildSmartDashboard] Trying direct column lookup');
        
        // First, identify rate columns and volume columns
        const rateColIndices: { idx: number; name: string }[] = [];
        const volumeColIndices: { idx: number; name: string }[] = [];
        
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          const col = columns[colIdx];
          const colName = col.fieldName || '';
          const colNameLower = colName.toLowerCase();
          
          if (colNameLower.includes('rate') || colNameLower.includes('percent') || colNameLower.includes('%')) {
            rateColIndices.push({ idx: colIdx, name: colName });
          } else if (colNameLower.match(/count|total|sum|volume|quantity|sent|delivered|opened|clicked|email/)) {
            volumeColIndices.push({ idx: colIdx, name: colName });
          }
        }
        
        console.log('[buildSmartDashboard] Rate columns:', rateColIndices.map(c => c.name));
        console.log('[buildSmartDashboard] Volume columns:', volumeColIndices.map(c => c.name));
        
        // If there's only 1 row, use direct values (true summary)
        if (rows.length === 1) {
          for (const { idx, name } of rateColIndices) {
            const valueStr = rows[0][idx]?.value || '0';
            const value = Number.parseFloat(String(valueStr).replaceAll(/[,%]/g, '')) || 0;
            // Normalize if in percentage format (> 1)
            const normalizedValue = value > 1 ? value / 100 : value;
            summaryRates.set(name.toLowerCase(), normalizedValue);
            console.log('[buildSmartDashboard] Found summary rate (single row):', name, '=', value, '→', normalizedValue);
          }
        } else if (rows.length > 1 && volumeColIndices.length > 0) {
          // Multiple rows: compute weighted average using volume
          // Find a suitable "total" column for weighting
          const weightColIdx = volumeColIndices.find(v => 
            v.name.toLowerCase().match(/sent|total|count|volume|^cntd/i)
          )?.idx ?? volumeColIndices[0]?.idx;
          
          if (weightColIdx !== undefined) {
            let totalWeight = 0;
            for (const row of rows) {
              const w = Number.parseFloat(String(row[weightColIdx]?.value || '0').replaceAll(/[,%]/g, '')) || 0;
              totalWeight += w;
            }
            
            for (const { idx, name } of rateColIndices) {
              let weightedSum = 0;
              for (const row of rows) {
                const weight = Number.parseFloat(String(row[weightColIdx]?.value || '0').replaceAll(/[,%]/g, '')) || 0;
                const value = Number.parseFloat(String(row[idx]?.value || '0').replaceAll(/[,%]/g, '')) || 0;
                weightedSum += weight * value;
              }
              
              const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
              // Normalize if in percentage format (> 1)
              const normalizedValue = weightedAvg > 1 ? weightedAvg / 100 : weightedAvg;
              summaryRates.set(name.toLowerCase(), normalizedValue);
              console.log('[buildSmartDashboard] Found summary rate (weighted avg):', name, '=', weightedAvg, '→', normalizedValue);
            }
          }
        }
      }
    } catch (e) {
      console.log('[buildSmartDashboard] Could not extract summary rates:', e);
    }
  }
  
  // ==================== DYNAMIC RATE CALCULATION ====================
  // Instead of hardcoded formulas, we dynamically infer rate relationships
  // by parsing the rate name and finding matching volume measures
  
  /**
   * Extract the "subject" from a rate name
   * E.g., "Open Rate" → "open", "Click-to-Open Rate" → ["click", "open"]
   */
  const extractRateSubject = (rateName: string): string[] => {
    const cleaned = rateName.toLowerCase()
      .replace(/^(agg|sum|avg|count|cntd|min|max|attr)\s*\(\s*/gi, '')
      .replace(/\s*\)$/g, '')
      .replace(/\s*rate\s*/gi, '')
      .replace(/\s*%\s*/gi, '')
      .replace(/\s*ratio\s*/gi, '')
      .replace(/\s*percent(age)?\s*/gi, '')
      .trim();
    
    // Split on common separators
    return cleaned.split(/[\s\-_\/]+/).filter(s => s.length > 0);
  };
  
  /**
   * Find a volume measure that matches any of the subject words
   * Returns the measure with the highest sum (most likely the correct aggregate)
   */
  const findMatchingVolume = (subjects: string[], excludeMeasure: string): MeasureInfo | undefined => {
    const candidates = filteredMeasures.filter(m => {
      if (m.isRate) return false;
      if (m.name === excludeMeasure) return false;
      
      const nameLower = m.name.toLowerCase();
      // Check if any subject word appears in the measure name
      return subjects.some(subject => nameLower.includes(subject));
    });
    
    // Return the one with highest sum (most likely the primary metric)
    if (candidates.length === 0) return undefined;
    return candidates.reduce((best, current) => 
      current.sum > best.sum ? current : best
    );
  };
  
  // Build a map of volume measures for rate calculation
  const volumeMeasures = filteredMeasures.filter(m => !m.isRate);
  console.log('[buildSmartDashboard] Volume measures available:', volumeMeasures.map(m => `${m.name}=${m.sum}`));
  console.log('[buildSmartDashboard] Summary rates found:', [...summaryRates.entries()]);
  
  // Helper to normalize field names for comparison
  const normalizeForMatch = (name: string): string => {
    return name.toLowerCase()
      .replace(/^(agg|sum|avg|count|cntd|min|max|attr)\s*\(\s*/gi, '')
      .replace(/\s*\)$/g, '')
      .replaceAll(/[\s\-_()]/g, '')
      .trim();
  };
  
  // Apply summary rates or calculate from volumes
  for (const measure of filteredMeasures) {
    if (!measure.isRate) continue;
    
    const normalizedMeasureName = normalizeForMatch(measure.name);
    console.log('[buildSmartDashboard] Looking for rate match for:', measure.name, '→', normalizedMeasureName);
    
    // First, try to find in summary worksheet using fuzzy matching
    let foundRate: number | undefined;
    let matchedSummaryName: string | undefined;
    
    for (const [summaryName, summaryValue] of summaryRates) {
      const normalizedSummaryName = normalizeForMatch(summaryName);
      
      // Try multiple matching strategies
      const exactMatch = normalizedSummaryName === normalizedMeasureName;
      const containsMatch = normalizedSummaryName.includes(normalizedMeasureName) || 
                           normalizedMeasureName.includes(normalizedSummaryName);
      
      // Also try matching key rate words (open, click, delivery, etc.)
      const rateKeywords = ['open', 'click', 'delivery', 'delivered', 'clickthrough', 'cto', 'bounce', 'unsubscribe'];
      const measureKeyword = rateKeywords.find(kw => normalizedMeasureName.includes(kw));
      const summaryKeyword = rateKeywords.find(kw => normalizedSummaryName.includes(kw));
      const keywordMatch = measureKeyword && summaryKeyword && measureKeyword === summaryKeyword;
      
      if (exactMatch || containsMatch || keywordMatch) {
        foundRate = summaryValue;
        matchedSummaryName = summaryName;
        console.log('[buildSmartDashboard] Using summary rate:', measure.name, '↔', summaryName, '=', summaryValue,
          `(exact=${exactMatch}, contains=${containsMatch}, keyword=${keywordMatch})`);
        break;
      }
    }
    
    if (foundRate !== undefined) {
      measure.avg = foundRate;
      measure.sum = foundRate;
      console.log('[buildSmartDashboard] Applied summary rate to', measure.name, ':', foundRate);
    } else {
      // Dynamic calculation: extract subject and find matching volumes
      const subjects = extractRateSubject(measure.name);
      console.log('[buildSmartDashboard] Rate subjects for', measure.name, ':', subjects);
      
      if (subjects.length > 0) {
        // Find numerator (measure matching the rate subject)
        const numerator = findMatchingVolume(subjects, measure.name);
        
        if (numerator) {
          // Find denominator - typically a larger measure
          // Look for common denominators in order of likelihood
          const denominatorCandidates = volumeMeasures
            .filter(m => m.name !== numerator.name && m.sum > numerator.sum)
            .sort((a, b) => a.sum - b.sum); // Smallest that's still larger
          
          const denominator = denominatorCandidates[0];
          
          if (denominator && denominator.sum > 0) {
            const calculatedRate = numerator.sum / denominator.sum;
            console.log('[buildSmartDashboard] Calculated rate for', measure.name, ':',
              numerator.name, '/', denominator.name, '=', calculatedRate.toFixed(4));
            measure.avg = calculatedRate;
            measure.sum = calculatedRate;
          } else {
            console.log('[buildSmartDashboard] No denominator found for', measure.name);
          }
        } else {
          console.log('[buildSmartDashboard] No numerator found for', measure.name);
        }
      }
    }
  }

  // ==================== SORT KPIs LOGICALLY ====================
  // Group by type: Counts/Volumes first, then Rates
  // Within each group, sort by value (descending for counts, alphabetically for rates)
  const sortedMeasures = [...filteredMeasures].sort((a, b) => {
    // First: separate counts from rates
    if (!a.isRate && b.isRate) return -1; // Counts before rates
    if (a.isRate && !b.isRate) return 1;  // Rates after counts
    
    // Within counts: sort by sum (descending - largest first)
    if (!a.isRate && !b.isRate) {
      return b.sum - a.sum;
    }
    
    // Within rates: sort by common order (Delivery -> Open -> Clickthrough -> Click-to-Open)
    if (a.isRate && b.isRate) {
      const rateOrder: Record<string, number> = {
        'delivery': 1,
        'delivered': 1,
        'open': 2,
        'opened': 2,
        'click': 3,
        'clickthrough': 3,
        'click-to-open': 4,
        'click to open': 4,
        'cto': 4
      };
      
      const getOrder = (name: string): number => {
        const lower = name.toLowerCase();
        for (const [key, order] of Object.entries(rateOrder)) {
          if (lower.includes(key)) return order;
        }
        return 99; // Unknown rates at end
      };
      
      return getOrder(a.name) - getOrder(b.name);
    }
    
    return 0;
  });

  // Build layout elements array
  const elements: LayoutElement[] = [];
  const metricsOutput: { name: string; value: string; raw: number }[] = [];

  // Format date range for display
  const formatDateRange = (): string => {
    if (!globalDateRange?.minDate || !globalDateRange?.maxDate) {
      return '';
    }
    const formatDate = (d: Date): string => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };
    return `${formatDate(globalDateRange.minDate)} - ${formatDate(globalDateRange.maxDate)}`;
  };

  // 1. Hero Section (if enabled)
  if (includeHero) {
    const autoTitle = heroTitle || title;
    const dateRangeStr = formatDateRange();
    const autoSubtitle = heroSubtitle || (
      dateRangeStr 
        ? `${dateRangeStr} · ${sortedMeasures.length} metrics across ${worksheets.length} data sources`
        : `Analyzing ${sortedMeasures.length} metrics across ${worksheets.length} data sources`
    );
    elements.push(createHeroElement(autoTitle, autoSubtitle));
  }

  // 2. Generate insights (if enabled)
  if (includeInsights) {
    const insights = generateDataInsights(sortedMeasures, allBreakdowns, {
      maxInsights: mode === 'executive' ? 3 : 4  // Generate one extra since we use first for takeaway
    });
    
    // Add key takeaway if we have insights (use first insight)
    if (insights.length > 0) {
      const topInsight = insights[0];
      const takeawayText = keyTakeaway || topInsight.description;
      elements.push(createKeyTakeawayElement('Key Takeaway', takeawayText));
    }
    
    // Add remaining insight elements (skip the first one since it's used as key takeaway)
    const remainingInsights = insights.slice(1);
    const maxInsightCards = mode === 'executive' ? 2 : 3;
    elements.push(...insightsToElements(remainingInsights.slice(0, maxInsightCards)));
  }

  // 3. KPI Elements (using sorted measures for logical grouping)
  const kpiCount = Math.min(sortedMeasures.length, maxMetrics);
  for (let i = 0; i < kpiCount; i++) {
    const m = sortedMeasures[i];
    const displayValue = m.isRate ? m.avg : m.sum;
    const label = normalizeFieldName(m.name, labelOverrides, { isRate: m.isRate });
    const valueStr = formatValue(displayValue, m.isRate);
    const color = theme.kpiColors[i % theme.kpiColors.length];
    
    // Calculate change
    let change: string | undefined;
    let changeDirection: 'up' | 'down' | 'neutral' | undefined;
    if (m.values && m.values.length >= 2) {
      const latest = m.values[m.values.length - 1];
      const previous = m.values[m.values.length - 2];
      if (previous !== 0 && latest !== undefined && previous !== undefined) {
        const pctChange = ((latest - previous) / Math.abs(previous)) * 100;
        if (Math.abs(pctChange) >= 0.1) {
          change = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
          changeDirection = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'neutral';
        }
      }
    }

    elements.push(createKpiElement(
      `kpi-${i}`,
      label,
      valueStr,
      {
        change,
        changeDirection,
        sparklineData: m.values,
        color,
        importance: i < 3 ? 'primary' : 'secondary'
      }
    ));

    metricsOutput.push({ name: label, value: valueStr, raw: displayValue });
  }

  // 4. Chart Elements - detect time-series vs categorical
  const isDateDimension = (dimName: string): boolean => {
    const lower = dimName.toLowerCase();
    return lower.includes('day of') || 
           lower.includes('month of') || 
           lower.includes('year of') ||
           lower.includes('date') ||
           lower.includes('week') ||
           lower.includes('quarter') ||
           lower.includes('time') ||
           /^\d{4}/.test(dimName) || // "2024", "2023-01" etc.
           /\d{2}\/\d{2}/.test(dimName); // "01/15" date patterns
  };
  
  // Separate time-series from categorical breakdowns
  const timeSeriesBreakdowns = allBreakdowns.filter(bd => isDateDimension(bd.dimension));
  const categoricalBreakdowns = allBreakdowns.filter(bd => !isDateDimension(bd.dimension));
  
  const usedMeasures = new Set<string>();
  // Increased chart limits: compact=1, executive=3, full=4
  const maxCharts = mode === 'compact' ? 1 : mode === 'executive' ? 3 : 4;
  let chartCount = 0;
  
  // First: Add time-series charts as LINE CHARTS
  for (const bd of timeSeriesBreakdowns) {
    if (usedMeasures.has(bd.measure.name)) continue;
    if (chartCount >= maxCharts) break;
    
    usedMeasures.add(bd.measure.name);
    const measureLabel = normalizeFieldName(bd.measure.name, labelOverrides, { isRate: bd.measure.isRate });
    const dimLabel = normalizeFieldName(bd.dimension, labelOverrides);
    const chartTitle = `${measureLabel} over ${dimLabel}`;
    const color = theme.kpiColors[chartCount % theme.kpiColors.length];

    // Sort data chronologically for time series
    const sortedData = [...bd.data].sort((a, b) => {
      // Try to parse as date
      const dateA = new Date(a.dimension);
      const dateB = new Date(b.dimension);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() - dateB.getTime();
      }
      // Fallback to string comparison
      return String(a.dimension).localeCompare(String(b.dimension));
    });

    // Generate LINE chart for time series
    const chartHtml = generateLineChart({
      title: chartTitle,
      data: sortedData,
      isRate: bd.measure.isRate,
      color,
      theme,
      labelOverrides,
      maxItems: maxItems * 2 // Allow more points for time series
    });

    elements.push(createChartElement(
      `chart-${chartCount}`,
      chartTitle,
      chartHtml,
      {
        chartType: 'line',
        importance: chartCount === 0 ? 'primary' : 'secondary'
      }
    ));
    
    chartCount++;
  }
  
  // Second: Add categorical breakdowns as BAR CHARTS
  for (const bd of categoricalBreakdowns) {
    if (usedMeasures.has(bd.measure.name)) continue;
    if (chartCount >= maxCharts) break;
    
    usedMeasures.add(bd.measure.name);
    const measureLabel = normalizeFieldName(bd.measure.name, labelOverrides, { isRate: bd.measure.isRate });
    const dimLabel = normalizeFieldName(bd.dimension, labelOverrides);
    const chartTitle = `${measureLabel} by ${dimLabel}`;
    const color = theme.kpiColors[chartCount % theme.kpiColors.length];

    const chartHtml = generateBarChart({
      title: chartTitle,
      data: bd.data,
      isRate: bd.measure.isRate,
      color,
      theme,
      labelOverrides,
      maxItems
    });

    elements.push(createChartElement(
      `chart-${chartCount}`,
      chartTitle,
      chartHtml,
      {
        chartType: 'horizontal-bar',
        importance: chartCount === 0 ? 'primary' : 'secondary'
      }
    ));
    
    chartCount++;
  }

  // 5. Footer
  elements.push(createFooterElement());

  // Use Layout Engine to render
  const layoutResult = layoutElements(elements, {
    theme,
    maxColumns: 12,
    gapSize: 16,
    containerMaxWidth: '1200px',
    includeContainer: true
  });

  // Add append marker for additional content
  const htmlWithMarker = layoutResult.html.replace(
    '</div></div>',
    `\n    <!-- DASHAGENT_APPEND_MARKER -->\n  </div></div>`
  );

  return {
    html: htmlWithMarker,
    metrics: metricsOutput,
    theme: themeName,
    chartsRendered: chartCount
  };
}
