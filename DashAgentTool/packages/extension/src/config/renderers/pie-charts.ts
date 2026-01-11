/**
 * Pie Chart Renderers
 * Renders pie and donut charts
 */

import { DataPoint, ThemeConfig, formatNumber } from './types';

// Global tooltip state - will be injected from main module
let tooltipsEnabled = true;

export function setTooltipsEnabled(enabled: boolean): void {
  tooltipsEnabled = enabled;
}

/**
 * Render a pie chart
 */
export function renderPieChart(
  data: DataPoint[],
  title: string,
  colors: string[],
  _showValues: boolean,
  showLegend: boolean,
  themeConfig: Partial<ThemeConfig> = {}
): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulativePercent = 0;
  
  // Theme defaults
  const theme: ThemeConfig = {
    isDark: themeConfig.isDark || false,
    bg: themeConfig.bg || 'white',
    text: themeConfig.text || '#1f2937',
    textSecondary: themeConfig.textSecondary || '#6b7280',
    textMuted: themeConfig.textMuted || '#9ca3af',
    border: themeConfig.border || '#e5e7eb',
    borderLight: themeConfig.borderLight || '#f3f4f6',
    hoverBg: themeConfig.isDark ? '#475569' : '#f3f4f6'
  };
  
  interface SliceData extends DataPoint {
    percent: number;
    startPercent: number;
    color: string;
  }
  
  const slices: SliceData[] = data.map((d, i) => {
    const percent = (d.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    return { ...d, percent, startPercent, color: colors[i % colors.length] };
  });
  
  // Create conic gradient
  const gradientStops = slices.map(s => `${s.color} ${s.startPercent}% ${s.startPercent + s.percent}%`).join(', ');
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'});">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textSecondary}; font-size: 12px;">Distribution · ${data.length} categories</p>
      
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="width: 140px; height: 140px; border-radius: 50%; background: conic-gradient(${gradientStops}); box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer;"
             ${tooltipsEnabled ? `title="Total: ${formatNumber(total)}&#10;${slices.slice(0, 5).map(s => s.label + ': ' + s.percent.toFixed(1) + '%').join('&#10;')}${slices.length > 5 ? '&#10;...' + (slices.length - 5) + ' more' : ''}"` : ''}></div>
        
        ${showLegend ? `
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
            ${slices.slice(0, 8).map(s => `
              <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s ease;"
                   ${tooltipsEnabled ? `title="${s.label}&#10;Value: ${formatNumber(s.value)}&#10;Percentage: ${s.percent.toFixed(1)}%"` : ''}
                   onmouseover="this.style.background='${theme.hoverBg}'"
                   onmouseout="this.style.background='transparent'">
                <div style="width: 12px; height: 12px; border-radius: 2px; background: ${s.color}; flex-shrink: 0;"></div>
                <span style="font-size: 11px; color: ${theme.text}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.label}</span>
                <span style="font-size: 11px; color: ${theme.textSecondary}; font-weight: 500;">${s.percent.toFixed(1)}%</span>
              </div>
            `).join('')}
            ${slices.length > 8 ? `<span style="font-size: 10px; color: ${theme.textMuted};">+${slices.length - 8} more</span>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render a donut chart
 */
export function renderDonutChart(
  data: DataPoint[],
  title: string,
  colors: string[],
  _showValues: boolean,
  showLegend: boolean,
  themeConfig: Partial<ThemeConfig> = {}
): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulativePercent = 0;
  
  // Theme defaults
  const theme: ThemeConfig = {
    isDark: themeConfig.isDark || false,
    bg: themeConfig.bg || 'white',
    text: themeConfig.text || '#1f2937',
    textSecondary: themeConfig.textSecondary || '#6b7280',
    textMuted: themeConfig.textMuted || '#9ca3af',
    border: themeConfig.border || '#e5e7eb',
    borderLight: themeConfig.borderLight || '#f3f4f6',
    hoverBg: themeConfig.isDark ? '#475569' : '#f3f4f6'
  };
  
  interface SliceData extends DataPoint {
    percent: number;
    startPercent: number;
    color: string;
  }
  
  const slices: SliceData[] = data.map((d, i) => {
    const percent = (d.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    return { ...d, percent, startPercent, color: colors[i % colors.length] };
  });
  
  const gradientStops = slices.map(s => `${s.color} ${s.startPercent}% ${s.startPercent + s.percent}%`).join(', ');
  const donutTooltip = `Total: ${formatNumber(total)}&#10;${slices.slice(0, 5).map(s => s.label + ': ' + s.percent.toFixed(1) + '%').join('&#10;')}${slices.length > 5 ? '&#10;...' + (slices.length - 5) + ' more' : ''}`;
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'});">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textSecondary}; font-size: 12px;">Distribution · ${data.length} categories</p>
      
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="position: relative; width: 140px; height: 140px; cursor: pointer;"
             data-tooltip="${donutTooltip}"
             ${tooltipsEnabled ? `title="${donutTooltip}"` : ''}>
          <div style="width: 100%; height: 100%; border-radius: 50%; background: conic-gradient(${gradientStops}); box-shadow: 0 2px 8px rgba(0,0,0,0.15);"></div>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70px; height: 70px; background: ${theme.bg}; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <span style="font-size: 16px; font-weight: 700; color: ${theme.text};">${formatNumber(total)}</span>
            <span style="font-size: 9px; color: ${theme.textMuted};">TOTAL</span>
          </div>
        </div>
        
        ${showLegend ? `
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
            ${slices.slice(0, 8).map(s => `
              <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s ease;"
                   ${tooltipsEnabled ? `title="${s.label}&#10;Value: ${formatNumber(s.value)}&#10;Percentage: ${s.percent.toFixed(1)}%"` : ''}
                   onmouseover="this.style.background='${theme.hoverBg}'"
                   onmouseout="this.style.background='transparent'">
                <div style="width: 12px; height: 12px; border-radius: 2px; background: ${s.color}; flex-shrink: 0;"></div>
                <span style="font-size: 11px; color: ${theme.text}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.label}</span>
                <span style="font-size: 11px; color: ${theme.textSecondary}; font-weight: 500;">${s.percent.toFixed(1)}%</span>
              </div>
            `).join('')}
            ${slices.length > 8 ? `<span style="font-size: 10px; color: ${theme.textMuted};">+${slices.length - 8} more</span>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
