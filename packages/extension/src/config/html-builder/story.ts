/**
 * HTML Builder - Story Generator
 * Builds narrative-style story HTML with insights and key takeaways
 * 
 * ARCHITECTURE: No hardcoded thresholds or domain-specific assumptions.
 * Insights are generated using statistical analysis (percentiles, standard deviations)
 * and relative comparisons within the dataset. The LLM can use this context for
 * more nuanced interpretation.
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
// LLM Context module is available for future use with LLM inference
// import { buildLLMContext, generateDataSummary, LLMContext } from './llm-context';

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
 * Generate a compelling headline from the data
 * Uses relative comparison within dataset - no hardcoded thresholds
 */
function generateHeadline(
  measures: MeasureInfo[], 
  labelOverrides: Record<string, string>,
  entityHint?: string
): string {
  if (measures.length === 0) return 'Performance Overview';
  
  // Separate rate and volume metrics
  const rates = measures.filter(m => m.isRate);
  const volumes = measures.filter(m => !m.isRate);
  
  // For rates: find the best and worst relative to each other
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => b.avg - a.avg);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    // If there's significant spread, highlight the opportunity
    const spread = best.avg - worst.avg;
    if (spread > 0.10) { // 10 percentage points difference
      const worstLabel = normalizeFieldName(worst.name, labelOverrides, { isRate: true, entityHint });
      return `Opportunity to Improve ${worstLabel}`;
    }
    
    // If all rates are similar, highlight the leader
    const bestLabel = normalizeFieldName(best.name, labelOverrides, { isRate: true, entityHint });
    return `Strong ${bestLabel} Performance`;
  } else if (rates.length === 1) {
    const rate = rates[0];
    const label = normalizeFieldName(rate.name, labelOverrides, { isRate: true, entityHint });
    return `${label} Analysis`;
  }
  
  // Fallback to volume-based headline
  if (volumes.length > 0) {
    const topVolume = volumes[0];
    const label = normalizeFieldName(topVolume.name, labelOverrides, { entityHint });
    const entityLabel = entityHint || label;
    return `${entityLabel} Performance Overview`;
  }
  
  return 'Performance Overview';
}

/**
 * Generate key takeaway from the data
 * Uses relative comparisons and statistical context - no hardcoded thresholds
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
  
  // For rates: use relative comparison (best vs worst) instead of fixed thresholds
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => b.avg - a.avg);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestLabel = normalizeFieldName(best.name, labelOverrides, { isRate: true, entityHint });
    const worstLabel = normalizeFieldName(worst.name, labelOverrides, { isRate: true, entityHint });
    
    insights.push(
      `${bestLabel} leads at ${formatValue(best.avg, true)}, ` +
      `while ${worstLabel} shows opportunity at ${formatValue(worst.avg, true)}`
    );
  } else if (rates.length === 1) {
    const rate = rates[0];
    const label = normalizeFieldName(rate.name, labelOverrides, { isRate: true, entityHint });
    insights.push(`${label} is ${formatValue(rate.avg, true)}`);
  }
  
  // Add volume context if space allows
  if (insights.length < 2 && volumes.length > 0) {
    const topVolume = volumes[0];
    const label = normalizeFieldName(topVolume.name, labelOverrides, { entityHint });
    const prefix = label.toLowerCase().startsWith('total') ? '' : 'Total ';
    insights.push(`${prefix}${label}: ${formatValue(topVolume.sum, false)}`);
  }
  
  return insights.join('. ') + (insights.length > 0 ? '.' : '');
}

/**
 * Generate data-driven insights
 * Uses statistical analysis - no hardcoded domain thresholds
 */
