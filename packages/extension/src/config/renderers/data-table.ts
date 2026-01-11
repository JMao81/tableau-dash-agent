/**
 * Data Table Renderer
 * Renders data as HTML tables
 */

import { DataPoint, ThemeConfig, formatNumber } from './types';

// Global tooltip state
let tooltipsEnabled = true;

export function setTooltipsEnabled(enabled: boolean): void {
  tooltipsEnabled = enabled;
}

/**
 * Render a data table
 */
export function renderDataTable(
  data: DataPoint[],
  title: string,
  dimName: string,
  measureName: string,
  themeConfig: Partial<ThemeConfig> = {}
): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  
  // Theme defaults
  const theme: ThemeConfig = {
    isDark: themeConfig.isDark || false,
    bg: themeConfig.bg || 'white',
    bgAlt: themeConfig.isDark ? '#334155' : '#fafafa',
    bgHeader: themeConfig.isDark ? '#475569' : '#f9fafb',
    bgFooter: themeConfig.isDark ? '#475569' : '#f3f4f6',
    bgHover: themeConfig.isDark ? '#3b82f6' : '#e0f2fe',
    text: themeConfig.text || '#1f2937',
    textSecondary: themeConfig.textSecondary || '#374151',
    textMuted: themeConfig.textMuted || '#6b7280',
    border: themeConfig.border || '#e5e7eb',
    borderLight: themeConfig.borderLight || '#f3f4f6'
  };
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,${theme.isDark ? '0.3' : '0.1'});">
      <h3 style="margin: 0 0 4px 0; color: ${theme.text}; font-size: 16px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 16px 0; color: ${theme.textMuted}; font-size: 12px;">${data.length} rows</p>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: ${theme.bgHeader};">
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid ${theme.border}; color: ${theme.textSecondary}; font-weight: 600;">${dimName}</th>
            <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid ${theme.border}; color: ${theme.textSecondary}; font-weight: 600;">${measureName}</th>
            <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid ${theme.border}; color: ${theme.textSecondary}; font-weight: 600;">%</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((d, i) => `
            <tr style="background: ${i % 2 === 0 ? theme.bg : theme.bgAlt}; cursor: pointer; transition: background 0.15s ease;"
                ${tooltipsEnabled ? `title="${dimName}: ${d.label}&#10;${measureName}: ${formatNumber(d.value)}&#10;Percentage: ${((d.value / total) * 100).toFixed(1)}%&#10;Rank: ${i + 1} of ${data.length}"` : ''}
                onmouseover="this.style.background='${theme.bgHover}'"
                onmouseout="this.style.background='${i % 2 === 0 ? theme.bg : theme.bgAlt}'">
              <td style="padding: 8px 12px; border-bottom: 1px solid ${theme.borderLight}; color: ${theme.text};">${d.label}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid ${theme.borderLight}; text-align: right; color: ${theme.textSecondary}; font-weight: 500;">${formatNumber(d.value)}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid ${theme.borderLight}; text-align: right; color: ${theme.textMuted};">${((d.value / total) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: ${theme.bgFooter}; font-weight: 600;">
            <td style="padding: 10px 12px; color: ${theme.text};">Total</td>
            <td style="padding: 10px 12px; text-align: right; color: ${theme.text};">${formatNumber(total)}</td>
            <td style="padding: 10px 12px; text-align: right; color: ${theme.text};">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}
