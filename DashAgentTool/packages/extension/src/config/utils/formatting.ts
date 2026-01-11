/**
 * Markdown and HTML utility functions
 */

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convert Markdown to HTML for chat messages
 */
export function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  
  function flushList() {
    if (listItems.length > 0) {
      result.push('<ul style="margin: 8px 0; padding-left: 20px;">' + listItems.map(li => `<li style="margin-bottom: 4px;">${li}</li>`).join('') + '</ul>');
      listItems = [];
      inList = false;
    }
  }
  
  function flushTable() {
    if (tableRows.length > 0) {
      let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px;">';
      tableRows.forEach((row, i) => {
        const tag = i === 0 ? 'th' : 'td';
        const style = i === 0 
          ? 'background: #f3f4f6; font-weight: 600; padding: 8px; border: 1px solid #e5e7eb; text-align: left;'
          : 'padding: 8px; border: 1px solid #e5e7eb;';
        tableHtml += '<tr>' + row.map(cell => `<${tag} style="${style}">${cell}</${tag}>`).join('') + '</tr>';
      });
      tableHtml += '</table>';
      result.push(tableHtml);
      tableRows = [];
      inTable = false;
    }
  }
  
  function formatInline(text: string): string {
    // First, handle hex color codes - show visual swatch
    // Only match hex colors that are standalone (not inside HTML attributes)
    let result = text.replace(/#([A-Fa-f0-9]{6})\b/g, (match) => {
      return `<span class="color-swatch-wrapper" style="display: inline-flex; align-items: center; gap: 4px; margin: 2px 0;"><span style="display: inline-block; width: 16px; height: 16px; background: ${match}; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2); flex-shrink: 0;"></span><span style="font-family: monospace; font-size: 0.85em; color: #374151;">${match}</span></span>`;
    });
    
    // Bold
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // Italic
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Inline code
    result = result.replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">$1</code>');
    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #3b82f6;">$1</a>');
    return result;
  }
  
  for (const line of lines) {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push(`<pre style="background: #f3f4f6; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px;"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        // Language hint captured but not yet used (e.g., line.slice(3) = 'javascript')
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    
    // Tables
    if (line.includes('|')) {
      flushList();
      const cells = line.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/));
      if (cells.length > 0) {
        if (!inTable) inTable = true;
        // Skip separator row
        if (!line.match(/^\|?[\s-|]+\|?$/)) {
          tableRows.push(cells.map(formatInline));
        }
        continue;
      }
    } else if (inTable) {
      flushTable();
    }
    
    // Headers
    if (line.startsWith('#### ')) {
      flushList();
      flushTable();
      result.push(`<h4 style="color: #4b5563; margin-top: 20px; margin-bottom: 10px; font-size: 1.1em;">${formatInline(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      flushTable();
      result.push(`<h3 style="color: #374151; margin-top: 20px; margin-bottom: 12px;">${formatInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      flushTable();
      result.push(`<h2 style="color: #1f2937; margin-top: 28px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">${formatInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      flushTable();
      result.push(`<h1 style="color: #111827; margin-bottom: 16px; font-size: 1.8em;">${formatInline(line.slice(2))}</h1>`);
      continue;
    }
    
    // Lists
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        inList = true;
      }
      listItems.push(formatInline(listMatch[3]));
      continue;
    } else if (inList && line.trim() === '') {
      flushList();
      continue;
    }
    
    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      flushList();
      flushTable();
      result.push('<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">');
      continue;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      flushTable();
      result.push(`<blockquote style="border-left: 3px solid #3b82f6; padding-left: 12px; margin: 8px 0; color: #6b7280;">${formatInline(line.slice(2))}</blockquote>`);
      continue;
    }
    
    // Empty line - just flush list and continue (no extra breaks)
    if (line.trim() === '') {
      flushList();
      continue;
    }
    
    // Regular paragraph
    flushList();
    result.push(`<p style="margin: 8px 0; line-height: 1.6;">${formatInline(line)}</p>`);
  }
  
  flushList();
  flushTable();
  
  return result.join('');
}

/**
 * Generate sequential colors from a base color
 */
export function generateSequentialColors(baseColor: string, steps: number = 10): string[] {
  // Convert hex to HSL
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Generate colors from light to dark
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const newL = 0.9 - (i / steps) * 0.6; // Range from 90% to 30% lightness
    colors.push(hslToHex(h, s, newL));
  }
  
  return colors;
}

/**
 * Convert HSL to Hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get bar color based on color mode
 */
export function getBarColor(colors: string[], index: number, total: number, colorMode: string = 'single', sequentialColors: string[] | null = null): string {
  if (colorMode === 'sequential' && sequentialColors) {
    const colorIndex = Math.floor((index / total) * sequentialColors.length);
    return sequentialColors[Math.min(colorIndex, sequentialColors.length - 1)];
  }
  if (colorMode === 'categorical') {
    return colors[index % colors.length];
  }
  // Single color mode (default) - use the first color
  return colors[0];
}

/**
 * Get categorical color for pie/donut charts
 */
export function getCategoricalColor(colors: string[], index: number): string {
  return colors[index % colors.length];
}
