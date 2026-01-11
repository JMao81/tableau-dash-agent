/**
 * HTML Builder - Story Generator
 * Builds narrative-style story HTML with insights and key takeaways
 */

import { 
  THEMES,
  ThemeConfig,
  BuildOptions, 
  AnalyzedData,
  MeasureInfo,
  DimensionInfo,
  BreakdownData,
  DateRange,
  formatValue, 
  normalizeFieldName,
  applyCustomColors,
  analyzeWorksheetData,
  escapeHtml
} from './base';
import { 
  generateInsightCallout,
  generateMetricComparison
} from './components';

// ==================== PROFESSIONAL SVG ICONS ====================
// Using inline SVG for professional look (no emoji dependency)

const ICONS = {
  target: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  rocket: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  trendUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  lightbulb: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
  arrowUpRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
  trophy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  database: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

// ==================== STORY BUILDER ====================

/**
 * Format a date range for display
 */
function formatDateRangeDisplay(dateRange: DateRange | undefined): string {
  if (!dateRange) return '';
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  if (!dateRange.minDate || !dateRange.maxDate) {
    return 'Date range unavailable';
  }
  
  const minStr = dateRange.minDate.toLocaleDateString('en-US', options);
  const maxStr = dateRange.maxDate.toLocaleDateString('en-US', options);
  
  // If same day, just show one date
  if (minStr === maxStr) {
    return minStr;
  }
  
  return `${minStr} – ${maxStr}`;
}

export interface StoryResult {
  html: string;
  headline: string;
  keyTakeaway: string;
  insights: string[];
  recommendations?: string[];
  theme: string;
}

export interface StoryOptions extends BuildOptions {
  headline?: string;
  keyTakeaway?: string;
  narrativeStyle?: 'executive' | 'analytical' | 'casual';
}

/**
 * Generate a compelling headline from the data - prioritize rates over counts
 */
function generateHeadline(
  measures: MeasureInfo[], 
  labelOverrides: Record<string, string>,
  entityHint?: string
): string {
  if (measures.length === 0) return 'Performance Overview';
  
  // Prioritize rate metrics for headline (they're more insightful)
  const rates = measures.filter(m => m.isRate);
  const volumes = measures.filter(m => !m.isRate);
  
  // Check if we have rate metrics with issues to highlight
  const lowRates = rates.filter(r => r.avg < 0.15); // Below 15%
  const highRates = rates.filter(r => r.avg > 0.40); // Above 40%
  
  // Generate insight-driven headline based on rates (not counts)
  if (lowRates.length > 0 && highRates.length > 0) {
    return 'Optimize Campaigns for Maximum Engagement';
  } else if (lowRates.length >= 2) {
    return 'Multiple Metrics Need Attention';
  } else if (lowRates.length === 1) {
    const label = normalizeFieldName(lowRates[0].name, labelOverrides, { isRate: true, entityHint });
    return `Improve ${label} to Boost Performance`;
  } else if (highRates.length > 0) {
    const label = normalizeFieldName(highRates[0].name, labelOverrides, { isRate: true, entityHint });
    return `Strong ${label} Driving Results`;
  } else if (rates.length > 0) {
    // Moderate performance - focus on optimization opportunity
    return 'Optimize Performance Across Campaigns';
  }
  
  // Fallback to volume-based headline only if no rates - use entityHint for context
  if (volumes.length > 0) {
    const topVolume = volumes[0];
    const label = normalizeFieldName(topVolume.name, labelOverrides, { entityHint });
    // Avoid headlines like "Total Count Overview" - use entity instead
    const entityLabel = entityHint || label;
    return `${entityLabel} Performance Overview`;
  }
  
  return 'Performance Overview';
}

/**
 * Generate key takeaway from the data - focus on actionable insights
 */
function generateKeyTakeaway(
  measures: MeasureInfo[], 
  _analyzed: AnalyzedData,
  labelOverrides: Record<string, string>,
  entityHint?: string
): string {
  if (measures.length === 0) return 'No data available for analysis.';
  
  const insights: string[] = [];
  const rates = measures.filter(m => m.isRate);
  const volumes = measures.filter(m => !m.isRate);
  
  // Identify performance issues first (these are most actionable)
  const lowRates = rates.filter(r => r.avg < 0.15);
  const highRates = rates.filter(r => r.avg > 0.40);
  
  if (highRates.length > 0 && lowRates.length > 0) {
    const goodLabel = normalizeFieldName(highRates[0].name, labelOverrides, { isRate: true, entityHint });
    const badLabel = normalizeFieldName(lowRates[0].name, labelOverrides, { isRate: true, entityHint });
    insights.push(`Strong ${goodLabel} (${formatValue(highRates[0].avg, true)}) with room for improvement in ${badLabel} (${formatValue(lowRates[0].avg, true)})`);
  } else if (lowRates.length > 0) {
    const labels = lowRates.slice(0, 2).map(r => normalizeFieldName(r.name, labelOverrides, { isRate: true, entityHint })).join(' and ');
    insights.push(`Focus on improving ${labels} to enhance campaign effectiveness`);
  } else if (highRates.length > 0) {
    const bestRate = highRates[0];
    const label = normalizeFieldName(bestRate.name, labelOverrides, { isRate: true, entityHint });
    insights.push(`Excellent ${label} at ${formatValue(bestRate.avg, true)} - continue successful strategies`);
  }
  
  // Add volume context if space allows - use entityHint for clarity
  if (insights.length < 2 && volumes.length > 0) {
    const topVolume = volumes[0];
    const label = normalizeFieldName(topVolume.name, labelOverrides, { entityHint });
    // Avoid "Total Total X" - check if label already starts with Total
    const prefix = label.toLowerCase().startsWith('total') ? '' : 'Total ';
    insights.push(`${prefix}${label}: ${formatValue(topVolume.sum, false)}`);
  }
  
  return insights.join('. ') + (insights.length > 0 ? '.' : '');
}

/**
 * Generate data-driven insights
 */
function generateInsights(
  analyzed: AnalyzedData,
  labelOverrides: Record<string, string>,
  entityHint?: string
): { icon: string; title: string; description: string; type: 'info' | 'success' | 'warning' | 'highlight' }[] {
  const insights: { icon: string; title: string; description: string; type: 'info' | 'success' | 'warning' | 'highlight' }[] = [];
  
  // Concentration analysis
  if (analyzed.breakdowns.length > 0) {
    const bd = analyzed.breakdowns[0];
    if (bd.data.length >= 2) {
      const total = bd.data.reduce((sum, d) => sum + d.value, 0);
      const topShare = bd.data[0].value / total;
      
      if (topShare > 0.5) {
        insights.push({
          icon: ICONS.target,
          title: 'High Concentration',
          description: `${bd.data[0].label} accounts for ${(topShare * 100).toFixed(0)}% of total ${normalizeFieldName(bd.measure.name, labelOverrides, { entityHint })}. Consider diversification strategies.`,
          type: 'warning'
        });
      } else if (topShare > 0.3) {
        insights.push({
          icon: ICONS.chart,
          title: 'Balanced Distribution',
          description: `${bd.data[0].label} leads with ${(topShare * 100).toFixed(0)}% share. Good balance across segments.`,
          type: 'success'
        });
      }
    }
  }
  
  // Rate performance
  const rates = analyzed.measures.filter(m => m.isRate);
  for (const rate of rates.slice(0, 2)) {
    const label = normalizeFieldName(rate.name, labelOverrides, { isRate: true, entityHint });
    // rate.avg should be normalized to 0-1 range by analyzeWorksheetData
    // If it's already > 1, it's in percentage format (0-100), so don't multiply
    const pct = rate.avg > 1 ? rate.avg : rate.avg * 100;
    
    if (pct > 40) {
      insights.push({
        icon: ICONS.rocket,
        title: `Excellent ${label}`,
        description: `At ${pct.toFixed(1)}%, this exceeds typical benchmarks. Continue current strategies.`,
        type: 'success'
      });
    } else if (pct < 15) {
      insights.push({
        icon: ICONS.warning,
        title: `${label} Below Target`,
        description: `Currently at ${pct.toFixed(1)}%. Review and optimize to improve performance.`,
        type: 'warning'
      });
    }
  }
  
  // Volume trends
  const volumes = analyzed.measures.filter(m => !m.isRate);
  if (volumes.length > 0) {
    const topVolume = volumes[0];
    const label = normalizeFieldName(topVolume.name, labelOverrides, { entityHint });
    insights.push({
      icon: ICONS.trendUp,
      title: `${label} Summary`,
      description: `Total: ${formatValue(topVolume.sum, false)} across ${topVolume.count} records. Average: ${formatValue(topVolume.avg, false)} per record.`,
      type: 'info'
    });
  }
  
  return insights.slice(0, 4);
}

/**
 * Generate actionable recommendations based on the data analysis
 */
interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  tag: string;
}

