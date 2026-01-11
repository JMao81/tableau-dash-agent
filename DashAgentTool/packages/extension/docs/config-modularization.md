# Config.html JavaScript Modularization Guide

This document explains the refactoring of the DashAgent extension's JavaScript from inline scripts in `config.html` to proper TypeScript modules.

## Overview

The original `config.html` contained ~11,500 lines with 76 inline JavaScript functions. This has been refactored into a modular TypeScript structure for:

- ✅ **Better IDE support** - Navigation, autocomplete, type checking
- ✅ **Cleaner git diffs** - Changes to specific functions are isolated
- ✅ **Unit testability** - Individual modules can be tested
- ✅ **Reusability** - Modules can be shared across files
- ✅ **Maintainability** - Clear separation of concerns

## New Module Structure

```
packages/extension/src/config/
├── index.ts              # Main entry point - exports everything
├── types.ts              # TypeScript type definitions
├── state.ts              # Centralized app state management
├── llm-client.ts         # OpenAI/Anthropic API calls
├── mcp-client.ts         # WebSocket MCP communication
├── utils/
│   ├── index.ts          # Re-exports utilities
│   ├── statistics.ts     # Statistical analysis functions
│   └── formatting.ts     # Markdown/HTML conversion
└── renderers/
    ├── index.ts          # Main renderVisualization + exports
    ├── types.ts          # Renderer-specific types
    ├── bar-charts.ts     # Bar and horizontal bar charts
    ├── pie-charts.ts     # Pie and donut charts
    ├── line-charts.ts    # Line and area charts
    ├── kpi-cards.ts      # KPI and metric cards
    └── data-table.ts     # Data table renderer
```

## Module Descriptions

### Core Modules

#### `types.ts`
Type definitions used throughout the extension:
- `DashboardContext` - Current dashboard state
- `Settings` - User preferences
- `ModelConfig` - AI model configuration
- `ConversationMessage` - Chat history items

#### `state.ts`
Centralized application state via `AppState` class:
```typescript
import { appState } from './state';

// Access settings
console.log(appState.settings.apiKey);

// Update dashboard context
appState.dashboardContext.worksheets = [...];

// Persist to localStorage
appState.saveSettings();
```

#### `llm-client.ts`
Unified LLM API client:
```typescript
import { callLLM } from './llm-client';

const response = await callLLM(messages, {
  task: 'generation',  // 'vision' | 'generation' | 'analysis'
  maxTokens: 4096
});
```

#### `mcp-client.ts`
MCP WebSocket communication:
```typescript
import { connectMCP, sendChatToMCP } from './mcp-client';

await connectMCP();
const response = await sendChatToMCP(userMessage);
```

### Utility Modules

#### `utils/statistics.ts`
Statistical analysis functions:
- `calculateCorrelation(x, y)` - Pearson correlation
- `detectDistribution(values)` - Distribution type detection
- `detectOutliers(values)` - IQR-based outlier detection
- `calculateGiniCoefficient(values)` - Inequality measure
- `linearRegression(x, y)` - Simple linear regression

#### `utils/formatting.ts`
Text formatting utilities:
- `escapeHtml(text)` - HTML entity escaping
- `convertMarkdownToHtml(md)` - Markdown to HTML conversion
- `generateSequentialColors(baseColor, count)` - Color palette generation

### Renderer Modules

#### `renderers/index.ts`
Main visualization orchestrator:
```typescript
import { renderVisualization } from './renderers';

const html = await renderVisualization({
  vizType: 'bar',
  worksheetObj: worksheet,
  measureField: 'Sales',
  dimensionField: 'Region',
  colorScheme: 'tableau'
});
```

Individual chart renderers:
- `renderBarChart()` / `renderHorizontalBarChart()`
- `renderPieChart()` / `renderDonutChart()`
- `renderLineChart()` / `renderAreaChart()`
- `renderKPICard()` / `renderMetricCards()`
- `renderDataTable()`

## Usage in config.html

### Option 1: Use the bundled module (Recommended)

After building with Vite, include the bundle:

```html
<script type="module">
  import { initDashAgent, renderVisualization, callLLM } from './dist/js/config-bundle.js';
  
  // Initialize on load
  await initDashAgent();
  
  // Use functions as needed
  const chart = await renderVisualization(config);
</script>
```

### Option 2: Import directly during development

With Vite dev server:

```html
<script type="module">
  import { initDashAgent } from './src/config/index.ts';
  await initDashAgent();
</script>
```

## Vite Configuration

The `vite.config.ts` has been updated with multiple entry points:

```typescript
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      config: resolve(__dirname, 'config.html'),
      'config-bundle': resolve(__dirname, 'src/config/index.ts')
    }
  }
}
```

Build with: `npm run build`

## Migration Steps

1. **Build the bundle**: `npm run build`
2. **Update config.html**: Replace inline `<script>` with module import
3. **Test functionality**: Verify all features work
4. **Remove old code**: Delete inline JavaScript from config.html

## Functions NOT Yet Migrated

The following remain in config.html and should be migrated next:

- `executeToolCall()` - 5,486 lines, the largest function
- `initDashAgent()` - Initialization logic
- `sendMessage()` - Chat message handling
- Event handlers and UI bindings

## Testing

Run TypeScript checks:
```bash
npm run typecheck
```

Build and test:
```bash
npm run build
npm run preview
```

## Troubleshooting

### Module not found errors
Ensure Vite dev server is running: `npm run dev`

### Type errors
Run `npm run typecheck` to see all TypeScript issues

### Function not working
Check browser console for import errors. Ensure exports are correct.
