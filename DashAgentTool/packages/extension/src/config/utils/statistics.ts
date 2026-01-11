/**
 * Statistics utility functions for data analysis
 */

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
export function calculateCorrelation(x: number[], y: number[]): { r: number; strength: string; direction?: string; significant?: boolean } {
  if (x.length !== y.length || x.length < 3) return { r: 0, strength: 'insufficient data' };
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return { r: 0, strength: 'no variance' };
  
  const r = numerator / denominator;
  const absR = Math.abs(r);
  
  let strength: string;
  if (absR >= 0.8) strength = 'very strong';
  else if (absR >= 0.6) strength = 'strong';
  else if (absR >= 0.4) strength = 'moderate';
  else if (absR >= 0.2) strength = 'weak';
  else strength = 'negligible';
  
  // Approximate p-value using t-distribution
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  // Simplified significance check
  const isSignificant = Math.abs(t) > 2; // Roughly p < 0.05 for n > 20
  
  return { r: parseFloat(r.toFixed(3)), strength, direction: r > 0 ? 'positive' : 'negative', significant: isSignificant };
}

/**
 * Detect distribution type from values
 */
export function detectDistribution(values: number[]): { type: string; skewness: number; kurtosis: number; mean?: number; stdDev?: number } {
  if (values.length < 10) return { type: 'insufficient data', skewness: 0, kurtosis: 0 };
  
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return { type: 'constant', skewness: 0, kurtosis: 0 };
  
  // Calculate skewness (asymmetry)
  const m3 = values.reduce((acc, v) => acc + Math.pow((v - mean) / stdDev, 3), 0) / n;
  
  // Calculate kurtosis (tailedness)
  const m4 = values.reduce((acc, v) => acc + Math.pow((v - mean) / stdDev, 4), 0) / n;
  const kurtosis = m4 - 3; // Excess kurtosis (normal = 0)
  
  let type: string;
  if (Math.abs(m3) < 0.5 && Math.abs(kurtosis) < 1) {
    type = 'approximately normal';
  } else if (m3 > 1) {
    type = 'right-skewed (positive skew)';
  } else if (m3 < -1) {
    type = 'left-skewed (negative skew)';
  } else if (kurtosis > 2) {
    type = 'heavy-tailed (leptokurtic)';
  } else if (kurtosis < -1) {
    type = 'light-tailed (platykurtic)';
  } else {
    type = 'slightly skewed';
  }
  
  return { type, skewness: parseFloat(m3.toFixed(2)), kurtosis: parseFloat(kurtosis.toFixed(2)), mean, stdDev };
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(values: number[], fieldName: string): Array<{ index: number; value: number; type: string; field: string; deviation: string }> {
  if (values.length < 4) return [];
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outliers: Array<{ index: number; value: number; type: string; field: string; deviation: string }> = [];
  values.forEach((v, idx) => {
    if (v < lowerBound) {
      outliers.push({ index: idx, value: v, type: 'low', field: fieldName, deviation: ((q1 - v) / iqr).toFixed(2) + ' IQR below Q1' });
    } else if (v > upperBound) {
      outliers.push({ index: idx, value: v, type: 'high', field: fieldName, deviation: ((v - q3) / iqr).toFixed(2) + ' IQR above Q3' });
    }
  });
  
  return outliers;
}

/**
 * Calculate percentiles
 */
export function calculatePercentiles(values: number[], percentiles: number[] = [5, 25, 50, 75, 95]): Record<string, number> {
  if (values.length === 0) return {};
  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<string, number> = {};
  for (const p of percentiles) {
    const idx = Math.floor(sorted.length * p / 100);
    result[`p${p}`] = sorted[Math.min(idx, sorted.length - 1)];
  }
  return result;
}

/**
 * Calculate Gini coefficient (concentration measure)
 */
export function calculateGiniCoefficient(values: number[]): number {
  if (values.length < 2) return 0;
  
  const sorted = [...values].filter(v => v >= 0).sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  if (sum === 0) return 0;
  
  let giniSum = 0;
  
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return parseFloat((giniSum / (n * sum)).toFixed(3));
}

/**
 * Simple linear regression
 */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } | null {
  if (x.length !== y.length || x.length < 3) return null;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
  const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  
  return { slope: parseFloat(slope.toFixed(4)), intercept: parseFloat(intercept.toFixed(4)), rSquared: parseFloat(rSquared.toFixed(3)) };
}

/**
 * Detect seasonality in time series (simple autocorrelation)
 */
export function detectSeasonality(values: number[], maxLag: number = 12): { detected: boolean; period?: number; strength?: number; autocorrelations?: Array<{ lag: number; ac: number }> } {
  if (values.length < maxLag * 2) return { detected: false };
  
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  
  if (variance === 0) return { detected: false };
  
  const autocorrelations: Array<{ lag: number; ac: number }> = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (values[i] - mean) * (values[i + lag] - mean);
    }
    const ac = sum / ((n - lag) * variance);
    autocorrelations.push({ lag, ac: parseFloat(ac.toFixed(3)) });
  }
  
  // Find strongest lag (excluding very short lags)
  const significantLags = autocorrelations.filter(a => a.lag >= 2 && Math.abs(a.ac) > 0.3);
  const strongestLag = significantLags.sort((a, b) => Math.abs(b.ac) - Math.abs(a.ac))[0];
  
  if (strongestLag) {
    return { detected: true, period: strongestLag.lag, strength: Math.abs(strongestLag.ac), autocorrelations };
  }
  
  return { detected: false, autocorrelations };
}

/**
 * Format value as percentage if it looks like a rate
 */
export function formatAsPercentage(value: number | string, fieldName: string): string {
  const numVal = parseFloat(String(value));
  if (isNaN(numVal)) return String(value);
  
  // Check if field name suggests it's a rate
  const isRate = /rate|ratio|percent|%|pct|proportion|share/i.test(fieldName);
  
  // If it's a decimal between 0 and 1, and field suggests rate, format as %
  if (isRate && numVal >= 0 && numVal <= 1) {
    return (numVal * 100).toFixed(1) + '%';
  }
  // If it's already > 1 but < 100 and looks like a rate, add %
  if (isRate && numVal > 1 && numVal <= 100) {
    return numVal.toFixed(1) + '%';
  }
  return String(value);
}

/**
 * Generate hash for cache validation
 */
export function generateDataHash(data: any): string {
  const str = JSON.stringify(data).substring(0, 1000);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Format number for display (K, M abbreviations)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}
