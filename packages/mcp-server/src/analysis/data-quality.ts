/**
 * Data Quality Analysis Module
 * 
 * Provides comprehensive data quality checks with severity levels
 * and actionable recommendations for a "second opinion" analyst workflow.
 */

export type Severity = 'info' | 'warning' | 'critical';

export interface DataQualityIssue {
  severity: Severity;
  category: 'completeness' | 'validity' | 'consistency' | 'accuracy' | 'timeliness';
  field: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  /** Emoji indicator for chat display */
  indicator: string;
}

export interface DataQualityReport {
  overallScore: number; // 0-100
  scoreLabel: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';
  issues: DataQualityIssue[];
  summary: string;
  /** Formatted Markdown with color indicators */
  formattedReport: string;
}

/**
 * Severity color mapping for Markdown/HTML output
 */
const SEVERITY_CONFIG = {
  critical: { emoji: '🔴', label: 'CRITICAL', color: '#dc3545' },
  warning: { emoji: '🟡', label: 'WARNING', color: '#ffc107' },
  info: { emoji: '🔵', label: 'INFO', color: '#17a2b8' },
};

/**
 * Analyze data quality for a dataset
 */
export function analyzeDataQuality(
  data: Record<string, any>[],
  fieldMetadata?: Map<string, { expectedType?: string; isRate?: boolean; isVolume?: boolean }>
): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  
  if (!data || data.length === 0) {
    return {
      overallScore: 0,
      scoreLabel: 'Critical',
      issues: [{
        severity: 'critical',
        category: 'completeness',
        field: 'dataset',
        title: 'No Data Available',
        description: 'The dataset is empty or could not be loaded.',
        evidence: 'Row count: 0',
        recommendation: 'Verify data source connection and filters.',
        indicator: SEVERITY_CONFIG.critical.emoji,
      }],
      summary: 'No data available for analysis.',
      formattedReport: generateFormattedReport([{
        severity: 'critical',
        category: 'completeness',
        field: 'dataset',
        title: 'No Data Available',
        description: 'The dataset is empty or could not be loaded.',
        evidence: 'Row count: 0',
        recommendation: 'Verify data source connection and filters.',
        indicator: SEVERITY_CONFIG.critical.emoji,
      }], 0),
    };
  }

  const columns = Object.keys(data[0]);
  const rowCount = data.length;

  // ==================== COMPLETENESS CHECKS ====================
  for (const col of columns) {
    const values = data.map(row => row[col]);
    const nullCount = values.filter(v => v === null || v === undefined || v === '' || v === 'null').length;
    const nullPct = (nullCount / rowCount) * 100;

    if (nullPct === 100) {
      issues.push({
        severity: 'critical',
        category: 'completeness',
        field: col,
        title: `${col}: Completely Empty`,
        description: 'This field contains no data.',
        evidence: `100% null/empty values (${nullCount}/${rowCount} rows)`,
        recommendation: 'Investigate data source or remove this field from analysis.',
        indicator: SEVERITY_CONFIG.critical.emoji,
      });
    } else if (nullPct > 50) {
      issues.push({
        severity: 'warning',
        category: 'completeness',
        field: col,
        title: `${col}: High Missing Rate`,
        description: `More than half of values are missing.`,
        evidence: `${nullPct.toFixed(1)}% null/empty (${nullCount}/${rowCount} rows)`,
        recommendation: 'Consider data imputation or investigate why data is missing.',
        indicator: SEVERITY_CONFIG.warning.emoji,
      });
    } else if (nullPct > 20) {
      issues.push({
        severity: 'info',
        category: 'completeness',
        field: col,
        title: `${col}: Notable Missing Values`,
        description: `Significant portion of values are missing.`,
        evidence: `${nullPct.toFixed(1)}% null/empty (${nullCount}/${rowCount} rows)`,
        recommendation: 'Review if this is expected for this field.',
        indicator: SEVERITY_CONFIG.info.emoji,
      });
    }
  }

  // ==================== VALIDITY CHECKS ====================
  for (const col of columns) {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    if (values.length === 0) continue;

    const colLower = col.toLowerCase();
    const isLikelyRate = colLower.includes('rate') || colLower.includes('percent') || colLower.includes('%');
    const isLikelyVolume = colLower.match(/count|total|sum|volume|quantity|sent|delivered|opened|clicked/);

    // Check for rates showing as 0
    if (isLikelyRate) {
      const numericValues = values.map(Number).filter(n => !isNaN(n));
      const zeroCount = numericValues.filter(n => n === 0).length;
      const zeroPct = (zeroCount / numericValues.length) * 100;

      if (numericValues.length > 0) {
        const allZero = numericValues.every(n => n === 0);
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

        if (allZero) {
          issues.push({
            severity: 'critical',
            category: 'validity',
            field: col,
            title: `${col}: All Values are Zero`,
            description: 'Rate field shows 0% across all records.',
            evidence: `All ${numericValues.length} values are 0`,
            recommendation: 'Verify rate calculation: Is numerator data missing? Is the formula correct?',
            indicator: SEVERITY_CONFIG.critical.emoji,
          });
        } else if (zeroPct > 50) {
          issues.push({
            severity: 'warning',
            category: 'validity',
            field: col,
            title: `${col}: Majority Zero Values`,
            description: `Most rate values are zero.`,
            evidence: `${zeroPct.toFixed(1)}% of values are 0 (avg: ${(avg * 100).toFixed(2)}%)`,
            recommendation: 'Investigate if zeros represent actual 0% or missing/uncalculated data.',
            indicator: SEVERITY_CONFIG.warning.emoji,
          });
        }

        // Check for rates > 100%
        const over100 = numericValues.filter(n => n > 1).length;
        if (over100 > 0 && numericValues.some(n => n > 1 && n <= 100)) {
          // Values are in percentage format (0-100), not ratio (0-1)
          issues.push({
            severity: 'info',
            category: 'validity',
            field: col,
            title: `${col}: Percentage Format Detected`,
            description: 'Values appear to be in 0-100 format rather than 0-1 ratio.',
            evidence: `Sample values: ${numericValues.slice(0, 3).map(n => n.toFixed(1)).join(', ')}`,
            recommendation: 'Ensure consistent formatting when comparing rates.',
            indicator: SEVERITY_CONFIG.info.emoji,
          });
        } else if (over100 > 0 && numericValues.some(n => n > 100)) {
          issues.push({
            severity: 'critical',
            category: 'validity',
            field: col,
            title: `${col}: Invalid Rate Values (>100%)`,
            description: 'Rate values exceed 100%, which is mathematically impossible.',
            evidence: `Found ${over100} values > 100%`,
            recommendation: 'Check rate calculation formula for errors.',
            indicator: SEVERITY_CONFIG.critical.emoji,
          });
        }
      }
    }

    // Check for negative values in volume fields
    if (isLikelyVolume) {
      const numericValues = values.map(Number).filter(n => !isNaN(n));
      const negCount = numericValues.filter(n => n < 0).length;

      if (negCount > 0) {
        const negPct = (negCount / numericValues.length) * 100;
        issues.push({
          severity: negPct > 10 ? 'warning' : 'info',
          category: 'validity',
          field: col,
          title: `${col}: Negative Values Found`,
          description: `Volume/count field contains negative numbers.`,
          evidence: `${negCount} negative values (${negPct.toFixed(1)}%)`,
          recommendation: 'Verify if negatives represent returns/corrections or data errors.',
          indicator: negPct > 10 ? SEVERITY_CONFIG.warning.emoji : SEVERITY_CONFIG.info.emoji,
        });
      }
    }
  }

  // ==================== CONSISTENCY CHECKS ====================
  for (const col of columns) {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    if (values.length === 0) continue;

    const uniqueValues = new Set(values);

    // Single value (constant) - might be expected or might be data issue
    if (uniqueValues.size === 1 && values.length > 10) {
      const value = values[0];
      issues.push({
        severity: 'info',
        category: 'consistency',
        field: col,
        title: `${col}: Constant Value`,
        description: `All ${values.length} rows have the same value.`,
        evidence: `Value: "${value}"`,
        recommendation: 'Verify if this is expected or if this field should vary.',
        indicator: SEVERITY_CONFIG.info.emoji,
      });
    }

    // All unique (might be ID field or might have duplication issues)
    if (uniqueValues.size === values.length && values.length > 10) {
      const colLower = col.toLowerCase();
      if (!colLower.includes('id') && !colLower.includes('key') && !colLower.includes('date')) {
        issues.push({
          severity: 'info',
          category: 'consistency',
          field: col,
          title: `${col}: All Unique Values`,
          description: `Every row has a different value.`,
          evidence: `${uniqueValues.size} unique values out of ${values.length} rows`,
          recommendation: 'Is this an ID field? If not, there may be over-granularity in the data.',
          indicator: SEVERITY_CONFIG.info.emoji,
        });
      }
    }
  }

  // ==================== CALCULATE OVERALL SCORE ====================
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  // Scoring: start at 100, deduct points for issues
  let score = 100;
  score -= criticalCount * 20;
  score -= warningCount * 10;
  score -= infoCount * 2;
  score = Math.max(0, Math.min(100, score));

  let scoreLabel: DataQualityReport['scoreLabel'];
  if (score >= 90) scoreLabel = 'Excellent';
  else if (score >= 75) scoreLabel = 'Good';
  else if (score >= 50) scoreLabel = 'Fair';
  else if (score >= 25) scoreLabel = 'Needs Attention';
  else scoreLabel = 'Critical';

  // Generate summary
  const summary = generateSummary(issues, score, scoreLabel, rowCount, columns.length);

  return {
    overallScore: Math.round(score),
    scoreLabel,
    issues,
    summary,
    formattedReport: generateFormattedReport(issues, score, scoreLabel, rowCount, columns.length),
  };
}

