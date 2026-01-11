/**
 * Line and Area Chart Renderers
 * Renders time series visualizations
 */

import { DataPoint, ThemeConfig, formatNumber, cleanFieldName } from './types';

// Global tooltip state
let tooltipsEnabled = true;

export function setTooltipsEnabled(enabled: boolean): void {
  tooltipsEnabled = enabled;
}

/**
 * Format date label for axis display
 */
function formatDateLabel(label: string, showTime: boolean = false, showDate: boolean = true): string {
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  let timeStr = '';
  
  // Time patterns
  const time12Match = label.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
  const hourOnlyMatch = label.match(/(?:^|\s)(\d{1,2})\s*(AM|PM)/i);
  const time24Match = label.match(/T(\d{2}):(\d{2})/);
  
  if (showTime) {
    if (time12Match) {
      const hour = parseInt(time12Match[1]);
      timeStr = ` ${hour}${time12Match[3].toUpperCase()}`;
    } else if (hourOnlyMatch) {
      const hour = parseInt(hourOnlyMatch[1]);
      timeStr = ` ${hour}${hourOnlyMatch[2].toUpperCase()}`;
    } else if (time24Match) {
      const hour = parseInt(time24Match[1]);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      timeStr = ` ${h12}${ampm}`;
    }
  }
  
  // Date patterns
  let dateStr = '';
  
  const fullMonthMatch = label.match(/^(\w+)\s+(\d{1,2})/);
  if (fullMonthMatch) {
    const monthIdx = monthFull.indexOf(fullMonthMatch[1]);
    if (monthIdx >= 0) {
      dateStr = `${monthShort[monthIdx]} ${fullMonthMatch[2]}`;
    }
  }
  
  if (!dateStr) {
    const shortMonthMatch = label.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
    if (shortMonthMatch) {
      dateStr = `${shortMonthMatch[1]} ${shortMonthMatch[2]}`;
    }
  }
  
  if (!dateStr) {
    const isoMatch = label.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const monthIdx = parseInt(isoMatch[2]) - 1;
      dateStr = `${monthShort[monthIdx]} ${parseInt(isoMatch[3])}`;
    }
  }
  
  if (!dateStr) {
    const usMatch = label.match(/^(\d{1,2})\/(\d{1,2})/);
    if (usMatch) {
      const monthIdx = parseInt(usMatch[1]) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        dateStr = `${monthShort[monthIdx]} ${parseInt(usMatch[2])}`;
      }
    }
  }
  
  if (showDate && dateStr) {
    return dateStr + timeStr;
  } else if (showTime && timeStr) {
    return timeStr.trim();
  } else if (dateStr) {
    return dateStr;
  }
  
  return label.length > 15 ? label.substring(0, 12) + '…' : label;
}

/**
 * Detect if data contains time information
 */
function detectTimeData(data: DataPoint[]): boolean {
  return data.some(d => {
    const label = d.label || '';
    return /(\d{1,2}:\d{2})|(T\d{2}:\d{2})|(\d{1,2}\s*(?:AM|PM))/i.test(label);
  });
}

/**
 * Extract date part from label
 */
function extractDatePart(label: string): string {
  const usMatch = label.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (usMatch) return usMatch[1];
  
  const fullMatch = label.match(/^(\w+\s+\d{1,2},?\s*\d{4})/);
  if (fullMatch) return fullMatch[1].replace(/,\s*$/, '');
  
  const isoMatch = label.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  
  return label;
}

/**
 * Render a line chart
 */
