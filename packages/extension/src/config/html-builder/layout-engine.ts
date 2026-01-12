/**
 * Smart UI Layout Engine
 * 
 * Intelligent layout system that arranges dashboard elements based on:
 * - Element type and semantic meaning (hero, supporting, context)
 * - Visual hierarchy and design principles
 * - Content importance and size requirements
 * - Professional design patterns (Iron Viz quality)
 * 
 * No hardcoded if/else logic - the engine uses design heuristics
 * to determine optimal arrangement.
 */

import { ThemeConfig, THEMES, applyCustomColors } from './base';

// ==================== ELEMENT TYPES ====================

/**
 * Semantic importance level - determines visual prominence
 */
export type ImportanceLevel = 'hero' | 'primary' | 'secondary' | 'tertiary' | 'context';

/**
 * Size preference - how much space the element wants
 */
export type SizePreference = 'compact' | 'medium' | 'large' | 'full-width' | 'auto';

/**
 * Element categories
 */
export type ElementType = 
  | 'hero-headline'    // Main story headline
  | 'key-takeaway'     // Summary insight box
  | 'kpi'              // Single metric card
  | 'kpi-group'        // Group of related KPIs
  | 'chart'            // Any visualization (bar, line, pie, etc.)
  | 'insight'          // Textual insight callout
  | 'data-table'       // Tabular data
  | 'section-header'   // Section divider with title
  | 'narrative'        // Paragraph of explanatory text
  | 'recommendation'   // Action recommendation
  | 'footer'           // Footer/attribution
  | 'spacer';          // Visual breathing room

/**
 * Chart subtypes for layout optimization
 */
export type ChartSubtype = 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie' | 'donut' | 'sparkline';

/**
 * Base layout element interface
 */
export interface LayoutElement {
  id: string;
  type: ElementType;
  importance: ImportanceLevel;
  size: SizePreference;
  content: ElementContent;
  order?: number;  // Optional explicit ordering
}

/**
 * Content types for different elements
 */
export interface ElementContent {
  // Common
  title?: string;
  subtitle?: string;
  
  // KPI content
  value?: string;
  label?: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
  color?: string;
  
  // Chart content
  chartHtml?: string;
  chartType?: ChartSubtype;
  
  // Insight content
  insightType?: 'info' | 'success' | 'warning' | 'highlight';
  icon?: string;
  description?: string;
  
  // Narrative content
  text?: string;
  
  // Table content
  tableHtml?: string;
  rowCount?: number;
  
  // Recommendation content
  priority?: 'high' | 'medium' | 'low';
  action?: string;
  rationale?: string;
  
  // Section header
  badge?: string;
  
  // Raw HTML override
  rawHtml?: string;
}

// ==================== LAYOUT GRID SYSTEM ====================

/**
 * Layout result
 */
export interface LayoutResult {
  html: string;
  gridCss: string;
  elementCount: number;
  hasHero: boolean;
  hasInsights: boolean;
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  theme: ThemeConfig;
  maxColumns: number;
  gapSize: number;
  containerMaxWidth: string;
  includeContainer: boolean;  // Whether to wrap in container div
}

// ==================== DESIGN HEURISTICS ====================

/**
 * Get sort order for element arrangement
 * Lower numbers appear first
 */
function getElementSortOrder(element: LayoutElement): number {
  // Explicit order takes precedence
  if (element.order !== undefined) return element.order;
  
  const { type, importance } = element;
  
  // Base order by type
  const typeOrder: Record<ElementType, number> = {
    'hero-headline': 0,
    'key-takeaway': 10,
    'section-header': 20,
    'kpi': 30,
    'kpi-group': 30,
    'insight': 40,
    'chart': 50,
    'narrative': 60,
    'data-table': 70,
    'recommendation': 80,
    'spacer': 85,
    'footer': 100
  };
  
  // Importance modifier
  const importanceModifier: Record<ImportanceLevel, number> = {
    'hero': -5,
    'primary': 0,
    'secondary': 2,
    'tertiary': 4,
    'context': 6
  };
  
  return typeOrder[type] + importanceModifier[importance];
}

/**
 * Group elements by semantic sections
 */
function groupElementsBySection(elements: LayoutElement[]): Map<string, LayoutElement[]> {
  const sections = new Map<string, LayoutElement[]>();
  
  // Define section boundaries
  const sectionOrder = ['hero', 'metrics', 'insights', 'charts', 'details', 'actions', 'footer'];
  
  for (const section of sectionOrder) {
    sections.set(section, []);
  }
  
  for (const element of elements) {
    let section = 'details'; // Default
    
    switch (element.type) {
      case 'hero-headline':
      case 'key-takeaway':
        section = 'hero';
        break;
      case 'kpi':
      case 'kpi-group':
        section = 'metrics';
        break;
      case 'insight':
        section = 'insights';
        break;
      case 'chart':
        section = 'charts';
        break;
      case 'data-table':
      case 'narrative':
        section = 'details';
        break;
      case 'recommendation':
        section = 'actions';
        break;
      case 'footer':
        section = 'footer';
        break;
    }
    
    sections.get(section)!.push(element);
  }
  
  return sections;
}

