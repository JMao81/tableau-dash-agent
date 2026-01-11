/**
 * HTML Builder - Reusable UI Components
 * KPI cards, charts, headers used by both dashboard and story builders
 */

import { ThemeConfig, formatValue, escapeHtml } from './base';

// ==================== KPI CARD ====================

export interface KpiCardOptions {
  label: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  sparkline?: string;
  color: string;
  theme: ThemeConfig;
  size?: 'small' | 'medium' | 'large';
}

export function generateKpiCard(options: KpiCardOptions): string {
  const { label, value, change, changeDirection, sparkline, color, theme, size = 'medium' } = options;
  
  const sizeClasses = {
    small: { padding: '16px', valueSize: '24px', labelSize: '11px' },
    medium: { padding: '20px', valueSize: '32px', labelSize: '12px' },
    large: { padding: '24px', valueSize: '40px', labelSize: '14px' }
  };
  
  const s = sizeClasses[size];
  
  let changeHtml = '';
  if (change) {
    const changeColor = changeDirection === 'up' ? '#10b981' : changeDirection === 'down' ? '#ef4444' : theme.textMuted;
    const arrow = changeDirection === 'up' ? '↑' : changeDirection === 'down' ? '↓' : '';
    changeHtml = `<div style="font-size: 12px; color: ${changeColor}; margin-top: 8px;">${arrow} ${escapeHtml(change)}</div>`;
  }
  
  let sparkHtml = '';
  if (sparkline) {
    sparkHtml = `
      <svg width="60" height="24" style="margin-top: 8px;">
        <polyline points="${sparkline}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }
  
  return `
    <div style="
      background: ${theme.cardBg};
      border-radius: 12px;
      padding: ${s.padding};
      border-left: 4px solid ${color};
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
    ">
      <div style="font-size: ${s.labelSize}; color: ${theme.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        ${escapeHtml(label)}
      </div>
      <div style="font-size: ${s.valueSize}; font-weight: 700; color: ${theme.text}; line-height: 1.1;">
        ${escapeHtml(value)}
      </div>
      ${changeHtml}
      ${sparkHtml}
    </div>`;
}

// ==================== LINE CHART (Time Series) ====================

export interface LineChartOptions {
  title: string;
  data: { dimension: string; value: number }[];
  isRate: boolean;
  color: string;
  theme: ThemeConfig;
  labelOverrides?: Record<string, string>;
  maxItems?: number;
}

export function generateLineChart(options: LineChartOptions): string {
  const { title, data, isRate, color, theme, maxItems = 14 } = options;
  
  if (!data || data.length === 0) {
    return `<div style="padding: 20px; text-align: center; color: ${theme.textSecondary || '#6b7280'};">No time series data</div>`;
  }

  const displayData = data.slice(0, maxItems);
  const values = displayData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // SVG line chart dimensions
  const width = 400;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Build SVG path for the line
  const points = displayData.map((d, i) => {
    const x = padding.left + (i / Math.max(displayData.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  
  // Area fill path
  const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Y-axis labels (3 ticks)
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];
  const yLabels = yTicks.map((v, i) => {
    const y = padding.top + chartHeight - (i * chartHeight / 2);
    const label = formatValue(v, isRate);
    return `<text x="${padding.left - 8}" y="${y}" text-anchor="end" fill="${theme.textSecondary || '#6b7280'}" font-size="10">${label}</text>`;
  }).join('');

  // X-axis labels (first, middle, last)
  const xIndices = [0, Math.floor(displayData.length / 2), displayData.length - 1];
  const xLabels = xIndices.filter((idx, i, arr) => arr.indexOf(idx) === i).map(idx => {
    const x = padding.left + (idx / Math.max(displayData.length - 1, 1)) * chartWidth;
    const label = displayData[idx]?.dimension || '';
    // Shorten date labels
    const shortLabel = label.length > 10 ? label.slice(0, 10) : label;
    return `<text x="${x}" y="${height - 5}" text-anchor="middle" fill="${theme.textSecondary || '#6b7280'}" font-size="10">${escapeHtml(shortLabel)}</text>`;
  }).join('');

  // Dots at data points
  const dots = points.map(p => 
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}" stroke="white" stroke-width="1.5"/>`
  ).join('');

  // Calculate trend
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const trendPct = firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : 0;
  const trendText = trendPct >= 0 ? `↑ ${trendPct.toFixed(1)}%` : `↓ ${Math.abs(trendPct).toFixed(1)}%`;
  const trendColor = trendPct >= 0 ? '#10b981' : '#ef4444';

  return `
    <div style="
      background: ${theme.cardBg};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: ${theme.text};">
          ${escapeHtml(title)}
        </h3>
        <span style="font-size: 12px; font-weight: 600; color: ${trendColor};">${trendText}</span>
      </div>
      <svg width="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <!-- Grid lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="${theme.border}" stroke-width="1"/>
        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="${theme.border}" stroke-width="1"/>
        
        <!-- Area fill -->
        <path d="${areaD}" fill="${color}" fill-opacity="0.1"/>
        
        <!-- Line -->
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Data points -->
        ${dots}
        
        <!-- Y-axis labels -->
        ${yLabels}
        
        <!-- X-axis labels -->
        ${xLabels}
      </svg>
    </div>`;
}

