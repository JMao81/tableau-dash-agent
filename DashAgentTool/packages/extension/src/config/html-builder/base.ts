/**
 * HTML Builder - Base utilities and theme definitions
 * Shared across dashboard and story builders
 */

// ==================== THEME DEFINITIONS ====================

export interface ThemeConfig {
  name: string;
  bg: string;
  cardBg: string;
  headerBg: string;
  headerText: string;
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  textSecondary: string;  // Slightly muted text for descriptions
  textMuted: string;
  border: string;
  volumeColor: string;
  rateColor: string;
  kpiColors: string[];
  pieColors: string[];
}

export const THEMES: Record<string, ThemeConfig> = {
  professional: {
    name: 'Professional',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    headerText: '#ffffff',
    primary: '#1e40af',
    secondary: '#059669',
    tertiary: '#7c3aed',
    text: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    volumeColor: '#3b82f6',
    rateColor: '#10b981',
    kpiColors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'],
    pieColors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16']
  },
  modern: {
    name: 'Modern Dark',
    bg: '#0f172a',
    cardBg: '#1e293b',
    headerBg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    headerText: '#ffffff',
    primary: '#6366f1',
    secondary: '#22d3ee',
    tertiary: '#f472b6',
    text: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
    volumeColor: '#818cf8',
    rateColor: '#34d399',
    kpiColors: ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#fb7185', '#22d3ee'],
    pieColors: ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#22d3ee', '#a3e635']
  },
  minimal: {
    name: 'Minimal',
    bg: '#ffffff',
    cardBg: '#ffffff',
    headerBg: '#111827',
    headerText: '#ffffff',
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#9ca3af',
    border: '#f3f4f6',
    volumeColor: '#374151',
    rateColor: '#4b5563',
    kpiColors: ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
    pieColors: ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb']
  },
  colorful: {
    name: 'Colorful',
    bg: '#faf5ff',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    headerText: '#ffffff',
    primary: '#7c3aed',
    secondary: '#06b6d4',
    tertiary: '#f59e0b',
    text: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#e9d5ff',
    volumeColor: '#8b5cf6',
    rateColor: '#14b8a6',
    kpiColors: ['#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#3b82f6', '#84cc16'],
    pieColors: ['#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#3b82f6', '#84cc16', '#fbbf24']
  },
  blue: {
    name: 'Blue',
    bg: '#eff6ff',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    headerText: '#ffffff',
    primary: '#1e40af',
    secondary: '#3b82f6',
    tertiary: '#60a5fa',
    text: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    volumeColor: '#3b82f6',
    rateColor: '#10b981',
    kpiColors: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#10b981', '#059669'],
    pieColors: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#10b981']
  },
  green: {
    name: 'Green',
    bg: '#ecfdf5',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    headerText: '#ffffff',
    primary: '#065f46',
    secondary: '#10b981',
    tertiary: '#34d399',
    text: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#d1fae5',
    volumeColor: '#10b981',
    rateColor: '#059669',
    kpiColors: ['#065f46', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
    pieColors: ['#065f46', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5']
  },
  purple: {
    name: 'Purple',
    bg: '#faf5ff',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)',
    headerText: '#ffffff',
    primary: '#6b21a8',
    secondary: '#9333ea',
    tertiary: '#a855f7',
    text: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#e9d5ff',
    volumeColor: '#9333ea',
    rateColor: '#a855f7',
    kpiColors: ['#6b21a8', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'],
    pieColors: ['#6b21a8', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff']
  },
  corporate: {
    name: 'Corporate',
    bg: '#f9fafb',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
    headerText: '#ffffff',
    primary: '#1f2937',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    volumeColor: '#4b5563',
    rateColor: '#059669',
    kpiColors: ['#1f2937', '#4b5563', '#059669', '#0284c7', '#7c3aed', '#dc2626'],
    pieColors: ['#1f2937', '#4b5563', '#059669', '#0284c7', '#7c3aed', '#dc2626', '#f59e0b']
  },
  story: {
    name: 'Story',
    bg: '#fafafa',
    cardBg: '#ffffff',
    headerBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    headerText: '#ffffff',
    primary: '#0f172a',
    secondary: '#3b82f6',
    tertiary: '#10b981',
    text: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    volumeColor: '#3b82f6',
    rateColor: '#10b981',
    kpiColors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
    pieColors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16']
  }
};

// ==================== FORMATTING UTILITIES ====================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str) return str;
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format value for display
 */
export function formatValue(value: number, isRate: boolean): string {
  if (isRate) {
    // Smart rate formatting: detect if value is already percentage (0-100) or ratio (0-1)
    // If value > 1, it's likely already a percentage (e.g., 45 for 45%)
    // If value <= 1, it's likely a ratio (e.g., 0.45 for 45%)
    if (value > 1) {
      // Already a percentage, don't multiply by 100
      return value.toFixed(1) + '%';
    } else {
      // Ratio format, multiply by 100
      return (value * 100).toFixed(1) + '%';
    }
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Normalize field name to human-readable label
 */
export function normalizeFieldName(
  name: string, 
  labelOverrides: Record<string, string> = {}, 
  context: { isRate?: boolean; entityHint?: string } = {}
): string {
  if (!name) return name;
  
  // Check labelOverrides first (with and without trailing paren)
  if (labelOverrides[name]) return labelOverrides[name];
  const nameWithParen = name.endsWith(')') ? name : name + ')';
  const nameWithoutParen = name.replace(/\)$/, '');
  if (labelOverrides[nameWithParen]) return labelOverrides[nameWithParen];
  if (labelOverrides[nameWithoutParen]) return labelOverrides[nameWithoutParen];
  
  // Detect if this is a count aggregation - we'll need special handling
  const isCountAgg = /^(CNTD?|COUNT)\s*\(/i.test(name);
  
  // Detect if this is a date part function like DAY(Field), MONTH(Field), etc.
  const dateFuncMatch = name.match(/^(DAY|MONTH|YEAR|WEEK|QUARTER|HOUR|MINUTE|SECOND|DATEPART|DATENAME)\s*\(\s*(.+?)\s*\)$/i);
  if (dateFuncMatch) {
    const funcName = dateFuncMatch[1].charAt(0).toUpperCase() + dateFuncMatch[1].slice(1).toLowerCase();
    const innerField = normalizeFieldName(dateFuncMatch[2], labelOverrides, context);
    return `${funcName} of ${innerField}`;
  }
  
  // Handle unbalanced date part functions like "Day(recorded At" (missing closing paren)
  const unbalancedDateMatch = name.match(/^(DAY|MONTH|YEAR|WEEK|QUARTER|HOUR|MINUTE|SECOND)\s*\(\s*(.+)$/i);
  if (unbalancedDateMatch) {
    const funcName = unbalancedDateMatch[1].charAt(0).toUpperCase() + unbalancedDateMatch[1].slice(1).toLowerCase();
    const innerField = normalizeFieldName(unbalancedDateMatch[2], labelOverrides, context);
    return `${funcName} of ${innerField}`;
  }
  
  // Strip aggregation prefixes
  let cleaned = name
    .replace(/^(AGG|SUM|AVG|CNTD?|COUNT|ATTR|MIN|MAX|MEDIAN|STDEV|VAR)\s*\(\s*/gi, '')
    .replace(/\s*\)$/g, '')
    .trim();
  
  // If still has nested aggregation, clean again
  if (/^(AGG|SUM|AVG|CNTD?|COUNT)\s*\(/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/^(AGG|SUM|AVG|CNTD?|COUNT|ATTR|MIN|MAX)\s*\(\s*/gi, '')
      .replace(/\s*\)$/g, '')
      .trim();
  }
  
  // For count fields like CNTD(Id), provide meaningful labels based on context
  // The entity hint helps clarify what is being counted
  const lowerCleaned = cleaned.toLowerCase();
  
  if (isCountAgg && (lowerCleaned === 'id' || lowerCleaned === 'record' || lowerCleaned === '*')) {
    // Use entity hint if provided (e.g., "Emails", "Campaigns", "Orders")
    if (context.entityHint) {
      return `Total ${context.entityHint}`;
    }
    // Generic fallback - but signal that this needs context
    return 'Record Count';
  }
  
  // Common field mappings - more descriptive for counts
  const fieldMappings: Record<string, string> = {
    'click-to-open': 'Click-to-Open Rate',
    'clickthrough': 'Clickthrough Rate',
    'delivery': 'Delivery Rate',
    'open': 'Open Rate',
    'open rate': 'Open Rate',
    'bounce': 'Bounce Rate',
    'revenue': 'Revenue',
    'sales': 'Sales',
    'profit': 'Profit',
    'cost': 'Cost',
    'quantity': 'Quantity',
    'email': 'Emails',
    'emails': 'Emails',
    'campaign': 'Campaigns',
    'campaigns': 'Campaigns',
    'order': 'Orders',
    'orders': 'Orders',
    'customer': 'Customers',
    'customers': 'Customers',
    'user': 'Users',
    'users': 'Users',
    'transaction': 'Transactions',
    'transactions': 'Transactions'
  };
  
  if (fieldMappings[lowerCleaned]) {
    return fieldMappings[lowerCleaned];
  }
  
  // Convert to Title Case
  cleaned = cleaned
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  if (context.isRate && !cleaned.toLowerCase().includes('rate')) {
    cleaned += ' Rate';
  }
  
  return cleaned || name;
}

/**
 * Generate sparkline SVG points
 */
export function generateSparkline(values: number[], width: number = 60, height: number = 24): string {
  if (values.length < 2) return '';
  
  const sparkValues = values.slice(0, 20);
  const max = Math.max(...sparkValues);
  const min = Math.min(...sparkValues);
  const range = max - min || 1;
  
  const points = sparkValues.map((v, idx) => {
    const x = (idx / (sparkValues.length - 1)) * width;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');
  
  return points;
}

/**
 * Apply custom colors to a theme
 */
export function applyCustomColors(theme: ThemeConfig, customColors?: string[]): ThemeConfig {
  if (!customColors || customColors.length === 0) return theme;
  
  const primary = customColors[0];
  const secondary = customColors[1] || primary;
  const tertiary = customColors[2] || secondary;
  
  return {
    ...theme,
    primary,
    secondary,
    tertiary,
    volumeColor: primary,
    rateColor: secondary,
    headerBg: customColors.length >= 2
      ? `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
      : primary,
    kpiColors: customColors.slice(0, 6).concat(theme.kpiColors.slice(customColors.length)),
    pieColors: customColors.slice(0, 7).concat(theme.pieColors.slice(customColors.length))
  };
}

// ==================== DATA TYPES ====================

export interface MeasureInfo {
  name: string;
  index: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  values: number[];
  isRate: boolean;
  isCount: boolean;
  type: 'rate' | 'volume' | 'value';
}

export interface DimensionInfo {
  name: string;
  index: number;
  cardinality: number;
  values: string[];
}

export interface BreakdownData {
  measure: MeasureInfo;
  dimension: string;
  data: { label: string; value: number; count: number }[];
}

export interface DateRange {
  minDate: Date | null;
  maxDate: Date | null;
  fieldName: string;
}

export interface AnalyzedData {
  measures: MeasureInfo[];
  dimensions: DimensionInfo[];
  breakdowns: BreakdownData[];
  rowCount?: number;
  totalRows?: number;  // Alias for rowCount used in story builder
  totalRecords?: number;  // For Data Source section display
  dateRange?: DateRange;
  rows?: any[];  // Raw rows if needed
  worksheets?: { name: string; rowCount?: number }[];  // Source worksheet info
}

export interface BuildOptions {
  title?: string;
  labelOverrides?: Record<string, string>;
  theme?: string;
  customColors?: string[];
  maxMetrics?: number;
  maxItems?: number;
  focusMetrics?: string[];
  focusDimension?: string;
}

// ==================== DATA ANALYSIS ====================

/**
 * Analyze worksheet data and extract metrics
 */
export async function analyzeWorksheetData(
  ws: any, 
  options: BuildOptions
): Promise<AnalyzedData> {
  console.log('[analyzeWorksheetData] Starting analysis for worksheet:', ws?.name);
  
  let summary;
  try {
    summary = await ws.getSummaryDataAsync({ maxRows: 1000 });
  } catch (e: any) {
    console.error('[analyzeWorksheetData] getSummaryDataAsync failed:', e);
    return {
      measures: [],
      dimensions: [],
      breakdowns: [],
      rows: [],
      totalRows: 0,
    };
  }
  
  const columns = summary.columns;
  const rows = summary.data;
  
  console.log('[analyzeWorksheetData] Got', columns?.length || 0, 'columns and', rows?.length || 0, 'rows');
  
  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    console.warn('[analyzeWorksheetData] No data returned from worksheet');
    return {
      measures: [],
      dimensions: [],
      breakdowns: [],
      rows: [],
      totalRows: 0,
    };
  }
  
  const measures: MeasureInfo[] = [];
  const dimensions: DimensionInfo[] = [];
  let dateRange: DateRange | undefined;
  const maxMetrics = options.maxMetrics || 6;
  const maxItems = options.maxItems || 7;
  
  // Analyze columns
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const name = col.fieldName;
    const dtype = (col.dataType || '').toLowerCase();
    
    // Skip meta fields
    if (['Measure Names', 'Measure Values'].includes(name)) continue;
    
    // Detect date columns
    const isDateType = ['date', 'datetime', 'timestamp'].includes(dtype);
    const isDateField = isDateType || /date|time|day|month|year|week|period|quarter/i.test(name);
    
    if (isDateField && !dateRange) {
      // Try to extract date range from this column
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      
      for (const row of rows) {
        const val = row[i].value || row[i].formattedValue;
        if (!val) continue;
        
        // Try to parse as date
        let parsedDate: Date | null = null;
        if (val instanceof Date) {
          parsedDate = val;
        } else if (typeof val === 'string') {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        } else if (typeof val === 'number') {
          // Could be timestamp
          const d = new Date(val);
          if (!isNaN(d.getTime()) && d.getFullYear() > 1970 && d.getFullYear() < 2100) {
            parsedDate = d;
          }
        }
        
        if (parsedDate) {
          if (!minDate || parsedDate < minDate) minDate = parsedDate;
          if (!maxDate || parsedDate > maxDate) maxDate = parsedDate;
        }
      }
      
      if (minDate && maxDate) {
        dateRange = { minDate, maxDate, fieldName: name };
        console.log('[analyzeWorksheetData] Found date range:', name, minDate, 'to', maxDate);
      }
    }
    
    const isNumericType = ['int', 'float', 'number', 'integer', 'real', 'double'].includes(dtype);
    const isAggregate = /^(SUM|AVG|COUNT|CNTD|MIN|MAX|AGG|ATTR|MEDIAN)\s*\(/i.test(name);
    
    if (isNumericType || isAggregate) {
      let sum = 0, min = Infinity, max = -Infinity, count = 0;
      const values: number[] = [];
      
      for (const row of rows) {
        const val = parseFloat(row[i].value) || 0;
        values.push(val);
        sum += val;
        min = Math.min(min, val);
        max = Math.max(max, val);
        count++;
      }
      
      const avg = count > 0 ? sum / count : 0;
      
      // Detect if this is a rate field by name
      const isRateByName = !!name.toLowerCase().match(/rate|percent|%|ratio|pct|margin|share/);
      // Also detect by value range (0-1 with meaningful values)
      const isRateByValue = max <= 1 && min >= 0 && avg > 0 && avg <= 1;
      const isRate = isRateByName || isRateByValue;
      
      // Detect if rate values are in percentage format (0-100) vs ratio format (0-1)
      // If it's a rate by name but values are > 1, it's percentage format
      const isPercentageFormat = isRateByName && max > 1;
      
      // Normalize rate values to 0-1 ratio for consistent calculations
      let normalizedAvg = avg;
      let normalizedMin = min;
      let normalizedMax = max;
      let normalizedSum = sum;
      if (isRate && isPercentageFormat) {
        normalizedAvg = avg / 100;
        normalizedMin = min / 100;
        normalizedMax = max / 100;
        normalizedSum = sum / 100;
        console.log(`[analyzeWorksheetData] Rate "${name}" detected in percentage format (avg=${avg}%), normalizing to ratio (avg=${normalizedAvg})`);
      }
      
      const isCount = !!name.toLowerCase().match(/count|total|sum|volume|quantity|num|number|sales|revenue|profit|amount/);
      
      // For rates, use normalized values (0-1 scale) for consistent calculations
      measures.push({
        name,
        index: i,
        sum: isRate ? normalizedSum : sum,
        avg: isRate ? normalizedAvg : avg,
        min: isRate ? normalizedMin : min,
        max: isRate ? normalizedMax : max,
        count,
        values: isRate && isPercentageFormat ? values.map(v => v / 100) : values,
        isRate,
        isCount,
        type: isRate ? 'rate' : (isCount ? 'volume' : 'value')
      });
    } else if (dtype === 'string' || !isNumericType) {
      if (isAggregate) continue;
      
      const uniqueVals = new Set<string>();
      for (const row of rows) {
        const val = row[i].formattedValue || row[i].value;
        if (val) uniqueVals.add(String(val));
      }
      
      if (uniqueVals.size > 1 && uniqueVals.size <= 100) {
        dimensions.push({
          name,
          index: i,
          cardinality: uniqueVals.size,
          values: [...uniqueVals].slice(0, maxItems)
        });
      }
    }
  }
  
  // Select best dimension for charts
  let bestDim = options.focusDimension
    ? dimensions.find(d => d.name.toLowerCase().includes(options.focusDimension!.toLowerCase()))
    : dimensions.find(d => d.cardinality >= 3 && d.cardinality <= 15) || dimensions[0];
  
  // Filter measures by focus
  let selectedMeasures = measures;
  if (options.focusMetrics && options.focusMetrics.length > 0) {
    selectedMeasures = measures.filter(m =>
      options.focusMetrics!.some(fm => m.name.toLowerCase().includes(fm.toLowerCase()))
    );
    if (selectedMeasures.length === 0) selectedMeasures = measures;
  }
  selectedMeasures = selectedMeasures.slice(0, maxMetrics);
  
  // Build breakdowns for charts
  const breakdowns: BreakdownData[] = [];
  if (bestDim) {
    for (const measure of selectedMeasures) {
      const agg: Record<string, number> = {};
      const counts: Record<string, number> = {};
      
      for (const row of rows) {
        const dimVal = row[bestDim.index].formattedValue || row[bestDim.index].value || 'Unknown';
        const measureVal = parseFloat(row[measure.index].value) || 0;
        
        if (!agg[dimVal]) {
          agg[dimVal] = 0;
          counts[dimVal] = 0;
        }
        agg[dimVal] += measureVal;
        counts[dimVal]++;
      }
      
      const data = Object.entries(agg).map(([label, sum]) => ({
        label,
        value: measure.isRate ? (sum / counts[label]) : sum,
        count: counts[label]
      }));
      
      data.sort((a, b) => b.value - a.value);
      
      breakdowns.push({
        measure,
        dimension: bestDim.name,
        data: data.slice(0, maxItems)
      });
    }
  }
  
  return {
    measures: selectedMeasures,
    dimensions,
    breakdowns,
    rowCount: rows.length,
    dateRange
  };
}
