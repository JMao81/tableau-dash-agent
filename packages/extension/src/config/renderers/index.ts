/**
 * Renderers Index
 * Main entry point for all chart rendering functions
 */

// Re-export types
export * from './types';

// Re-export individual chart renderers
export { renderBarChart, renderHorizontalBarChart, setTooltipsEnabled as setBarTooltips } from './bar-charts';
export { renderPieChart, renderDonutChart, setTooltipsEnabled as setPieTooltips } from './pie-charts';
export { renderLineChart, renderAreaChart, setTooltipsEnabled as setLineTooltips } from './line-charts';
export { renderKPICard, renderMetricCards, setTooltipsEnabled as setKpiTooltips } from './kpi-cards';
export { renderDataTable, setTooltipsEnabled as setTableTooltips } from './data-table';

import { renderBarChart, renderHorizontalBarChart, setTooltipsEnabled as setBarTooltips } from './bar-charts';
import { renderPieChart, renderDonutChart, setTooltipsEnabled as setPieTooltips } from './pie-charts';
import { renderLineChart, renderAreaChart, setTooltipsEnabled as setLineTooltips } from './line-charts';
import { renderKPICard, renderMetricCards, setTooltipsEnabled as setKpiTooltips } from './kpi-cards';
import { renderDataTable, setTooltipsEnabled as setTableTooltips } from './data-table';
import { 
  DataPoint, 
  VizConfig, 
  COLOR_SCHEMES, 
  generateSequentialColors,
  getDefaultTheme
} from './types';

/**
 * Set tooltips enabled state for all renderers
 */
export function setTooltipsEnabled(enabled: boolean): void {
  setBarTooltips(enabled);
  setPieTooltips(enabled);
  setLineTooltips(enabled);
  setKpiTooltips(enabled);
  setTableTooltips(enabled);
}

/**
 * Column analysis result
 */
interface ColumnAnalysis {
  index: number;
  fieldName: string;
  dataType: string;
  isDate: boolean;
  isNumeric: boolean;
  uniqueCount: number;
  nameSuggestsDate: boolean;
  nameSuggestsMeasure: boolean;
  dimensionScore: number;
  dateScore: number;
  measureScore: number;
}

/**
 * Check if column values look like dates
 */
function columnLooksLikeDate(rows: any[], colIndex: number): boolean {
  if (rows.length === 0) return false;
  const sampleVals = rows.slice(0, Math.min(10, rows.length))
    .map(r => r[colIndex].formattedValue || r[colIndex].value)
    .filter((v: any) => v && v.toString().trim());
  
  if (sampleVals.length < 2) return false;
  
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
    /^\d{4}$/,
    /^Q[1-4]\s*\d{4}/i,
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
    /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
  ];
  
  const dateCount = sampleVals.filter((v: string) => {
    if (datePatterns.some(p => p.test(v))) return true;
    const parsed = Date.parse(v);
    return !isNaN(parsed) && parsed > 0;
  }).length;
  
  return dateCount / sampleVals.length >= 0.8;
}

/**
 * Check if column values are numeric
 */
function columnLooksLikeNumber(rows: any[], colIndex: number): boolean {
  if (rows.length === 0) return false;
  const sampleVals = rows.slice(0, Math.min(10, rows.length))
    .map(r => r[colIndex].value)
    .filter((v: any) => v !== null && v !== undefined);
  
  if (sampleVals.length === 0) return false;
  
  const numCount = sampleVals.filter((v: any) => !isNaN(parseFloat(v))).length;
  return numCount / sampleVals.length >= 0.8;
}

/**
 * Count unique values in a column
 */
function getUniqueCount(rows: any[], colIndex: number): number {
  const uniqueVals = new Set<string>();
  for (const row of rows) {
    uniqueVals.add(row[colIndex].formattedValue || row[colIndex].value);
  }
  return uniqueVals.size;
}

/**
 * Match field name with scoring
 */
function matchField(hint: string | undefined, fieldName: string): { score: number; matched: boolean } {
  if (!hint || !fieldName) return { score: 0, matched: false };
  
  const normalizeField = (str: string) => str.toLowerCase()
    .replace(/^(sum|avg|count|cntd|min|max|agg|attr)\s*\(/gi, '')
    .replace(/\)$/g, '')
    .trim();
  
  const hintNorm = normalizeField(hint);
  const fieldNorm = normalizeField(fieldName);
  
  if (hintNorm === fieldNorm) {
    return { score: 100, matched: true };
  }
  
  if (fieldNorm.includes(hintNorm) && hintNorm.length > 3) {
    return { score: 80, matched: true };
  }
  if (hintNorm.includes(fieldNorm) && fieldNorm.length > 3) {
    return { score: 80, matched: true };
  }
  
  const hintWords = hintNorm.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const fieldWords = fieldNorm.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  
  let matchingWords = 0;
  for (const hw of hintWords) {
    if (fieldWords.includes(hw)) matchingWords++;
  }
  
  if (hintWords.length > 0 && matchingWords / hintWords.length >= 0.5) {
    return { score: 50 + (matchingWords * 10), matched: true };
  }
  
  return { score: 0, matched: false };
}