export function renderLineChart(
  data: DataPoint[],
  title: string,
  colors: string[],
  _showValues: boolean,
  dimName: string,
  measureName: string,
  themeConfig: Partial<ThemeConfig> = {},
  showAverageLine: boolean = false
): string {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  const total = data.reduce((s, d) => s + d.value, 0);
  const avgValue = total / data.length;
  
  const cleanDimName = cleanFieldName(dimName);
  const cleanMeasureName = cleanFieldName(measureName);
  
  // Theme defaults
  const theme: ThemeConfig = {
    isDark: themeConfig.isDark || false,
    bg: themeConfig.bg || 'white',
    text: themeConfig.text || '#1f2937',
    textSecondary: themeConfig.textSecondary || '#6b7280',
    textMuted: themeConfig.textMuted || '#9ca3af',
    border: themeConfig.border || '#e5e7eb',
    borderLight: themeConfig.borderLight || '#f3f4f6',
    gridLine: themeConfig.gridLine || (themeConfig.isDark ? '#475569' : '#e5e7eb'),
    axisLine: themeConfig.axisLine || (themeConfig.isDark ? '#64748b' : '#d1d5db')
  };
  
  // Detect time data
  const hasTimeData = detectTimeData(data);
  const uniqueDates = new Set(data.map(d => extractDatePart(d.label)));
  const spansMultipleDays = uniqueDates.size > 1;
  const showTimeInLabels = hasTimeData;
  const showDateInLabels = !hasTimeData || spansMultipleDays;
  
  const getDisplayLabel = (d: DataPoint): string => {
    return formatDateLabel(d.label, showTimeInLabels, showDateInLabels);
  };
  
  // Chart dimensions
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 50, bottom: 50, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  
  // Calculate points
  interface ChartPoint extends DataPoint {
    x: number;
    y: number;
  }
  
  const points: ChartPoint[] = data.map((d, i) => {
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * plotWidth : plotWidth / 2);
    const y = padding.top + plotHeight - ((d.value - minValue) / range) * plotHeight;
    return { x, y, ...d };
  });
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  
  // X-axis labels
  const labelInterval = Math.max(1, Math.ceil(data.length / 8));
  const xLabels = data.filter((_, i) => i % labelInterval === 0 || i === data.length - 1);
  
  // Y-axis ticks
  const yTicks: { value: number; y: number }[] = [];
  for (let i = 0; i <= 4; i++) {
    const val = minValue + (range * i) / 4;
    const y = padding.top + plotHeight - (i / 4) * plotHeight;
    yTicks.push({ value: val, y });
  }
  
  const gradientId = 'lineGrad-' + title.replace(/[^a-zA-Z0-9]/g, '');
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'}); width: 100%; box-sizing: border-box;">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textSecondary}; font-size: 12px;">${cleanMeasureName} over ${cleanDimName}</p>
      
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; min-width: 400px; height: auto;">
          <defs>
            <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:${theme.isDark ? '0.4' : '0.3'}"/>
              <stop offset="100%" style="stop-color:${colors[0]};stop-opacity:0.02"/>
            </linearGradient>
          </defs>
          
          <!-- Y-axis grid lines and labels -->
          ${yTicks.map(tick => `
            <line x1="${padding.left}" y1="${tick.y}" x2="${padding.left + plotWidth}" y2="${tick.y}" stroke="${theme.gridLine}" stroke-dasharray="${tick.value === minValue ? '0' : '4'}"/>
            <text x="${padding.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="10" fill="${theme.textSecondary}">${formatNumber(tick.value)}</text>
          `).join('')}
          
          <!-- X-axis line -->
          <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="${theme.axisLine}" stroke-width="1"/>
          
          <!-- Y-axis line -->
          <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="${theme.axisLine}" stroke-width="1"/>
          
          <!-- Area fill -->
          <path d="${areaD}" fill="url(#${gradientId})"/>
          
          <!-- Average reference line -->
          ${showAverageLine ? (() => {
            const avgY = padding.top + plotHeight - ((avgValue - minValue) / range) * plotHeight;
            return `
              <line x1="${padding.left}" y1="${avgY}" x2="${padding.left + plotWidth}" y2="${avgY}" 
                    stroke="${theme.isDark ? '#f59e0b' : '#d97706'}" stroke-width="2" stroke-dasharray="6,4"/>
              <text x="${padding.left + plotWidth + 5}" y="${avgY + 4}" font-size="10" fill="${theme.isDark ? '#fbbf24' : '#b45309'}" font-weight="500">
                Avg: ${formatNumber(avgValue)}
              </text>
            `;
          })() : ''}
          
          <!-- Main line -->
          <path d="${pathD}" fill="none" stroke="${colors[0]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          
          <!-- Data points -->
          ${points.filter((_, i) => i % Math.max(1, Math.ceil(data.length / 30)) === 0).map((p) => {
            const displayLabel = getDisplayLabel(p);
            const tooltipText = `${displayLabel} - ${cleanMeasureName}: ${formatNumber(p.value)}`;
            return `
            <g style="cursor: pointer;">
              <circle cx="${p.x}" cy="${p.y}" r="5" fill="${colors[0]}" stroke="${theme.isDark ? '#1e293b' : 'white'}" stroke-width="2">
                ${tooltipsEnabled ? `<title>${tooltipText}</title>` : ''}
              </circle>
            </g>
          `;}).join('')}
          
          <!-- X-axis labels -->
          ${xLabels.map((d) => {
            const origIndex = data.indexOf(d);
            const x = padding.left + (data.length > 1 ? (origIndex / (data.length - 1)) * plotWidth : plotWidth / 2);
            const label = getDisplayLabel(d);
            return `
              <text x="${x}" y="${padding.top + plotHeight + 20}" text-anchor="middle" font-size="10" fill="${theme.textSecondary}" transform="rotate(-30, ${x}, ${padding.top + plotHeight + 20})">${label}</text>
            `;
          }).join('')}
          
          <!-- Axis labels -->
          <text x="${width / 2}" y="${height - 5}" text-anchor="middle" font-size="11" fill="${theme.text}" font-weight="500">${cleanDimName}</text>
        </svg>
      </div>
      
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid ${theme.borderLight}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${showAverageLine ? `
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 16px; height: 2px; background: ${theme.isDark ? '#f59e0b' : '#d97706'}; display: inline-block; border-style: dashed;"></span>
              <span style="font-size: 10px; color: ${theme.isDark ? '#fbbf24' : '#b45309'};">Average Reference</span>
            </span>
          ` : ''}
        </div>
        <div style="display: flex; gap: 16px;">
          <span style="font-size: 10px; color: ${theme.textSecondary};">Min: <strong>${formatNumber(minValue)}</strong></span>
          ${showAverageLine ? `<span style="font-size: 10px; color: ${theme.isDark ? '#fbbf24' : '#b45309'};">Avg: <strong>${formatNumber(avgValue)}</strong></span>` : ''}
          <span style="font-size: 10px; color: ${theme.textSecondary};">Max: <strong>${formatNumber(maxValue)}</strong></span>
          <span style="font-size: 10px; color: ${theme.textMuted};">${data.length} data points</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render an area chart
 */
