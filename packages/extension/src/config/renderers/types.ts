/**
 * Renderer Types
 * Type definitions specific to chart rendering
 */

export interface ThemeConfig {
  isDark: boolean;
  bg: string;
  bgSecondary?: string;
  bgAlt?: string;
  bgHeader?: string;
  bgFooter?: string;
  bgHover?: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  gridLine?: string;
  axisLine?: string;
  barBg?: string;
  hoverBg?: string;
}

export interface DataPoint {
  label: string;
  value: number;
  count?: number;
  avg?: number;
  dateValue?: Date | null;
}

export interface VizConfig {
  vizType: 'bar' | 'horizontal-bar' | 'pie' | 'donut' | 'kpi' | 'metric-cards' | 'line' | 'area' | 'table';
  worksheetObj?: any;
  worksheetName?: string;  // For persistence/rehydration
  measureField?: string;
  dimensionField?: string;
  title?: string;
  colorScheme?: string;
  customColors?: string[] | null;
  colorMode?: 'single' | 'sequential' | 'categorical';
  showValues?: boolean;
  showLegend?: boolean;
  maxItems?: number;
  sortBy?: 'value' | 'label';
  sortOrder?: 'asc' | 'desc';
  theme?: 'professional' | 'modern';
  showAverageLine?: boolean;
  aggregateByDate?: boolean;
  aggregationType?: 'sum' | 'average' | 'count' | 'max' | 'min';
}

export const COLOR_SCHEMES: Record<string, string[]> = {
  blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
  green: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
  orange: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'],
  red: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
  tableau: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
  professional: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
};

/**
 * Generate sequential colors from a base color
 */
export function generateSequentialColors(baseColor: string, count: number): string[] {
  const colors: string[] = [];
  
  // Parse the base color (hex to RGB)
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Generate from light to dark
  for (let i = 0; i < count; i++) {
    const factor = 0.3 + (0.7 * i / (count - 1)); // 0.3 to 1.0
    const newR = Math.round(255 - (255 - r) * factor);
    const newG = Math.round(255 - (255 - g) * factor);
    const newB = Math.round(255 - (255 - b) * factor);
    
    colors.push(`rgb(${newR}, ${newG}, ${newB})`);
  }
  
  return colors;
}

/**
 * Get bar color based on color mode
 */
export function getBarColor(
  _index: number,
  value: number,
  maxValue: number,
  primaryColor: string,
  colorMode: string,
  sequentialColors: string[] | null
): string {
  if (colorMode === 'sequential' && sequentialColors && sequentialColors.length > 0) {
    const valueRatio = maxValue > 0 ? value / maxValue : 0;
    const colorIndex = Math.floor(valueRatio * (sequentialColors.length - 1));
    return sequentialColors[colorIndex];
  }
  return primaryColor;
}

/**
 * Get default theme configuration
 */
export function getDefaultTheme(themeType: 'professional' | 'modern' = 'professional'): ThemeConfig {
  const isDark = themeType === 'modern';
  
  return {
    isDark,
    bg: isDark ? '#1e293b' : 'white',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    bgAlt: isDark ? '#334155' : '#fafafa',
    bgHeader: isDark ? '#475569' : '#f9fafb',
    bgFooter: isDark ? '#475569' : '#f3f4f6',
    bgHover: isDark ? '#3b82f6' : '#e0f2fe',
    text: isDark ? '#f1f5f9' : '#1f2937',
    textSecondary: isDark ? '#94a3b8' : '#6b7280',
    textMuted: isDark ? '#64748b' : '#9ca3af',
    border: isDark ? '#475569' : '#e5e7eb',
    borderLight: isDark ? '#334155' : '#f3f4f6',
    gridLine: isDark ? '#475569' : '#e5e7eb',
    axisLine: isDark ? '#64748b' : '#d1d5db',
    barBg: isDark ? '#475569' : '#f3f4f6',
    hoverBg: isDark ? '#475569' : '#f3f4f6'
  };
}

/**
 * Format number for display
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  // For rates/percentages (small numbers), show 2 decimal places
  if (num < 100 && num !== Math.floor(num)) {
    return num.toFixed(2);
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Clean field name by removing aggregation prefixes
 */
export function cleanFieldName(name: string | undefined): string {
  if (!name) return name || '';
  
  // Strip aggregation prefixes like HOUR(), DAY(), MONTH(), SUM(), AVG(), etc.
  let cleaned = name
    .replace(/^(HOUR|DAY|WEEK|MONTH|QUARTER|YEAR|DATEPART|DATETRUNC)\s*\(/gi, '')
    .replace(/^(SUM|AVG|MIN|MAX|COUNT|COUNTD|CNTD|MEDIAN|ATTR|AGG)\s*\(/gi, '')
    .replace(/\)$/g, '')
    .trim();
  
  // Common field name mappings
  const mappings: Record<string, string> = {
    'Activity Date': 'Date',
    'Id': 'Emails',
    'Open Rate': 'Open Rate',
    'Click Rate': 'Click Rate'
  };
  
  return mappings[cleaned] || cleaned;
}