function generateRecommendations(
  analyzed: AnalyzedData,
  labelOverrides: Record<string, string>,
  entityHint?: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const rates = analyzed.measures.filter(m => m.isRate);
  // Note: volumes, lowRates, moderateRates could be used for future recommendation logic
  const highRates = rates.filter(r => r.avg >= 0.40);
  
  // Delivery rate issues (if exists)
  const deliveryRate = rates.find(r => r.name.toLowerCase().includes('deliver'));
  if (deliveryRate && deliveryRate.avg < 0.85) {
    recommendations.push({
      priority: 'high',
      action: 'Investigate and resolve delivery issues to improve rates.',
      rationale: 'Improving delivery rates can increase campaign effectiveness significantly.',
      tag: 'High Impact • Quick Win'
    });
  }
  
  // Low clickthrough or engagement rates
  const clickRates = rates.filter(r => 
    r.name.toLowerCase().includes('click') || 
    r.name.toLowerCase().includes('ctr') ||
    r.name.toLowerCase().includes('ctor')
  );
  for (const rate of clickRates) {
    if (rate.avg < 0.10) {
      const label = normalizeFieldName(rate.name, labelOverrides, { isRate: true, entityHint });
      recommendations.push({
        priority: 'high',
        action: `Optimize ${label} through better CTAs and content alignment.`,
        rationale: 'A/B test subject lines, CTAs, and landing page relevance.',
        tag: 'Medium • Requires Testing'
      });
    }
  }
  
  // Leverage high performers
  if (highRates.length > 0 && analyzed.breakdowns.length > 0) {
    const topBreakdown = analyzed.breakdowns[0];
    if (topBreakdown.data.length > 0) {
      const topPerformer = topBreakdown.data[0];
      recommendations.push({
        priority: 'medium',
        action: `Replicate successful strategies from ${topPerformer.label}.`,
        rationale: 'Apply winning tactics to underperforming campaigns.',
        tag: 'Medium • Requires Testing'
      });
    }
  }
  
  // Low open rates
  const openRate = rates.find(r => r.name.toLowerCase().includes('open'));
  if (openRate && openRate.avg < 0.25) {
    recommendations.push({
      priority: 'medium',
      action: 'Test subject lines and send times to improve open rates.',
      rationale: 'Optimal timing and compelling subjects drive engagement.',
      tag: 'Medium • Ongoing'
    });
  }
  
  // Segment analysis opportunity
  if (analyzed.breakdowns.length > 0 && analyzed.breakdowns[0].data.length >= 5) {
    const bd = analyzed.breakdowns[0];
    const total = bd.data.reduce((sum, d) => sum + d.value, 0);
    const bottomShare = bd.data.slice(-2).reduce((sum, d) => sum + d.value, 0) / total;
    if (bottomShare < 0.1) {
      recommendations.push({
        priority: 'low',
        action: 'Review and potentially sunset lowest-performing segments.',
        rationale: 'Focus resources on high-impact areas.',
        tag: 'Low Priority • Analysis'
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 4);
}

/**
 * Build recommendations HTML section
 */
function buildRecommendationsHtml(recommendations: Recommendation[], theme: any): string {
  if (recommendations.length === 0) return '';
  
  const priorityColors = {
    high: '#e53935',
    medium: '#fb8c00',
    low: '#43a047'
  };
  
  const items = recommendations.map(rec => `
    <div style="
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 4px solid ${priorityColors[rec.priority]};
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${priorityColors[rec.priority]};
          margin-top: 6px;
          flex-shrink: 0;
        "></span>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: ${theme.text}; margin-bottom: 4px;">
            ${escapeHtml(rec.action)}
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
            <span style="
              background: ${priorityColors[rec.priority]}20;
              color: ${priorityColors[rec.priority]};
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            ">${escapeHtml(rec.tag)}</span>
            <span style="color: ${theme.textMuted}; font-size: 13px;">
              ${escapeHtml(rec.rationale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  return `
    <div style="
      background: ${theme.cardBg};
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    ">
      <h2 style="
        font-size: 18px;
        font-weight: 700;
        color: ${theme.text};
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        ${ICONS.arrowUpRight} Recommended Actions
        <span style="font-size: 12px; font-weight: 400; color: ${theme.textMuted};">
          (ordered by expected ROI)
        </span>
      </h2>
      ${items}
    </div>
  `;
}

/**
 * Build the Data Source section showing where the insights come from
 */
function buildDataSourceSection(
  analyzed: AnalyzedData,
  theme: ThemeConfig,
  entityHint?: string
): string {
  // Gather worksheet info
  const worksheets = analyzed.worksheets || [];
  const worksheetNames = worksheets.map((w: { name?: string; rowCount?: number }) => w.name || 'Unknown').join(', ');
  const totalRecords = analyzed.totalRecords || worksheets.reduce((sum: number, w: { rowCount?: number }) => sum + (w.rowCount || 0), 0);
  
  // Build field definitions
  const measures = analyzed.measures || [];
  const dimensions = analyzed.dimensions || [];
  
  const measureDefs = measures.slice(0, 4).map(m => {
    const label = normalizeFieldName(m.name, {}, { isRate: m.isRate, entityHint });
    const aggType = m.isRate ? 'Average' : 'Sum';
    return `<li style="margin: 4px 0;"><strong>${escapeHtml(label)}</strong> — ${aggType} aggregation${m.isRate ? ' (rate metric)' : ''}</li>`;
  }).join('');
  
  const dimDefs = dimensions.slice(0, 3).map(d => {
    const dimName = typeof d === 'string' ? d : d.name;
    return `<li style="margin: 4px 0;"><strong>${escapeHtml(dimName)}</strong> — Categorical dimension</li>`;
  }).join('');
  
  return `
    <div style="
      background: ${theme.bg};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 20px 24px;
      margin: 24px 0;
    ">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: ${theme.text};
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">
        ${ICONS.database} Data Sources & Definitions
      </h3>
      
      <div style="font-size: 13px; color: ${theme.textMuted}; line-height: 1.6;">
        <div style="margin-bottom: 12px;">
          <strong style="color: ${theme.text};">Source Worksheets:</strong> ${escapeHtml(worksheetNames) || 'Dashboard'}
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong style="color: ${theme.text};">Total Records Analyzed:</strong> ${totalRecords.toLocaleString()}
        </div>
        
        ${analyzed.dateRange ? `
        <div style="margin-bottom: 12px;">
          <strong style="color: ${theme.text};">Date Range:</strong> ${formatDateRangeDisplay(analyzed.dateRange)}
        </div>
        ` : ''}
        
        ${measureDefs ? `
        <div style="margin-bottom: 8px;">
          <strong style="color: ${theme.text};">Key Metrics:</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0;">${measureDefs}</ul>
        </div>
        ` : ''}
        
        ${dimDefs ? `
        <div>
          <strong style="color: ${theme.text};">Dimensions:</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0;">${dimDefs}</ul>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Detect entity type from context (title, worksheet names, columns)
 * This helps provide meaningful labels for count fields like "Total Emails Sent" instead of "Total Count"
 * Returns both the entity type and a suggested count label
 */
interface EntityContext {
  entity: string;        // e.g., "Emails", "Orders"
  countLabel: string;    // e.g., "Emails Sent", "Total Orders"
}

function detectEntityFromContext(
  title: string,
  worksheetNames: string[],
  columns: string[]
): EntityContext | undefined {
  // Combine all text for analysis
  const allText = [title, ...worksheetNames, ...columns].join(' ').toLowerCase();
  
  // Entity detection patterns with more specific count labels
  // Order matters - more specific first
  const entityPatterns: Array<{ pattern: RegExp; entity: string; countLabel: string }> = [
    // Email-specific patterns - detect if sent, opened, clicked, etc.
    { pattern: /sent.*(email|mail)|email.*sent|send.*count/i, entity: 'Emails', countLabel: 'Emails Sent' },
    { pattern: /open.*(email|rate)|email.*open/i, entity: 'Emails', countLabel: 'Emails Opened' },
    { pattern: /click.*(email|rate)|email.*click/i, entity: 'Emails', countLabel: 'Emails Clicked' },
    { pattern: /deliver.*(email|rate)|email.*deliver/i, entity: 'Emails', countLabel: 'Emails Delivered' },
    { pattern: /email|campaign|newsletter|inbox/i, entity: 'Emails', countLabel: 'Total Emails' },
    // Other entities
    { pattern: /order|purchase|checkout|cart|transaction/i, entity: 'Orders', countLabel: 'Total Orders' },
    { pattern: /customer|client|account|member/i, entity: 'Customers', countLabel: 'Total Customers' },
    { pattern: /user|visitor|session|login/i, entity: 'Users', countLabel: 'Total Users' },
    { pattern: /product|item|sku|inventory/i, entity: 'Products', countLabel: 'Total Products' },
    { pattern: /ticket|case|issue|support/i, entity: 'Tickets', countLabel: 'Total Tickets' },
    { pattern: /lead|opportunity|deal|pipeline/i, entity: 'Leads', countLabel: 'Total Leads' },
    { pattern: /call|meeting|event|appointment/i, entity: 'Events', countLabel: 'Total Events' },
    { pattern: /employee|staff|worker|hr/i, entity: 'Employees', countLabel: 'Total Employees' },
    { pattern: /sale|revenue|booking/i, entity: 'Sales', countLabel: 'Total Sales' },
  ];
  
  for (const { pattern, entity, countLabel } of entityPatterns) {
    if (pattern.test(allText)) {
      return { entity, countLabel };
    }
  }
  
  return undefined; // No specific entity detected - will use generic "Record Count"
}

/**
 * Build complete story HTML from worksheet data
 */
export async function buildStoryHtml(
  worksheets: any[],
  options: StoryOptions = {}
): Promise<StoryResult> {
  const {
    title = 'Data Story',
    labelOverrides = {},
    theme: themeName = 'story',
    customColors,
    headline: customHeadline,
    keyTakeaway: customTakeaway
    // narrativeStyle can be used for future enhancements
  } = options;

  // Get theme
  let theme = THEMES[themeName] || THEMES.story;
  if (customColors && customColors.length > 0) {
    theme = applyCustomColors(theme, customColors);
  }
  
  // Detect entity type from context for better count labels
  const worksheetNames = worksheets.map(w => w?.name || '').filter(Boolean);
  const entityContext = detectEntityFromContext(title, worksheetNames, []);
  const entityHint = entityContext?.entity;  // e.g., "Emails"
  const countLabel = entityContext?.countLabel;  // e.g., "Emails Sent", "Total Emails"

  // Analyze ALL worksheets and merge their data
  console.log('[buildStoryHtml] Analyzing', worksheets.length, 'worksheets:', worksheetNames, '| Entity:', entityHint, '| CountLabel:', countLabel);
  
  if (!worksheets || worksheets.length === 0) {
    return {
      html: `<div style="padding: 40px; text-align: center; color: #666;">No worksheet data available</div>`,
      headline: 'No Data',
      keyTakeaway: 'No data available for story generation.',
      insights: [],
      theme: themeName
    };
  }

  // Analyze each worksheet and collect all measures/dimensions
  const allMeasures: MeasureInfo[] = [];
  const allDimensions: DimensionInfo[] = [];
  const allBreakdowns: BreakdownData[] = [];
  let mergedDateRange: DateRange | undefined;
  const worksheetResults: { name: string; measures: number; dimensions: number; rows: number }[] = [];
  
  for (const ws of worksheets) {
    if (!ws) continue;
    try {
      const analyzed = await analyzeWorksheetData(ws, options);
      worksheetResults.push({
        name: ws.name || 'unknown',
        measures: analyzed.measures.length,
        dimensions: analyzed.dimensions.length,
        rows: analyzed.rowCount || 0
      });
      
      // Merge date ranges (take the widest range)
      if (analyzed.dateRange) {
        if (!mergedDateRange) {
          mergedDateRange = { ...analyzed.dateRange };
        } else {
          if (analyzed.dateRange.minDate && (!mergedDateRange.minDate || analyzed.dateRange.minDate < mergedDateRange.minDate)) {
            mergedDateRange.minDate = analyzed.dateRange.minDate;
          }
          if (analyzed.dateRange.maxDate && (!mergedDateRange.maxDate || analyzed.dateRange.maxDate > mergedDateRange.maxDate)) {
            mergedDateRange.maxDate = analyzed.dateRange.maxDate;
          }
        }
      }
      
      // Add measures (avoid duplicates by name)
      for (const measure of analyzed.measures) {
        const existing = allMeasures.find(m => m.name === measure.name);
        if (!existing) {
          allMeasures.push(measure);
        } else {
          // Merge: add values together for same-named measures
          existing.sum += measure.sum;
          existing.count += measure.count;
          existing.avg = existing.sum / existing.count;
          existing.min = Math.min(existing.min, measure.min);
          existing.max = Math.max(existing.max, measure.max);
        }
      }
      
      // Add dimensions (avoid duplicates)
      for (const dim of analyzed.dimensions) {
        if (!allDimensions.find(d => d.name === dim.name)) {
          allDimensions.push(dim);
        }
      }
      
      // Add breakdowns
      allBreakdowns.push(...analyzed.breakdowns);
    } catch (e) {
      console.warn('[buildStoryHtml] Failed to analyze worksheet:', ws.name, e);
    }
  }
  
  console.log('[buildStoryHtml] Combined analysis result:', {
    worksheetsAnalyzed: worksheetResults,
    totalMeasures: allMeasures.length,
    measureNames: allMeasures.map(m => m.name),
    totalDimensions: allDimensions.length,
    totalBreakdowns: allBreakdowns.length
  });

  // Use merged data
  const measures = allMeasures;
  const breakdowns = allBreakdowns;
  const dimensions = allDimensions;

  if (measures.length === 0) {
    const wsInfo = worksheetResults.map(r => `${r.name}: ${r.measures} measures, ${r.rows} rows`).join('<br/>');
    return {
      html: `<div style="padding: 40px; text-align: center; color: #666;">
        <h3>No Metrics Found</h3>
        <p>Analyzed ${worksheets.length} worksheets but found no numeric measures.</p>
        <p style="font-size: 12px; margin-top: 20px;">
          Worksheet analysis:<br/>
          ${wsInfo || 'No worksheets could be analyzed'}<br/>
          <br/>
          Tip: Make sure worksheets have visible data and contain numeric fields (SUM, AVG, COUNT, etc.)
        </p>
      </div>`,
      headline: 'No Metrics',
      keyTakeaway: `Analyzed ${worksheets.length} worksheets but found no numeric measures. Ensure data is visible and not filtered out.`,
      insights: [],
      theme: themeName
    };
  }
  
  // Create a merged analyzed object for helper functions
  const analyzed: AnalyzedData = {
    measures,
    dimensions,
    breakdowns,
    rows: [],
    totalRows: worksheetResults.reduce((sum, r) => sum + r.rows, 0),
    totalRecords: worksheetResults.reduce((sum, r) => sum + r.rows, 0), // Add totalRecords for buildDataSourceSection
    dateRange: mergedDateRange
  };

  // Generate story elements - pass entityHint for count context
  const headline = customHeadline || generateHeadline(measures, labelOverrides, entityHint);
  const keyTakeaway = customTakeaway || generateKeyTakeaway(measures, analyzed, labelOverrides, entityHint);
  const insights = generateInsights(analyzed, labelOverrides, entityHint);
  const recommendations = generateRecommendations(analyzed, labelOverrides, entityHint);

  // Build hero metrics - PRIORITIZE RATES over counts (rates are more actionable)
  const rates = measures.filter(m => m.isRate);
  const volumes = measures.filter(m => !m.isRate);
  const prioritizedMeasures = [...rates, ...volumes]; // Rates first, then volumes
  
  const heroMetrics = prioritizedMeasures.slice(0, 3).map(m => ({
    label: normalizeFieldName(m.name, labelOverrides, { isRate: m.isRate, entityHint }),
    value: formatValue(m.isRate ? m.avg : m.sum, m.isRate),
    subtext: m.isRate ? 'Average' : 'Total'
  }));

  // Build insight callouts
  const insightCards = insights.map(i => generateInsightCallout({
    icon: i.icon,
    title: i.title,
    description: i.description,
    theme,
    type: i.type
  })).join('');

  // Build top performers section if we have breakdowns
  let topPerformersHtml = '';
  if (breakdowns.length > 0 && breakdowns[0].data.length > 0) {
    const bd = breakdowns[0];
    const topItems = bd.data.slice(0, 3);
    // For count measures like CNTD(Id), use countLabel to get meaningful label like "Emails Sent" instead of "Id"
    const measureLabel = bd.measure.isCount && countLabel 
      ? countLabel 
      : normalizeFieldName(bd.measure.name, labelOverrides, { isRate: bd.measure.isRate, entityHint });
    const dimLabel = normalizeFieldName(bd.dimension, labelOverrides, { entityHint });
    
    topPerformersHtml = `
      <div style="
        background: ${theme.cardBg};
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      ">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: ${theme.text}; display: flex; align-items: center; gap: 8px;">
          ${ICONS.trophy} Top ${escapeHtml(dimLabel)} by ${escapeHtml(measureLabel)}
        </h3>
        ${topItems.map((item, idx) => `
          <div style="
            display: flex;
            align-items: center;
            padding: 12px 0;
            ${idx < topItems.length - 1 ? `border-bottom: 1px solid ${theme.border};` : ''}
          ">
            <div style="
              width: 32px;
              height: 32px;
              background: ${theme.kpiColors[idx]};
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 14px;
              margin-right: 16px;
            ">${idx + 1}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: ${theme.text};">${escapeHtml(item.label)}</div>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: ${theme.primary};">
              ${formatValue(item.value, bd.measure.isRate)}
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  // Compose full story HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${theme.bg};
      padding: 0;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <!-- Hero Header -->
    <div style="
      background: ${theme.headerBg};
      color: ${theme.headerText};
      padding: 40px;
      border-radius: 16px;
      margin-bottom: 24px;
      text-align: center;
    ">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; margin-bottom: 12px;">
        ${escapeHtml(title)}
      </div>
      <h1 style="font-size: 32px; font-weight: 800; line-height: 1.2; margin: 0;">
        ${escapeHtml(headline)}
      </h1>
      ${analyzed.dateRange ? `
      <div style="font-size: 13px; opacity: 0.75; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
        ${ICONS.calendar} Data Period: ${formatDateRangeDisplay(analyzed.dateRange)}
      </div>
      ` : ''}
    </div>

    <!-- Key Takeaway -->
    <div style="
      background: ${theme.primary};
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      margin-bottom: 24px;
      line-height: 1.5;
    ">
      <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">${ICONS.lightbulb} ${escapeHtml(keyTakeaway)}</span>
    </div>

    <!-- Hero Metrics -->
    ${generateMetricComparison({ metrics: heroMetrics, theme })}

    <!-- Insights Section -->
    <div style="margin: 24px 0;">
      <h2 style="font-size: 18px; font-weight: 700; color: ${theme.text}; margin-bottom: 16px;">
        Key Insights
      </h2>
      ${insightCards}
    </div>

    <!-- Top Performers -->
    ${topPerformersHtml}

    <!-- Recommendations Section -->
    ${buildRecommendationsHtml(recommendations, theme)}

    <!-- Data Source Section -->
    ${buildDataSourceSection(analyzed, theme, entityHint)}

    <!-- Footer -->
    <div style="
      text-align: center;
      padding: 24px;
      color: ${theme.textMuted};
      font-size: 12px;
      border-top: 1px solid ${theme.border};
      margin-top: 24px;
    ">
      Story generated by DashAgent • ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    headline,
    keyTakeaway,
    insights: insights.map(i => i.title),
    recommendations: recommendations.map(r => r.action),
    theme: themeName
  };
}

/**
 * Build story from pre-analyzed data
 */
export function buildStoryFromAnalyzedData(
  analyzed: AnalyzedData,
  options: StoryOptions = {}
): string {
  const {
    title = 'Data Story',
    labelOverrides = {},
    theme: themeName = 'story',
    customColors,
    headline: customHeadline,
    keyTakeaway: customTakeaway
  } = options;

  let theme = THEMES[themeName] || THEMES.story;
  if (customColors && customColors.length > 0) {
    theme = applyCustomColors(theme, customColors);
  }

  const { measures } = analyzed;
  
  const headline = customHeadline || generateHeadline(measures, labelOverrides);
  const keyTakeaway = customTakeaway || generateKeyTakeaway(measures, analyzed, labelOverrides);
  const insights = generateInsights(analyzed, labelOverrides);

  const heroMetrics = measures.slice(0, 3).map(m => ({
    label: normalizeFieldName(m.name, labelOverrides, { isRate: m.isRate }),
    value: formatValue(m.isRate ? m.avg : m.sum, m.isRate),
    subtext: m.isRate ? 'Average' : 'Total'
  }));

  const insightCards = insights.map(i => generateInsightCallout({
    icon: i.icon,
    title: i.title,
    description: i.description,
    theme,
    type: i.type
  })).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${theme.bg};
      padding: 0;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <div style="
      background: ${theme.headerBg};
      color: ${theme.headerText};
      padding: 40px;
      border-radius: 16px;
      margin-bottom: 24px;
      text-align: center;
    ">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; margin-bottom: 12px;">
        ${title}
      </div>
      <h1 style="font-size: 32px; font-weight: 800; line-height: 1.2; margin: 0;">
        ${headline}
      </h1>
    </div>

    <div style="
      background: ${theme.primary};
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      margin-bottom: 24px;
      line-height: 1.5;
    ">
      <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">${ICONS.lightbulb} ${keyTakeaway}</span>
    </div>

    ${generateMetricComparison({ metrics: heroMetrics, theme })}

    <div style="margin: 24px 0;">
      <h2 style="font-size: 18px; font-weight: 700; color: ${theme.text}; margin-bottom: 16px;">
        Key Insights
      </h2>
      ${insightCards}
    </div>

    <div style="text-align: center; padding: 24px; color: ${theme.textMuted}; font-size: 12px; border-top: 1px solid ${theme.border}; margin-top: 24px;">
      Story generated by DashAgent • ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;
}