/**
 * Generate a text summary of data quality
 */
function generateSummary(
  issues: DataQualityIssue[],
  score: number,
  scoreLabel: string,
  rowCount: number,
  colCount: number
): string {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let summary = `Data Quality Score: ${score}/100 (${scoreLabel})\n`;
  summary += `Dataset: ${rowCount.toLocaleString()} rows × ${colCount} columns\n\n`;

  if (criticalCount > 0) {
    summary += `⚠️ ${criticalCount} critical issue(s) require immediate attention.\n`;
  }
  if (warningCount > 0) {
    summary += `⚡ ${warningCount} warning(s) should be reviewed.\n`;
  }
  if (issues.length === 0) {
    summary += `✅ No significant data quality issues detected.\n`;
  }

  return summary;
}

/**
 * Generate a formatted Markdown report with color indicators
 */
function generateFormattedReport(
  issues: DataQualityIssue[],
  score: number,
  scoreLabel?: string,
  rowCount?: number,
  colCount?: number
): string {
  let report = '## 📊 Data Quality Assessment\n\n';

  if (rowCount !== undefined && colCount !== undefined) {
    // Score badge
    let scoreBadge = '';
    if (score >= 75) {
      scoreBadge = `✅ **${score}/100** (${scoreLabel})`;
    } else if (score >= 50) {
      scoreBadge = `🟡 **${score}/100** (${scoreLabel})`;
    } else {
      scoreBadge = `🔴 **${score}/100** (${scoreLabel})`;
    }

    report += `| Metric | Value |\n|--------|-------|\n`;
    report += `| Quality Score | ${scoreBadge} |\n`;
    report += `| Rows | ${rowCount.toLocaleString()} |\n`;
    report += `| Columns | ${colCount} |\n`;
    report += `| Issues Found | ${issues.length} |\n\n`;
  }

  // Group issues by severity
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  if (criticalIssues.length > 0) {
    report += `### 🔴 Critical Issues (${criticalIssues.length})\n\n`;
    report += `> **These issues may significantly impact analysis reliability.**\n\n`;
    for (const issue of criticalIssues) {
      report += formatIssue(issue);
    }
  }

  if (warningIssues.length > 0) {
    report += `### 🟡 Warnings (${warningIssues.length})\n\n`;
    report += `> **Review these items to ensure data accuracy.**\n\n`;
    for (const issue of warningIssues) {
      report += formatIssue(issue);
    }
  }

  if (infoIssues.length > 0) {
    report += `### 🔵 Informational (${infoIssues.length})\n\n`;
    for (const issue of infoIssues) {
      report += formatIssue(issue);
    }
  }

  if (issues.length === 0) {
    report += `### ✅ All Clear\n\n`;
    report += `No significant data quality issues were detected. The data appears suitable for analysis.\n\n`;
  }

  return report;
}