export function renderAreaChart(
  data: DataPoint[],
  title: string,
  colors: string[],
  _showValues: boolean,
  dimName: string,
  measureName: string,
  themeConfig: Partial<ThemeConfig> = {}
): string {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = 0;
  const range = maxValue - minValue || 1;
  const total = data.reduce((s, d) => s + d.value, 0);
  
  // Theme defaults
  const theme: ThemeConfig = {
    isDark: themeConfig.isDark || false,
    bg: themeConfig.bg || 'white',
    text: themeConfig.text || '#1f2937',
    textSecondary: themeConfig.textSecondary || '#6b7280',
    textMuted: themeConfig.textMuted || '#9ca3af',
    border: themeConfig.border || '#e5e7eb',
    borderLight: themeConfig.borderLight || '#f3f4f6'
  };
  
  const width = 280;
  const height = 120;
  
  interface ChartPoint extends DataPoint {
    x: number;
    y: number;
  }
  
  const points: ChartPoint[] = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - minValue) / range) * height;
    return { x, y, ...d };
  });
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'});">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textSecondary}; font-size: 12px;">${measureName} over ${dimName}</p>
      
      <div style="position: relative; padding: 10px 0;">
        <svg width="${width}" height="${height}" style="overflow: visible;">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:0.4"/>
              <stop offset="100%" style="stop-color:${colors[0]};stop-opacity:0.05"/>
            </linearGradient>
          </defs>
          
          <!-- Area fill -->
          <path d="${areaD}" fill="url(#areaGradient)"/>
          
          <!-- Line -->
          <path d="${pathD}" fill="none" stroke="${colors[0]}" stroke-width="2" stroke-linecap="round"/>
          
          <!-- Interactive data points -->
          ${points.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map(p => `
            <g style="cursor: pointer;">
              <circle cx="${p.x}" cy="${p.y}" r="8" fill="transparent">
                ${tooltipsEnabled ? `<title>${p.label}&#10;${measureName}: ${formatNumber(p.value)}&#10;% of Total: ${((p.value / total) * 100).toFixed(1)}%</title>` : ''}
              </circle>
              <circle cx="${p.x}" cy="${p.y}" r="3" fill="${colors[0]}" stroke="${theme.bg}" stroke-width="1.5" style="pointer-events: none;"/>
            </g>
          `).join('')}
        </svg>
      </div>
    </div>
  `;
}