// ==================== BAR CHART ====================

export interface BarChartOptions {
  title: string;
  data: { label: string; value: number; count?: number }[];
  isRate: boolean;
  color: string;
  theme: ThemeConfig;
  labelOverrides?: Record<string, string>;
  maxItems?: number;
}

export function generateBarChart(options: BarChartOptions): string {
  const { title, data, isRate, color, theme, labelOverrides = {}, maxItems = 7 } = options;
  
  const displayData = data.slice(0, maxItems);
  const maxVal = Math.max(...displayData.map(d => d.value), 1);
  
  const barsHtml = displayData.map((item) => {
    const pct = (item.value / maxVal) * 100;
    const displayLabel = labelOverrides[item.label] || item.label;
    const displayValue = formatValue(item.value, isRate);
    
    return `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 100px; font-size: 13px; color: ${theme.text}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHtml(displayLabel)}">
          ${escapeHtml(displayLabel)}
        </div>
        <div style="flex: 1; height: 24px; background: ${theme.border}; border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
        <div style="width: 70px; text-align: right; font-size: 13px; font-weight: 600; color: ${theme.text};">
          ${escapeHtml(displayValue)}
        </div>
      </div>`;
  }).join('');
  
  return `
    <div style="
      background: ${theme.cardBg};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    ">
      <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: ${theme.text};">
        ${escapeHtml(title)}
      </h3>
      ${barsHtml}
    </div>`;
}

// ==================== INSIGHT CALLOUT ====================

export interface InsightOptions {
  icon: string;
  title: string;
  description: string;
  theme: ThemeConfig;
  type?: 'info' | 'success' | 'warning' | 'highlight';
}

export function generateInsightCallout(options: InsightOptions): string {
  const { icon, title, description, theme, type = 'info' } = options;
  
  const colors = {
    info: theme.primary,
    success: '#10b981',
    warning: '#f59e0b',
    highlight: theme.secondary
  };
  
  const bgColors = {
    info: `${theme.primary}10`,
    success: '#10b98110',
    warning: '#f59e0b10',
    highlight: `${theme.secondary}10`
  };
  
  return `
    <div style="
      background: ${bgColors[type]};
      border-left: 4px solid ${colors[type]};
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; display: flex; align-items: center; color: ${colors[type]};">${icon}</span>
        <div>
          <div style="font-weight: 600; color: ${theme.text}; margin-bottom: 4px;">${escapeHtml(title)}</div>
          <div style="font-size: 14px; color: ${theme.textMuted}; line-height: 1.5;">${escapeHtml(description)}</div>
        </div>
      </div>
    </div>`;
}

// ==================== METRIC COMPARISON ====================

export interface MetricComparisonOptions {
  metrics: { label: string; value: string; subtext?: string }[];
  theme: ThemeConfig;
}

export function generateMetricComparison(options: MetricComparisonOptions): string {
  const { metrics, theme } = options;
  
  const metricsHtml = metrics.map((m, idx) => `
    <div style="text-align: center; ${idx > 0 ? `border-left: 1px solid ${theme.border}; padding-left: 24px;` : ''}">
      <div style="font-size: 28px; font-weight: 700; color: ${theme.text};">${escapeHtml(m.value)}</div>
      <div style="font-size: 12px; color: ${theme.textMuted}; margin-top: 4px;">${escapeHtml(m.label)}</div>
      ${m.subtext ? `<div style="font-size: 11px; color: ${theme.textMuted}; margin-top: 2px;">${escapeHtml(m.subtext)}</div>` : ''}
    </div>
  `).join('');
  
  return `
    <div style="
      background: ${theme.cardBg};
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      justify-content: space-around;
      gap: 24px;
    ">
      ${metricsHtml}
    </div>`;
}
