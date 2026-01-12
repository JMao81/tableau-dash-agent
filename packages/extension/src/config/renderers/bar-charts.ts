/**
 * Bar Chart Renderers
 * Renders vertical and horizontal bar charts
 */

import { DataPoint, ThemeConfig, formatNumber, getBarColor } from './types';

// Global tooltip state - will be injected from main module
let tooltipsEnabled = true;

export function setTooltipsEnabled(enabled: boolean): void {
  tooltipsEnabled = enabled;
}

/**
 * Render a vertical bar chart
 */
export function renderBarChart(
  data: DataPoint[],
  title: string,
  colors: string[],
  showValues: boolean,
  measureName: string,
  themeConfig: Partial<ThemeConfig> = {},
  colorMode: string = 'single',
  sequentialColors: string[] | null = null
): string {
  const maxValue = Math.max(...data.map(d => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const barWidth = Math.floor(280 / data.length) - 8;
  const primaryColor = colors[0] || '#3b82f6';
  
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
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'}); width: 100%; box-sizing: border-box;">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textSecondary}; font-size: 12px;">${measureName} · ${data.length} items</p>
      
      <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 180px; padding: 0 10px; border-bottom: 2px solid ${theme.border};">
        ${data.map((d, i) => {
          const tooltipText = `${d.label} - ${measureName}: ${formatNumber(d.value)} (${((d.value / total) * 100).toFixed(1)}%)`;
          const barColor = getBarColor(i, d.value, maxValue, primaryColor, colorMode, sequentialColors);
          return `
          <div style="display: flex; flex-direction: column; align-items: center; width: ${barWidth}px; cursor: pointer;" 
               title="${tooltipsEnabled ? tooltipText : ''}">
            ${showValues ? `<span style="font-size: 10px; color: ${theme.text}; margin-bottom: 4px; font-weight: 500;">${formatNumber(d.value)}</span>` : ''}
            <div style="width: 100%; height: ${(d.value / maxValue) * 140}px; background: ${barColor}; border-radius: 4px 4px 0 0; transition: all 0.2s ease;"
                 onmouseover="this.style.opacity='0.8'; this.style.transform='scaleY(1.02)'"
                 onmouseout="this.style.opacity='1'; this.style.transform='scaleY(1)'"></div>
          </div>
        `;}).join('')}
      </div>
      
      <div style="display: flex; justify-content: space-between; padding: 8px 10px 0;">
        ${data.map((d) => `
          <div style="width: ${barWidth}px; text-align: center;">
            <span style="font-size: 9px; color: ${theme.textSecondary}; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${d.label}">${d.label.length > 8 ? d.label.substring(0, 7) + '…' : d.label}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render a horizontal bar chart
 */
export function renderHorizontalBarChart(
  data: DataPoint[],
  title: string,
  colors: string[],
  showValues: boolean,
  measureName: string,
  themeConfig: Partial<ThemeConfig> = {},
  colorMode: string = 'single',
  sequentialColors: string[] | null = null
): string {
  const maxValue = Math.max(...data.map(d => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const primaryColor = colors[0] || '#3b82f6';
  
  // Theme defaults
  const theme: ThemeConfig = {
    isDark: themeConfig.isDark || false,
    bg: themeConfig.bg || 'white',
    text: themeConfig.text || '#1f2937',
    textSecondary: themeConfig.textSecondary || '#6b7280',
    textMuted: themeConfig.textMuted || '#9ca3af',
    border: themeConfig.border || '#e5e7eb',
    borderLight: themeConfig.borderLight || '#f3f4f6',
    barBg: themeConfig.isDark ? '#475569' : '#f3f4f6'
  };
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'}); width: 100%; box-sizing: border-box;">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textSecondary}; font-size: 12px;">${measureName} · ${data.length} items</p>
      
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${data.map((d, i) => {
          const barColor = getBarColor(i, d.value, maxValue, primaryColor, colorMode, sequentialColors);
          const tooltipText = `${d.label}&#10;${measureName}: ${formatNumber(d.value)}&#10;Percentage: ${((d.value / total) * 100).toFixed(1)}%`;
          return `
          <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;"
               data-tooltip="${tooltipText}"
               ${tooltipsEnabled ? `title="${tooltipText}"` : ''}>
            <span style="min-width: 140px; max-width: 200px; font-size: 11px; color: ${theme.text}; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${d.label}">${d.label.length > 20 ? d.label.substring(0, 19) + '…' : d.label}</span>
            <div style="flex: 1; height: 24px; background: ${theme.barBg}; border-radius: 4px; overflow: hidden;">
              <div style="width: ${(d.value / maxValue) * 100}%; height: 100%; background: ${barColor}; border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; transition: all 0.2s ease;"
                   onmouseover="this.style.opacity='0.85'; this.style.transform='scaleX(1.01)'"
                   onmouseout="this.style.opacity='1'; this.style.transform='scaleX(1)'">
                ${showValues ? `<span style="font-size: 10px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${formatNumber(d.value)}</span>` : ''}
              </div>
            </div>
          </div>
        `;}).join('')}
      </div>
    </div>
  `;
}