/**
 * Extract date only from a value string
 */
function extractDateOnly(val: any): string {
  if (!val) return val;
  const str = String(val);
  
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  
  const fullDateMatch = str.match(/^(\w+\s+\d{1,2},?\s*\d{4})/);
  if (fullDateMatch) return fullDateMatch[1].replace(/,\s*$/, '');
  
  const usMatch = str.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (usMatch) return usMatch[1];
  
  const euMatch = str.match(/^(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
  if (euMatch) return euMatch[1];
  
  const shortMonthMatch = str.match(/^([A-Za-z]{3}\s+\d{1,2},?\s*\d{4})/);
  if (shortMonthMatch) return shortMonthMatch[1].replace(/,\s*$/, '');
  
  const dayMonthMatch = str.match(/^(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/);
  if (dayMonthMatch) return dayMonthMatch[1];
  
  const stripped = str.replace(/,?\s*\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i, '').trim();
  if (stripped !== str && stripped.length > 5) return stripped;
  
  return str;
}

/**
 * Parse date value from label
 */
function parseDateValue(label: string): Date | null {
  const months: Record<string, number> = { 
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, 
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 
  };
  
  const extractHour = (str: string): number => {
    const atTimeMatch = str.match(/at\s+(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
    if (atTimeMatch) {
      let hour = parseInt(atTimeMatch[1]);
      const isPM = atTimeMatch[2].toUpperCase() === 'PM';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour;
    }
    const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const isPM = timeMatch[3].toUpperCase() === 'PM';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour;
    }
    return 0;
  };
  
  let dateValue: Date | null = null;
  
  const fullDateTimeMatch = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/i);
  if (fullDateTimeMatch) {
    const hour = extractHour(label);
    dateValue = new Date(
      parseInt(fullDateTimeMatch[3]), 
      months[fullDateTimeMatch[1].toLowerCase().substring(0, 3)], 
      parseInt(fullDateTimeMatch[2]),
      hour, 0, 0
    );
  }
  
  if (!dateValue || isNaN(dateValue.getTime())) {
    const usMatch = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (usMatch) {
      let year = parseInt(usMatch[3]);
      if (year < 100) year += 2000;
      const hour = extractHour(label);
      dateValue = new Date(year, parseInt(usMatch[1]) - 1, parseInt(usMatch[2]), hour, 0, 0);
    }
  }
  
  if (!dateValue || isNaN(dateValue.getTime())) {
    const isoMatch = label.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]?(\d{2})?:?(\d{2})?/);
    if (isoMatch) {
      const hour = isoMatch[4] ? parseInt(isoMatch[4]) : 0;
      const minute = isoMatch[5] ? parseInt(isoMatch[5]) : 0;
      dateValue = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), hour, minute, 0);
    }
  }
  
  if (!dateValue || isNaN(dateValue.getTime())) {
    dateValue = new Date(label);
  }
  
  if (!dateValue || isNaN(dateValue.getTime())) {
    const monthYearMatch = label.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})$/i);
    if (monthYearMatch) {
      dateValue = new Date(parseInt(monthYearMatch[2]), months[monthYearMatch[1].toLowerCase().substring(0, 3)], 1);
    }
  }
  
  return (dateValue && !isNaN(dateValue.getTime())) ? dateValue : null;
}

/**
 * Main visualization rendering function
 * Handles data extraction from Tableau worksheet and delegates to specific renderers
 */
