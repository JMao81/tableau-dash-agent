/**
 * KPI and Metric Card Renderers
 * Renders KPI cards and metric grid displays
 */

import { DataPoint, ThemeConfig, formatNumber } from './types';

// Global tooltip state
let tooltipsEnabled = true;

export function setTooltipsEnabled(enabled: boolean): void {
  tooltipsEnabled = enabled;
}

/**
 * Render a single KPI card
 */
export function renderKPICard(
  data: DataPoint[],
  title: string,
  colors: string[],
  measureName: string,
  _themeConfig: Partial<ThemeConfig> = {}
): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  const topItem = data[0] || { label: 'N/A', value: 0 };
  
  const kpiTooltip = `${measureName}&#10;Total: ${formatNumber(total)}&#10;Top Item: ${topItem.label}&#10;Top Value: ${formatNumber(topItem.value)}`;
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: linear-gradient(135deg, ${colors[0]}, ${colors[1] || colors[0]}); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); color: white; cursor: pointer;"
         data-tooltip="${kpiTooltip}"
         ${tooltipsEnabled ? `title="${kpiTooltip}"` : ''}>
      <p style="margin: 0 0 8px 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">${title}</p>
      <div style="font-size: 36px; font-weight: 700; margin-bottom: 4px;">${formatNumber(total)}</div>
      <p style="margin: 0; font-size: 13px; opacity: 0.85;">${measureName}</p>
      
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div>
          <span style="font-size: 11px; opacity: 0.8;">Top: </span>
          <span style="font-size: 11px; font-weight: 600;">${topItem.label} (${formatNumber(topItem.value)})</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a grid of metric cards
 */
export function renderMetricCards(
  data: DataPoint[],
  title: string,
  colors: string[],
  themeConfig: Partial<ThemeConfig> = {}
): string {
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h3 style="margin: 0 0 12px 0; color: ${theme.text}; font-size: 14px; font-weight: 600;">${title}</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
        ${data.slice(0, 6).map((d, i) => {
          const metricTooltip = `${d.label}&#10;Value: ${formatNumber(d.value)}`;
          return `
          <div style="padding: 16px; background: ${theme.bg}; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,${theme.isDark ? '0.2' : '0.08'}); border-left: 4px solid ${colors[i % colors.length]}; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;"
               data-tooltip="${metricTooltip}"
               ${tooltipsEnabled ? `title="${metricTooltip}"` : ''}
               onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,${theme.isDark ? '0.3' : '0.12'})'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(0,0,0,${theme.isDark ? '0.2' : '0.08'})'">
            <div style="font-size: 20px; font-weight: 700; color: ${theme.text}; margin-bottom: 4px;">${formatNumber(d.value)}</div>
            <div style="font-size: 11px; color: ${theme.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${d.label}</div>
          </div>
        `;}).join('')}
      </div>
      <div style="margin-top: 8px; text-align: right;">
        <span style="font-size: 10px; color: ${theme.textMuted};">Auto-updates with filters</span>
      </div>
    </div>
  `;
}