// ==================== ELEMENT RENDERERS ====================

/**
 * Render hero headline element
 */
function renderHeroHeadline(content: ElementContent, theme: ThemeConfig): string {
  return `
    <div style="
      text-align: center;
      padding: 32px 24px;
      background: linear-gradient(135deg, ${theme.primary}15 0%, ${theme.primary}05 100%);
      border-radius: 16px;
      margin-bottom: 8px;
    ">
      <h1 style="
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
        color: ${theme.text};
        line-height: 1.2;
      ">${content.title || 'Dashboard'}</h1>
      ${content.subtitle ? `
        <p style="
          margin: 0;
          font-size: 16px;
          color: ${theme.textMuted};
        ">${content.subtitle}</p>
      ` : ''}
    </div>
  `;
}

/**
 * Render key takeaway box
 */
function renderKeyTakeaway(content: ElementContent, theme: ThemeConfig): string {
  return `
    <div style="
      background: ${theme.primary}12;
      border-left: 4px solid ${theme.primary};
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 8px;
    ">
      <div style="
        display: flex;
        align-items: flex-start;
        gap: 12px;
      ">
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${theme.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        <div>
          <div style="
            font-weight: 600;
            color: ${theme.text};
            margin-bottom: 4px;
            font-size: 14px;
          ">${content.title || 'Key Takeaway'}</div>
          <div style="
            color: ${theme.textSecondary};
            font-size: 14px;
            line-height: 1.5;
          ">${content.text || content.description || ''}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render KPI card
 */
function renderKpiCard(content: ElementContent, theme: ThemeConfig): string {
  const color = content.color || theme.primary;
  const sparklineSvg = content.sparklineData && content.sparklineData.length > 0
    ? generateSparklineSvg(content.sparklineData, color)
    : '';
  
  const changeColor = content.changeDirection === 'up' ? '#22c55e' : 
                       content.changeDirection === 'down' ? '#ef4444' : theme.textMuted;
  const changeIcon = content.changeDirection === 'up' ? '↑' : 
                      content.changeDirection === 'down' ? '↓' : '';
  
  return `
    <div style="
      background: ${theme.cardBg || 'white'};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid ${theme.border || '#e5e7eb'};
      height: 100%;
      display: flex;
      flex-direction: column;
      min-width: 0;
    ">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: ${theme.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${content.label || 'Metric'}</div>
      
      <div style="
        font-size: 32px;
        font-weight: 700;
        color: ${color};
        margin-bottom: 8px;
        line-height: 1.1;
        word-break: break-word;
      ">${content.value || '0'}</div>
      
      ${content.change ? `
        <div style="
          font-size: 13px;
          color: ${changeColor};
          font-weight: 500;
          margin-bottom: 8px;
        ">${changeIcon} ${content.change}</div>
      ` : ''}
      
      ${sparklineSvg ? `
        <div style="margin-top: auto; opacity: 0.8; width: 100%;">
          ${sparklineSvg}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate sparkline SVG
 */
function generateSparklineSvg(data: number[], color: string): string {
  if (!data || data.length < 2) return '';
  
  const width = 100;
  const height = 30;
  const padding = 2;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline
        points="${points}"
        fill="none"
        stroke="${color}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

/**
 * Render insight callout
 */
function renderInsight(content: ElementContent, theme: ThemeConfig): string {
  const typeColors = {
    info: { bg: '#3b82f620', border: '#3b82f6', icon: 'ℹ️' },
    success: { bg: '#22c55e20', border: '#22c55e', icon: '✓' },
    warning: { bg: '#f59e0b20', border: '#f59e0b', icon: '⚠' },
    highlight: { bg: `${theme.primary}20`, border: theme.primary, icon: '★' }
  };
  
  const style = typeColors[content.insightType || 'info'];
  
  return `
    <div style="
      background: ${style.bg};
      border-left: 3px solid ${style.border};
      border-radius: 8px;
      padding: 16px 20px;
      height: 100%;
    ">
      <div style="
        font-weight: 600;
        color: ${theme.text};
        margin-bottom: 6px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span>${content.icon || style.icon}</span>
        ${content.title || 'Insight'}
      </div>
      <div style="
        color: ${theme.textSecondary};
        font-size: 13px;
        line-height: 1.5;
      ">${content.description || ''}</div>
    </div>
  `;
}

/**
 * Render section header
 */
function renderSectionHeader(content: ElementContent, theme: ThemeConfig): string {
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0 8px 0;
      border-bottom: 1px solid ${theme.border || '#e5e7eb'};
      margin-bottom: 8px;
    ">
      <h2 style="
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: ${theme.text};
      ">${content.title || 'Section'}</h2>
      ${content.badge ? `
        <span style="
          background: ${theme.primary}15;
          color: ${theme.primary};
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        ">${content.badge}</span>
      ` : ''}
    </div>
  `;
}

/**
 * Render chart wrapper
 */
function renderChart(content: ElementContent, theme: ThemeConfig): string {
  // Generate chart ID from title for deduplication
  const chartId = `chart-${(content.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  
  const containerStyle = `
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  `.replace(/\s+/g, ' ').trim();
  
  if (content.rawHtml) {
    // Wrap rawHtml with data-chart-id for deduplication and proper sizing
    return `<div data-chart-id="${chartId}" style="${containerStyle}">${content.rawHtml}</div>`;
  }
  if (content.chartHtml) {
    // Wrap chartHtml with data-chart-id for deduplication and proper sizing
    return `<div data-chart-id="${chartId}" style="${containerStyle}">${content.chartHtml}</div>`;
  }
  
  return `
    <div data-chart-id="${chartId}" style="
      background: ${theme.cardBg || 'white'};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid ${theme.border || '#e5e7eb'};
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    ">
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: ${theme.text};
        margin-bottom: 16px;
      ">${content.title || 'Chart'}</div>
      <div style="color: ${theme.textMuted}; text-align: center; padding: 40px;">
        Chart content will be rendered here
      </div>
    </div>
  `;
}

/**
 * Render recommendation card
 */
function renderRecommendation(content: ElementContent, theme: ThemeConfig): string {
  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e'
  };
  
  const color = priorityColors[content.priority || 'medium'];
  
  return `
    <div style="
      background: ${theme.cardBg || 'white'};
      border-radius: 8px;
      padding: 16px 20px;
      border-left: 4px solid ${color};
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      height: 100%;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${color};
        "></span>
        <span style="
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: ${color};
        ">${content.priority || 'Medium'} Priority</span>
      </div>
      <div style="
        font-weight: 600;
        color: ${theme.text};
        margin-bottom: 6px;
        font-size: 14px;
      ">${content.action || 'Recommendation'}</div>
      ${content.rationale ? `
        <div style="
          color: ${theme.textMuted};
          font-size: 13px;
        ">${content.rationale}</div>
      ` : ''}
    </div>
  `;
}

/**
 * Render narrative text
 */
function renderNarrative(content: ElementContent, theme: ThemeConfig): string {
  return `
    <div style="
      color: ${theme.textSecondary};
      font-size: 14px;
      line-height: 1.7;
      padding: 12px 0;
    ">${content.text || ''}</div>
  `;
}

/**
 * Render data table wrapper
 */
function renderDataTable(content: ElementContent, theme: ThemeConfig): string {
  const containerStyle = `
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    overflow-x: auto;
  `.replace(/\s+/g, ' ').trim();
  
  if (content.tableHtml) {
    return `<div style="${containerStyle}">${content.tableHtml}</div>`;
  }
  if (content.rawHtml) {
    return `<div style="${containerStyle}">${content.rawHtml}</div>`;
  }
  
  return `
    <div style="
      background: ${theme.cardBg || 'white'};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid ${theme.border || '#e5e7eb'};
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    ">
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: ${theme.text};
        margin-bottom: 8px;
      ">${content.title || 'Data Table'}</div>
      ${content.rowCount ? `
        <div style="
          font-size: 12px;
          color: ${theme.textMuted};
          margin-bottom: 16px;
        ">${content.rowCount} rows</div>
      ` : ''}
      <div style="color: ${theme.textMuted}; text-align: center; padding: 20px;">
        Table content will be rendered here
      </div>
    </div>
  `;
}

/**
 * Render footer
 */
function renderFooter(content: ElementContent, theme: ThemeConfig): string {
  return `
    <div style="
      text-align: center;
      padding: 20px;
      margin-top: 16px;
      color: ${theme.textMuted};
      font-size: 12px;
      border-top: 1px solid ${theme.border || '#e5e7eb'};
    ">
      ${content.text || `Generated by DashAgent • ${new Date().toLocaleDateString()}`}
    </div>
  `;
}

/**
 * Render spacer
 */
function renderSpacer(_content: ElementContent, _theme: ThemeConfig): string {
  return `<div style="height: 16px;"></div>`;
}

/**
 * Render a single element
 */
function renderElement(element: LayoutElement, theme: ThemeConfig): string {
  const { type, content } = element;
  
  switch (type) {
    case 'hero-headline':
      return renderHeroHeadline(content, theme);
    case 'key-takeaway':
      return renderKeyTakeaway(content, theme);
    case 'kpi':
      return renderKpiCard(content, theme);
    case 'kpi-group':
      return content.rawHtml || '';
    case 'chart':
      return renderChart(content, theme);
    case 'insight':
      return renderInsight(content, theme);
    case 'section-header':
      return renderSectionHeader(content, theme);
    case 'narrative':
      return renderNarrative(content, theme);
    case 'data-table':
      return renderDataTable(content, theme);
    case 'recommendation':
      return renderRecommendation(content, theme);
    case 'footer':
      return renderFooter(content, theme);
    case 'spacer':
      return renderSpacer(content, theme);
    default:
      return content.rawHtml || '';
  }
}

// ==================== LAYOUT ENGINE ====================

/**
 * Smart layout engine - arranges elements using design principles
 */
export function layoutElements(
  elements: LayoutElement[],
  config: Partial<LayoutConfig> = {}
): LayoutResult {
  const defaultConfig: LayoutConfig = {
    theme: THEMES.professional,
    maxColumns: 12,
    gapSize: 16,
    containerMaxWidth: '1200px',
    includeContainer: true
  };
  
  const cfg: LayoutConfig = { ...defaultConfig, ...config };
  const { theme, maxColumns, gapSize, containerMaxWidth, includeContainer } = cfg;
  
  if (elements.length === 0) {
    return {
      html: '<div style="padding: 40px; text-align: center; color: #666;">No content to display</div>',
      gridCss: '',
      elementCount: 0,
      hasHero: false,
      hasInsights: false
    };
  }
  
  // Sort elements by semantic order
  const sortedElements = [...elements].sort((a, b) => 
    getElementSortOrder(a) - getElementSortOrder(b)
  );
  
  // Group by sections
  const sections = groupElementsBySection(sortedElements);
  
  // Build HTML for each section
  const sectionHtmlParts: string[] = [];
  
  for (const [sectionName, sectionElements] of sections) {
    // Allow charts section to be processed even when empty (for append marker)
    if (sectionElements.length === 0 && sectionName !== 'charts') continue;
    
    // Hero section - full width, no grid
    if (sectionName === 'hero') {
      for (const el of sectionElements) {
        sectionHtmlParts.push(renderElement(el, theme));
      }
      continue;
    }
    
    // Footer section - full width, no grid
    if (sectionName === 'footer') {
      for (const el of sectionElements) {
        sectionHtmlParts.push(renderElement(el, theme));
      }
      continue;
    }
    
    // Metrics section - smart KPI grid
    if (sectionName === 'metrics') {
      const kpis = sectionElements.filter(e => e.type === 'kpi');
      if (kpis.length > 0) {
        const kpiHtml = buildSmartKpiGrid(kpis, theme);
        sectionHtmlParts.push(kpiHtml);
      }
      continue;
    }
    
    // Insights section - flexible grid
    if (sectionName === 'insights' && sectionElements.length > 0) {
      const insightGrid = buildFlexibleGrid(sectionElements, theme, maxColumns);
      sectionHtmlParts.push(`
        <div style="margin-bottom: 20px;">
          ${insightGrid}
        </div>
      `);
      continue;
    }
    
    // Charts section - balanced grid (always include for append support)
    if (sectionName === 'charts') {
      if (sectionElements.length > 0) {
        const chartGrid = buildBalancedChartGrid(sectionElements, theme);
        sectionHtmlParts.push(`
          <div id="dashagent-charts-section" style="margin-bottom: 20px;">
            ${chartGrid}
            <!-- DASHAGENT_CHARTS_APPEND_MARKER -->
          </div>
        `);
      } else {
        // Empty charts section placeholder for appending later
        sectionHtmlParts.push(`
          <div id="dashagent-charts-section" style="margin-bottom: 20px;">
            <!-- DASHAGENT_CHARTS_APPEND_MARKER -->
          </div>
        `);
      }
      continue;
    }
    
    // Actions section - recommendation grid
    if (sectionName === 'actions' && sectionElements.length > 0) {
      sectionHtmlParts.push(`
        <div style="margin-bottom: 20px;">
          ${renderSectionHeader({ title: 'Recommended Actions', badge: `${sectionElements.length}` }, theme)}
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: ${gapSize}px;">
            ${sectionElements.map(el => renderElement(el, theme)).join('')}
          </div>
        </div>
      `);
      continue;
    }
    
    // Details section - stacked
    if (sectionName === 'details') {
      for (const el of sectionElements) {
        sectionHtmlParts.push(`
          <div style="margin-bottom: 16px;">
            ${renderElement(el, theme)}
          </div>
        `);
      }
      continue;
    }
  }
  
  // Combine all sections
  const innerHtml = sectionHtmlParts.join('\n');
  
  // Wrap in container if requested
  const html = includeContainer ? `
<div class="dashagent-dashboard" style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: ${theme.bg};
  padding: 20px;
  min-height: 100%;
  border-radius: 8px;
">
  <div style="max-width: ${containerMaxWidth}; margin: 0 auto;">
    ${innerHtml}
    <!-- DASHAGENT_APPEND_MARKER -->
  </div>
</div>` : innerHtml;
  
  return {
    html,
    gridCss: '', // CSS is inline for Tableau extension compatibility
    elementCount: elements.length,
    hasHero: elements.some(e => e.type === 'hero-headline'),
    hasInsights: elements.some(e => e.type === 'insight')
  };
}

/**
 * Build smart KPI grid - adapts layout based on count
 */
function buildSmartKpiGrid(kpis: LayoutElement[], theme: ThemeConfig): string {
  const count = kpis.length;
  
  // Render all KPI cards
  const kpiHtmls = kpis.map(kpi => renderElement(kpi, theme));
  
  if (count === 0) return '';
  
  // Determine optimal columns based on count
  let gridCss: string;
  
  if (count === 1) {
    gridCss = 'grid-template-columns: 1fr;';
  } else if (count === 2) {
    gridCss = 'grid-template-columns: repeat(2, 1fr);';
  } else if (count === 3) {
    gridCss = 'grid-template-columns: repeat(3, 1fr);';
  } else if (count === 4) {
    gridCss = 'grid-template-columns: repeat(4, 1fr);';
  } else if (count === 5) {
    // 3 + 2 centered
    return `
      <div style="margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
          ${kpiHtmls.slice(0, 3).join('')}
        </div>
        <div style="display: flex; justify-content: center; gap: 16px;">
          <div style="flex: 0 0 calc(33.333% - 8px);">${kpiHtmls[3]}</div>
          <div style="flex: 0 0 calc(33.333% - 8px);">${kpiHtmls[4]}</div>
        </div>
      </div>
    `;
  } else if (count === 6) {
    // 3 + 3
    return `
      <div style="margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
          ${kpiHtmls.slice(0, 3).join('')}
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          ${kpiHtmls.slice(3, 6).join('')}
        </div>
      </div>
    `;
  } else {
    // 7+ use 4 per row with smart last row
    const rows: string[] = [];
    for (let i = 0; i < count; i += 4) {
      const rowKpis = kpiHtmls.slice(i, Math.min(i + 4, count));
      const isLastRow = i + 4 >= count;
      
      if (isLastRow && rowKpis.length < 4) {
        // Center the last row
        rows.push(`
          <div style="display: flex; justify-content: center; gap: 16px;">
            ${rowKpis.map(h => `<div style="flex: 0 0 calc(25% - 12px);">${h}</div>`).join('')}
          </div>
        `);
      } else {
        rows.push(`
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
            ${rowKpis.join('')}
          </div>
        `);
      }
    }
    
    return `<div style="margin-bottom: 24px;">${rows.join('\n<div style="height: 16px;"></div>\n')}</div>`;
  }
  
  return `
    <div style="display: grid; ${gridCss} gap: 16px; margin-bottom: 24px;">
      ${kpiHtmls.join('')}
    </div>
  `;
}

/**
 * Build flexible grid for insights
 */
function buildFlexibleGrid(elements: LayoutElement[], theme: ThemeConfig, _maxColumns: number): string {
  // Use auto-fit with min-max for responsive layout
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      ${elements.map(el => renderElement(el, theme)).join('')}
    </div>
  `;
}

/**
 * Build balanced chart grid
 */
function buildBalancedChartGrid(charts: LayoutElement[], theme: ThemeConfig): string {
  const count = charts.length;
  
  if (count === 0) return '';
  
  // Single chart - full width with proper container
  if (count === 1) {
    return `
      <div style="width: 100%; box-sizing: border-box;">
        ${renderElement(charts[0], theme)}
      </div>
    `;
  }
  
  // 2 charts - side by side
  if (count === 2) {
    return `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; width: 100%;">
        ${charts.map(c => `<div style="min-width: 0;">${renderElement(c, theme)}</div>`).join('')}
      </div>
    `;
  }
  
  // 3+ charts - smart arrangement
  // First chart large, others smaller OR 2+1 layout
  const firstChart = charts[0];
  const isFirstChartWide = firstChart.content.chartType === 'line' || 
                            firstChart.content.chartType === 'area' ||
                            firstChart.importance === 'primary';
  
  if (isFirstChartWide && count === 3) {
    // Wide chart on top, 2 below
    return `
      <div style="width: 100%;">
        <div style="margin-bottom: 20px; width: 100%;">
          ${renderElement(charts[0], theme)}
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; width: 100%;">
          <div style="min-width: 0;">${renderElement(charts[1], theme)}</div>
          <div style="min-width: 0;">${renderElement(charts[2], theme)}</div>
        </div>
      </div>
    `;
  }
  
  // Default: responsive grid that fills width
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; width: 100%;">
      ${charts.map(c => `<div style="min-width: 0;">${renderElement(c, theme)}</div>`).join('')}
    </div>
  `;
}

// ==================== CONVENIENCE BUILDERS ====================

/**
 * Create a KPI element
 */
export function createKpiElement(
  id: string,
  label: string,
  value: string,
  options: {
    color?: string;
    change?: string;
    changeDirection?: 'up' | 'down' | 'neutral';
    sparklineData?: number[];
    importance?: ImportanceLevel;
  } = {}
): LayoutElement {
  return {
    id,
    type: 'kpi',
    importance: options.importance || 'primary',
    size: 'compact',
    content: {
      label,
      value,
      color: options.color,
      change: options.change,
      changeDirection: options.changeDirection,
      sparklineData: options.sparklineData
    }
  };
}

/**
 * Create an insight element
 */
export function createInsightElement(
  id: string,
  title: string,
  description: string,
  options: {
    type?: 'info' | 'success' | 'warning' | 'highlight';
    icon?: string;
    importance?: ImportanceLevel;
  } = {}
): LayoutElement {
  return {
    id,
    type: 'insight',
    importance: options.importance || 'secondary',
    size: 'medium',
    content: {
      title,
      description,
      insightType: options.type || 'info',
      icon: options.icon
    }
  };
}

/**
 * Create a chart element
 */
export function createChartElement(
  id: string,
  title: string,
  chartHtml: string,
  options: {
    chartType?: ChartSubtype;
    importance?: ImportanceLevel;
    size?: SizePreference;
  } = {}
): LayoutElement {
  return {
    id,
    type: 'chart',
    importance: options.importance || 'primary',
    size: options.size || 'medium',
    content: {
      title,
      chartHtml,
      chartType: options.chartType
    }
  };
}

/**
 * Create a hero headline element
 */
export function createHeroElement(
  title: string,
  subtitle?: string
): LayoutElement {
  return {
    id: 'hero',
    type: 'hero-headline',
    importance: 'hero',
    size: 'full-width',
    content: { title, subtitle }
  };
}

/**
 * Create a key takeaway element
 */
export function createKeyTakeawayElement(
  title: string,
  text: string
): LayoutElement {
  return {
    id: 'key-takeaway',
    type: 'key-takeaway',
    importance: 'hero',
    size: 'full-width',
    content: { title, text }
  };
}

/**
 * Create a footer element
 */
export function createFooterElement(text?: string): LayoutElement {
  return {
    id: 'footer',
    type: 'footer',
    importance: 'context',
    size: 'full-width',
    content: { text }
  };
}

// ==================== THEME HELPER ====================

/**
 * Get theme config by name with optional custom colors
 */
export function getThemeConfig(
  themeName: string = 'professional',
  customColors?: string[]
): ThemeConfig {
  let theme = THEMES[themeName] || THEMES.professional;
  if (customColors && customColors.length > 0) {
    theme = applyCustomColors(theme, customColors);
  }
  return theme;
}

// ==================== INSIGHT GENERATOR ====================

/**
 * Insight types for automatic generation
 */
export interface GeneratedInsight {
  type: 'concentration' | 'trend' | 'anomaly' | 'performance' | 'comparison';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  value?: string;
  icon: string;
  insightType: 'success' | 'warning' | 'info' | 'highlight';
}

/**
 * Generate insights from analyzed data using STATISTICAL methods.
 * 
 * This function uses only mathematical/statistical thresholds:
 * - 80/20 Pareto principle (universal statistical concept)
 * - Standard deviation for outlier detection (statistical)
 * - Minimal significance thresholds to avoid noise
 * 
 * NO domain-specific thresholds (like "good open rate is 25%").
 * Insights describe WHAT the data shows, not whether it's "good" or "bad".
 * LLM should interpret business meaning based on context.
 * 
 * @param measures - Array of measure information from analyzed data
 * @param breakdowns - Array of breakdown data from analyzed data
 * @param options - Options for insight generation
 * @returns Array of generated insights
 */
export function generateDataInsights(
  measures: Array<{
    name: string;
    sum: number;
    avg: number;
    min: number;
    max: number;
    count: number;
    isRate: boolean;
    values?: number[];
  }>,
  breakdowns: Array<{
    dimension: string;
    measure: { name: string; isRate: boolean };
    data: Array<{ label?: string; dimension?: string; value: number }>;
  }>,
  options: {
    maxInsights?: number;
    includeConcentration?: boolean;
    includeTrends?: boolean;
    includeAnomalies?: boolean;
    includePerformance?: boolean;
  } = {}
): GeneratedInsight[] {
  const {
    maxInsights = 3,
    includeConcentration = true,
    includeTrends = true,
    includeAnomalies = true,
    includePerformance = true
  } = options;
  
  const insights: GeneratedInsight[] = [];
  
  // Filter out identifier fields from measures (like "Id", "key", etc.)
  const filteredMeasures = measures.filter(m => !isIdentifierField(m.name));
  
  // Filter out breakdowns where the measure is an identifier
  const filteredBreakdowns = breakdowns.filter(bd => !isIdentifierField(bd.measure.name));
  
  // 1. Concentration Analysis (80/20 rule)
  if (includeConcentration && filteredBreakdowns.length > 0) {
    for (const bd of filteredBreakdowns) {
      if (bd.data.length >= 3) {
        // Normalize data to use 'name' field (handle both label and dimension)
        const normalizedData = bd.data.map(d => ({
          name: d.label || d.dimension || 'Unknown',
          value: d.value
        }));
        const sorted = [...normalizedData].sort((a, b) => b.value - a.value);
        const total = sorted.reduce((sum, d) => sum + d.value, 0);
        
        if (total > 0) {
          // Find how many items account for 80%
          let cumulative = 0;
          let count80 = 0;
          for (const item of sorted) {
            cumulative += item.value;
            count80++;
            if (cumulative >= total * 0.8) break;
          }
          
          const percentOfItems = Math.round((count80 / sorted.length) * 100);
          
          if (percentOfItems <= 30) {
            insights.push({
              type: 'concentration',
              priority: 'high',
              title: 'High Concentration',
              description: `${percentOfItems}% of ${bd.dimension} drives 80% of ${formatMeasureName(bd.measure.name)}. The top performer is "${sorted[0].name}".`,
              metric: bd.measure.name,
              icon: '🎯',
              insightType: 'highlight'
            });
          }
        }
      }
    }
  }
  
  // 2. Trend Analysis (if we have time-series values)
  if (includeTrends) {
    for (const m of filteredMeasures) {
      if (m.values && m.values.length >= 5) {
        const trend = calculateTrend(m.values);
        
        // Skip if 100% change - indicates non-time-series data (first or last value is 0)
        // Also skip very extreme changes (>90%) as they're usually data artifacts
        if (Math.abs(trend.percentChange) >= 90) {
          console.log(`[generateInsights] Skipping suspicious trend for ${m.name}: ${trend.percentChange}% (first=${trend.firstValue}, last=${trend.lastValue})`);
          continue;
        }
        
        // Only show meaningful trends (≥5% change) and not 'flat' direction
        if (trend.direction !== 'flat' && Math.abs(trend.percentChange) >= 5) {
          const direction = trend.direction;
          const icon = direction === 'up' ? '📈' : '📉';
          const insightType: 'success' | 'warning' = m.isRate
            ? (direction === 'up' ? 'success' : 'warning')
            : (direction === 'up' ? 'success' : 'warning');
          
          // Format change description based on metric type
          const absChange = Math.abs(trend.percentChange);
          let changeDesc: string;
          
          if (m.isRate) {
            // For rates, show actual point change if small percentage change
            const pointChange = Math.abs(trend.lastValue - trend.firstValue);
            if (absChange < 20 && pointChange < 0.5) {
              // Small change - show in points (e.g., "decreased 0.9 points")
              changeDesc = `${direction === 'up' ? 'increased' : 'decreased'} ${(pointChange * 100).toFixed(1)} points`;
            } else {
              changeDesc = `${direction === 'up' ? 'increased' : 'decreased'} ${absChange.toFixed(0)}%`;
            }
          } else {
            changeDesc = `${direction === 'up' ? 'grown' : 'declined'} by ${absChange.toFixed(0)}%`;
          }
          
          insights.push({
            type: 'trend',
            priority: absChange >= 25 ? 'high' : 'medium',
            title: `${formatMeasureName(m.name)} ${direction === 'up' ? 'Increasing' : 'Declining'}`,
            description: `${formatMeasureName(m.name)} has ${changeDesc} over the period.`,
            metric: m.name,
            value: `${trend.percentChange > 0 ? '+' : ''}${trend.percentChange.toFixed(1)}%`,
            icon,
            insightType
          });
        }
      }
    }
  }
  
  // 3. Anomaly Detection (outliers in values)
  if (includeAnomalies) {
    for (const m of filteredMeasures) {
      if (m.values && m.values.length >= 5) {
        const { outliers, mean, stdDev } = detectOutliers(m.values);
        
        if (outliers.length > 0) {
          const maxOutlier = Math.max(...outliers);
          const deviations = Math.round((maxOutlier - mean) / stdDev);
          
          insights.push({
            type: 'anomaly',
            priority: deviations >= 3 ? 'high' : 'medium',
            title: 'Anomaly Detected',
            description: `Found ${outliers.length} unusual value${outliers.length > 1 ? 's' : ''} in ${formatMeasureName(m.name)} (${deviations}σ from average).`,
            metric: m.name,
            icon: '⚡',
            insightType: 'warning'
          });
        }
      }
    }
  }
  
  // 4. Performance Insights (scan ALL breakdowns, find most significant gap)
  if (includePerformance && filteredBreakdowns.length > 0) {
    let bestInsight: GeneratedInsight | null = null;
    let bestRatio = 0;
    
    for (const breakdown of filteredBreakdowns) {
      if (!breakdown || breakdown.data.length < 2) continue;
      
      // Normalize data to use 'name' field
      const normalizedData = breakdown.data.map(d => ({
        name: d.label || d.dimension || 'Unknown',
        value: d.value
      }));
      const sorted = [...normalizedData].sort((a, b) => b.value - a.value);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      
      if (top && bottom && top.value !== bottom.value && bottom.value > 0) {
        const ratio = top.value / bottom.value;
        
        // Keep the breakdown with the largest performance gap
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestInsight = {
            type: 'performance',
            priority: 'medium',
            title: 'Performance Gap',
            description: `"${top.name}" outperforms "${bottom.name}" by ${Math.round(ratio)}x in ${formatMeasureName(breakdown.measure.name)}.`,
            metric: breakdown.measure.name,
            icon: '🏆',
            insightType: 'info'
          };
        }
      }
    }
    
    if (bestInsight) {
      insights.push(bestInsight);
    }
  }
  
  // Sort by priority and limit
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return insights.slice(0, maxInsights);
}

/**
 * Calculate trend from time series values
 * Uses first vs last value for accurate % change (not averages that can be misleading)
 */
function calculateTrend(values: number[]): { percentChange: number; direction: 'up' | 'down' | 'flat'; firstValue: number; lastValue: number } {
  if (values.length < 2) return { percentChange: 0, direction: 'flat', firstValue: 0, lastValue: 0 };
  
  // Use actual first and last values for clearer, more accurate comparison
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  
  // Handle edge cases
  if (firstValue === 0) {
    if (lastValue === 0) return { percentChange: 0, direction: 'flat', firstValue, lastValue };
    return { percentChange: 100, direction: 'up', firstValue, lastValue };
  }
  
  const percentChange = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
  
  // Use a 2% threshold to avoid showing trivial changes as trends
  const direction = percentChange > 2 ? 'up' : percentChange < -2 ? 'down' : 'flat';
  
  return { percentChange, direction, firstValue, lastValue };
}

/**
 * Detect outliers using IQR method
 */
function detectOutliers(values: number[]): { outliers: number[]; mean: number; stdDev: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const outliers = values.filter(v => v < lowerBound || v > upperBound);
  
  return { outliers, mean, stdDev };
}

/**
 * Format measure name for display
 */
function formatMeasureName(name: string): string {
  // Remove AGG(), SUM(), etc. prefixes
  let clean = name.replace(/^(AGG|SUM|AVG|COUNT|CNTD|MIN|MAX)\(|\)$/gi, '');
  // Title case and clean up
  return clean
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Check if a field name represents an identifier (not a meaningful metric)
 */
function isIdentifierField(name: string): boolean {
  const coreName = name
    .replace(/^(AGG|SUM|AVG|COUNT|CNTD|MIN|MAX|ATTR)\s*\(\s*/gi, '')
    .replace(/\s*\)$/g, '')
    .trim();
  return /^(id|ids|pk|key|guid|uuid|record_?id|row_?id|unique_?id|identifier)$/i.test(coreName);
}

/**
 * Convert generated insights to layout elements
 */
export function insightsToElements(insights: GeneratedInsight[]): LayoutElement[] {
  return insights.map((insight, index) => 
    createInsightElement(
      `insight-${index}`,
      insight.title,
      insight.description,
      {
        type: insight.insightType,  // Map insightType to type parameter
        icon: insight.icon,
        importance: insight.priority === 'high' ? 'primary' : 'secondary'
      }
    )
  );
}