export async function renderVisualization(config: VizConfig): Promise<string> {
  const { 
    vizType, 
    worksheetObj, 
    measureField, 
    dimensionField, 
    title, 
    colorScheme = 'blue', 
    customColors = null, 
    colorMode = 'single', 
    showValues = true, 
    showLegend = true, 
    maxItems = 10, 
    sortBy = 'value', 
    sortOrder = 'desc', 
    theme = 'professional', 
    showAverageLine = false, 
    aggregateByDate = false, 
    aggregationType = 'sum' 
  } = config;
  
  // Fetch data from worksheet
  const summaryData = await worksheetObj.getSummaryDataAsync({ maxRows: 500 });
  const columns = summaryData.columns;
  const rows = summaryData.data;
  
  // Analyze all columns
  const columnAnalysis: ColumnAnalysis[] = columns.map((col: any, idx: number) => {
    const isDate = col.dataType === 'date' || col.dataType === 'datetime' || columnLooksLikeDate(rows, idx);
    const isNumeric = ['int', 'float', 'number'].includes(col.dataType) || columnLooksLikeNumber(rows, idx);
    const uniqueCount = getUniqueCount(rows, idx);
    const fieldNameLower = col.fieldName.toLowerCase();
    
    const nameSuggestsDate = /date|time|day|week|month|year|period|quarter/i.test(fieldNameLower) ||
      /^(DAY|MONTH|YEAR|WEEK|HOUR|QUARTER|DATEPART|DATETRUNC)\s*\(/i.test(col.fieldName);
    
    const nameSuggestsMeasure = /count|sum|avg|total|rate|amount|revenue|sales|profit|quantity|volume/i.test(fieldNameLower) ||
      /^(SUM|AVG|COUNT|CNTD|MIN|MAX|AGG)\s*\(/i.test(col.fieldName);
    
    return {
      index: idx,
      fieldName: col.fieldName,
      dataType: col.dataType,
      isDate,
      isNumeric,
      uniqueCount,
      nameSuggestsDate,
      nameSuggestsMeasure,
      dimensionScore: (!isNumeric ? 2 : 0) + (uniqueCount >= 2 && uniqueCount <= 50 ? 2 : 0) + (nameSuggestsDate ? 0 : 1),
      dateScore: (isDate ? 3 : 0) + (nameSuggestsDate ? 2 : 0) + (uniqueCount >= 3 ? 1 : 0),
      measureScore: (isNumeric ? 3 : 0) + (nameSuggestsMeasure ? 2 : 0)
    };
  });
  
  // Find dimension and measure columns
  let dimColIndex = -1;
  let measureColIndex = -1;
  
  // PRIORITY 1: Exact match
  if (dimensionField) {
    const exactDimMatch = columns.findIndex((c: any) => c.fieldName === dimensionField);
    if (exactDimMatch >= 0) dimColIndex = exactDimMatch;
  }
  
  if (measureField) {
    const exactMeasureMatch = columns.findIndex((c: any) => c.fieldName === measureField);
    if (exactMeasureMatch >= 0) measureColIndex = exactMeasureMatch;
  }
  
  // PRIORITY 2: Fuzzy matching
  if (dimColIndex === -1 || measureColIndex === -1) {
    if (dimColIndex === -1 && dimensionField) {
      const dimCandidates = columnAnalysis.filter(c => !c.nameSuggestsMeasure);
      let bestMatch: ColumnAnalysis | null = null;
      let bestScore = 0;
      
      for (const c of dimCandidates) {
        const result = matchField(dimensionField, c.fieldName);
        if (result.matched && result.score > bestScore) {
          bestScore = result.score;
          bestMatch = c;
        }
      }
      
      if (bestMatch) dimColIndex = bestMatch.index;
    }
    
    if (vizType === 'line' || vizType === 'area') {
      if (dimColIndex === -1) {
        const dateColumns = columnAnalysis.filter(c => c.isDate || c.nameSuggestsDate);
        if (dateColumns.length > 0) {
          dateColumns.sort((a, b) => b.dateScore - a.dateScore);
          dimColIndex = dateColumns[0].index;
        }
      }
    }
    
    if (dimColIndex === -1) {
      const dimCandidates = columnAnalysis.filter(c => !c.isNumeric || c.isDate);
      if (dimCandidates.length > 0) {
        dimCandidates.sort((a, b) => b.dimensionScore - a.dimensionScore);
        dimColIndex = dimCandidates[0].index;
      }
    }
    
    if (measureColIndex === -1) {
      const measureCandidates = columnAnalysis.filter(c => c.isNumeric && !c.isDate);
      
      if (measureField) {
        let bestMatch: ColumnAnalysis | null = null;
        let bestScore = 0;
        
        for (const c of measureCandidates) {
          const result = matchField(measureField, c.fieldName);
          if (result.matched && result.score > bestScore) {
            bestScore = result.score;
            bestMatch = c;
          }
        }
        
        if (bestMatch) measureColIndex = bestMatch.index;
      }
      
      if (measureColIndex === -1 && measureCandidates.length > 0) {
        measureCandidates.sort((a, b) => b.measureScore - a.measureScore);
        measureColIndex = measureCandidates[0].index;
      }
    }
  }
  
  const isDateDimension = dimColIndex >= 0 && columnAnalysis[dimColIndex].isDate;
  
  // Aggregate data
  const aggregated: Record<string, { sum: number; count: number }> = {};
  
  for (const row of rows) {
    let dimValue = dimColIndex >= 0 ? (row[dimColIndex].formattedValue || row[dimColIndex].value || 'Unknown') : 'Value';
    
    if (aggregateByDate && isDateDimension) {
      dimValue = extractDateOnly(dimValue);
    }
    
    const rawValue = measureColIndex >= 0 ? row[measureColIndex].value : 1;
    const measureValue = parseFloat(rawValue) || 0;
    
    if (!aggregated[dimValue]) {
      aggregated[dimValue] = { sum: 0, count: 0 };
    }
    aggregated[dimValue].sum += measureValue;
    aggregated[dimValue].count += 1;
  }
  
  // Convert to data points
  const dataPoints: DataPoint[] = [];
  for (const [label, data] of Object.entries(aggregated)) {
    let value: number;
    switch (aggregationType) {
      case 'average':
        value = data.count > 0 ? data.sum / data.count : 0;
        break;
      case 'count':
        value = data.count;
        break;
      case 'max':
      case 'min':
      case 'sum':
      default:
        value = data.sum;
    }
    
    const dateValue = isDateDimension ? parseDateValue(label) : null;
    dataPoints.push({ 
      label, 
      value, 
      count: data.count, 
      avg: data.count > 0 ? data.sum / data.count : 0, 
      dateValue 
    });
  }
  
  // Sort data
  if (isDateDimension && (vizType === 'line' || vizType === 'area')) {
    dataPoints.sort((a, b) => {
      if (a.dateValue && b.dateValue) {
        return a.dateValue.getTime() - b.dateValue.getTime();
      }
      return a.label.localeCompare(b.label);
    });
  } else if (sortBy === 'label') {
    dataPoints.sort((a, b) => {
      const aNum = parseFloat(a.label);
      const bNum = parseFloat(b.label);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortOrder === 'desc' ? bNum - aNum : aNum - bNum;
      }
      return sortOrder === 'desc' 
        ? b.label.localeCompare(a.label) 
        : a.label.localeCompare(b.label);
    });
  } else {
    dataPoints.sort((a, b) => sortOrder === 'desc' ? b.value - a.value : a.value - b.value);
  }
  
  // Limit data - for line/area, use higher default but respect explicit maxItems
  const effectiveMaxItems = (vizType === 'line' || vizType === 'area') 
    ? (config.maxItems !== undefined && config.maxItems !== 10 ? maxItems : 100) // Use explicit value, or default 100 for time series
    : maxItems;
  const limitedData = dataPoints.slice(0, effectiveMaxItems);
  
  // Get column names
  const dimName = dimColIndex >= 0 ? columns[dimColIndex].fieldName : 'Category';
  const measureName = measureColIndex >= 0 ? columns[measureColIndex].fieldName : 'Value';
  const vizTitle = title || `${measureName} by ${dimName}`;
  
  // Resolve colors
  let colors = customColors && customColors.length > 0 
    ? customColors 
    : (COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.tableau);
  
  let sequentialColors: string[] | null = null;
  if (colorMode === 'sequential') {
    const baseColor = colors[0] || '#3b82f6';
    sequentialColors = generateSequentialColors(baseColor, Math.max(limitedData.length, 10));
  }
  
  // Get theme config
  const themeConfig = getDefaultTheme(theme);
  
  // Render based on type
  switch (vizType) {
    case 'bar':
      return renderBarChart(limitedData, vizTitle, colors, showValues, measureName, themeConfig, colorMode, sequentialColors);
    case 'horizontal-bar':
      return renderHorizontalBarChart(limitedData, vizTitle, colors, showValues, measureName, themeConfig, colorMode, sequentialColors);
    case 'pie':
      return renderPieChart(limitedData, vizTitle, colors, showValues, showLegend, themeConfig);
    case 'donut':
      return renderDonutChart(limitedData, vizTitle, colors, showValues, showLegend, themeConfig);
    case 'kpi':
      return renderKPICard(limitedData, vizTitle, colors, measureName, themeConfig);
    case 'metric-cards':
      return renderMetricCards(limitedData, vizTitle, colors, themeConfig);
    case 'line':
      return renderLineChart(limitedData, vizTitle, colors, showValues, dimName, measureName, themeConfig, showAverageLine);
    case 'area':
      return renderAreaChart(limitedData, vizTitle, colors, showValues, dimName, measureName, themeConfig);
    case 'table':
      return renderDataTable(limitedData, vizTitle, dimName, measureName, themeConfig);
    default:
      return renderBarChart(limitedData, vizTitle, colors, showValues, measureName, themeConfig, colorMode, sequentialColors);
  }
}