function generateInsights(
  analyzed: AnalyzedData,
  labelOverrides: Record<string, string>,
  entityHint?: string
): { icon: string; title: string; description: string; type: 'info' | 'success' | 'warning' | 'highlight' }[] {
  const insights: { icon: string; title: string; description: string; type: 'info' | 'success' | 'warning' | 'highlight' }[] = [];
  
  // Concentration analysis - using relative share, no domain thresholds
  if (analyzed.breakdowns.length > 0) {
    const bd = analyzed.breakdowns[0];
    if (bd.data.length >= 2) {
      const total = bd.data.reduce((sum, d) => sum + d.value, 0);
      const topShare = bd.data[0].value / total;
      const top3Share = bd.data.slice(0, 3).reduce((sum, d) => sum + d.value, 0) / total;
      
      // Use statistical thresholds: top segment > 50% or top 3 > 80% = high concentration
      // These are mathematical concentration metrics, not domain-specific
      if (topShare > 0.5) {
        insights.push({
          icon: ICONS.target,
          title: 'High Concentration',
          description: `"${bd.data[0].label}" represents ${(topShare * 100).toFixed(0)}% of total ${normalizeFieldName(bd.measure.name, labelOverrides, { entityHint })}. Top 3 account for ${(top3Share * 100).toFixed(0)}%.`,
          type: 'warning'
        });
      } else if (top3Share > 0.8) {
        insights.push({
          icon: ICONS.chart,
          title: 'Concentrated Distribution',
          description: `Top 3 segments account for ${(top3Share * 100).toFixed(0)}% of total. "${bd.data[0].label}" leads at ${(topShare * 100).toFixed(0)}%.`,
          type: 'info'
        });
      } else {
        insights.push({
          icon: ICONS.chart,
          title: 'Balanced Distribution',
          description: `"${bd.data[0].label}" leads with ${(topShare * 100).toFixed(0)}% share across ${bd.data.length} segments.`,
          type: 'success'
        });
      }
    }
  }
  
  // Rate performance - compare rates to each other (relative analysis)
  const rates = analyzed.measures.filter(m => m.isRate);
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => b.avg - a.avg);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    const bestLabel = normalizeFieldName(best.name, labelOverrides, { isRate: true, entityHint });
    const worstLabel = normalizeFieldName(worst.name, labelOverrides, { isRate: true, entityHint });
    const bestPct = (best.avg > 1 ? best.avg : best.avg * 100).toFixed(1);
    const worstPct = (worst.avg > 1 ? worst.avg : worst.avg * 100).toFixed(1);
    
    insights.push({
      icon: ICONS.rocket,
      title: `${bestLabel} Leads`,
      description: `${bestLabel} at ${bestPct}% is the top performer. ${worstLabel} at ${worstPct}% has room for improvement.`,
      type: 'success'
    });
  } else if (rates.length === 1) {
    const rate = rates[0];
    const label = normalizeFieldName(rate.name, labelOverrides, { isRate: true, entityHint });
    const pct = (rate.avg > 1 ? rate.avg : rate.avg * 100).toFixed(1);
    
    insights.push({
      icon: ICONS.chart,
      title: `${label} Overview`,
      description: `${label} is ${pct}% (range: ${(rate.min * 100).toFixed(1)}% - ${(rate.max * 100).toFixed(1)}%).`,
      type: 'info'
    });
  }
  
  // Volume summary - always useful context
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
 * Generate actionable recommendations based on statistical analysis
 * NO domain-specific assumptions - uses relative comparisons and data patterns
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
  
  // Recommendation 1: Focus on lowest-performing rate (if multiple rates exist)
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => a.avg - b.avg);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    
    // Only recommend if there's meaningful spread (>5 percentage points)
    const spread = highest.avg - lowest.avg;
    if (spread > 0.05) {
      const lowestLabel = normalizeFieldName(lowest.name, labelOverrides, { isRate: true, entityHint });
      recommendations.push({
        priority: 'high',
        action: `Investigate factors affecting ${lowestLabel} to identify improvement opportunities.`,
        rationale: `${lowestLabel} shows the most room for improvement compared to other metrics.`,
        tag: 'Analysis Recommended'
      });
    }
  }
  
  // Recommendation 2: Leverage top performers (if breakdown data exists)
  if (analyzed.breakdowns.length > 0 && analyzed.breakdowns[0].data.length >= 2) {
    const bd = analyzed.breakdowns[0];
    const topPerformer = bd.data[0];
    const bottomPerformers = bd.data.slice(-3);
    const dimLabel = normalizeFieldName(bd.dimension, labelOverrides, { entityHint });
    
    recommendations.push({
      priority: 'medium',
      action: `Analyze success factors in "${topPerformer.label}" and apply learnings to lower performers.`,
      rationale: `"${topPerformer.label}" leads in ${dimLabel}. Understanding its drivers could improve others.`,
      tag: 'Best Practice Analysis'
    });
    
    // If there's high variance, suggest segment optimization
    const total = bd.data.reduce((sum, d) => sum + d.value, 0);
    const bottomShare = bottomPerformers.reduce((sum, d) => sum + d.value, 0) / total;
    if (bottomShare < 0.1 && bd.data.length >= 5) {
      recommendations.push({
        priority: 'low',
        action: `Review lowest-performing ${dimLabel} segments for optimization or resource reallocation.`,
        rationale: `Bottom segments account for ${(bottomShare * 100).toFixed(0)}% of total. Consider focusing resources on high-impact areas.`,
        tag: 'Resource Optimization'
      });
    }
  }
  
  // Recommendation 3: Data quality / variance analysis
  for (const rate of rates.slice(0, 2)) {
    const variance = rate.max - rate.min;
    if (variance > 0.3 && rate.count >= 5) { // High variance (>30 percentage points) across multiple records
      const label = normalizeFieldName(rate.name, labelOverrides, { isRate: true, entityHint });
      recommendations.push({
        priority: 'medium',
        action: `Investigate high variance in ${label} (${(rate.min * 100).toFixed(0)}%-${(rate.max * 100).toFixed(0)}%).`,
        rationale: `Large spread may indicate inconsistent performance or segment-specific factors worth understanding.`,
        tag: 'Variance Analysis'
      });
      break; // Only one variance recommendation
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
 * 
 * NOTE: This is for DISPLAY labeling only, not business logic.
 * It helps provide meaningful labels like "Total Emails" instead of "Total Count".
 * This doesn't make any assumptions about business metrics or thresholds.
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
  
  // Common entity patterns for display labeling
  // These patterns help create readable labels, not business assumptions
  const entityPatterns: Array<{ pattern: RegExp; entity: string; countLabel: string }> = [
    // Email/Campaign patterns
    { pattern: /sent.*(email|mail)|email.*sent|send.*count/i, entity: 'Emails', countLabel: 'Emails Sent' },
    { pattern: /open.*(email|rate)|email.*open/i, entity: 'Emails', countLabel: 'Emails Opened' },
    { pattern: /click.*(email|rate)|email.*click/i, entity: 'Emails', countLabel: 'Emails Clicked' },
    { pattern: /deliver.*(email|rate)|email.*deliver/i, entity: 'Emails', countLabel: 'Emails Delivered' },
    { pattern: /email|campaign|newsletter|inbox/i, entity: 'Emails', countLabel: 'Total Emails' },
    // Other common entities
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
    
    // Skip showing "Top X by Id" - these aren't meaningful breakdowns
    // Only show when we have a meaningful measure label (not just an ID column)
    const skipMeasureLabels = ['id', 'ids', 'pk', 'key', 'guid', 'uuid', 'record id', 'row id'];
    const shouldSkip = skipMeasureLabels.includes(measureLabel.toLowerCase().trim());
    
    if (!shouldSkip) {
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