/**
 * Format a single issue for Markdown output
 */
function formatIssue(issue: DataQualityIssue): string {
  return `**${issue.title}**\n` +
    `- ${issue.description}\n` +
    `- *Evidence:* ${issue.evidence}\n` +
    `- *Recommendation:* ${issue.recommendation}\n\n`;
}

/**
 * Quick validation for common rate/volume patterns
 * Returns issues specific to metrics that should be highlighted
 */
export function validateMetrics(
  measures: Array<{ name: string; value: number; isRate?: boolean }>
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  for (const measure of measures) {
    const nameLower = measure.name.toLowerCase();
    const isRate = measure.isRate || nameLower.includes('rate') || nameLower.includes('%');

    if (isRate) {
      if (measure.value === 0) {
        issues.push({
          severity: 'warning',
          category: 'validity',
          field: measure.name,
          title: `${measure.name} is 0%`,
          description: 'This rate metric shows zero.',
          evidence: `Value: 0%`,
          recommendation: 'Verify the calculation or check if numerator data exists.',
          indicator: SEVERITY_CONFIG.warning.emoji,
        });
      } else if (measure.value > 1 && measure.value <= 100) {
        // Likely percentage format, not a problem
      } else if (measure.value > 100) {
        issues.push({
          severity: 'critical',
          category: 'validity',
          field: measure.name,
          title: `${measure.name} exceeds 100%`,
          description: 'Rate value is mathematically impossible.',
          evidence: `Value: ${measure.value}%`,
          recommendation: 'Check the rate calculation formula.',
          indicator: SEVERITY_CONFIG.critical.emoji,
        });
      }
    }
  }

  return issues;
}
