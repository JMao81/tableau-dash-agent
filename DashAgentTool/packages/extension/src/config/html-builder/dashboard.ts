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

  for (const ws of worksheets) {
    if (!ws) continue;
    try {
      const analyzed = await analyzeWorksheetData(ws, options);
      
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

  if (allMeasures.length === 0) {
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

  // Build layout elements array
  const elements: LayoutElement[] = [];
  const metricsOutput: { name: string; value: string; raw: number }[] = [];

  // 1. Hero Section (if enabled)
  if (includeHero) {
    const autoTitle = heroTitle || title;
    const autoSubtitle = heroSubtitle || `Analyzing ${allMeasures.length} metrics across ${worksheets.length} data sources`;
    elements.push(createHeroElement(autoTitle, autoSubtitle));
  }

  // 2. Generate insights (if enabled)
  if (includeInsights) {
    const insights = generateDataInsights(allMeasures, allBreakdowns, {
      maxInsights: mode === 'executive' ? 2 : 3
    });
    
    // Add key takeaway if we have insights
    if (insights.length > 0) {
      const topInsight = insights[0];
      const takeawayText = keyTakeaway || topInsight.description;
      elements.push(createKeyTakeawayElement('Key Takeaway', takeawayText));
    }
    
    // Add insight elements
    elements.push(...insightsToElements(insights));
  }

  // 3. KPI Elements
  const kpiCount = Math.min(allMeasures.length, maxMetrics);
  for (let i = 0; i < kpiCount; i++) {
    const m = allMeasures[i];
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
  const maxCharts = mode === 'compact' ? 1 : mode === 'executive' ? 2 : 3;
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
