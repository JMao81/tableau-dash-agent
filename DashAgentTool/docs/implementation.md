# DashAgentTool Implementation Plan

> **Generated:** January 10, 2026  
> **Purpose:** Actionable to-do list for aligning implementation with documentation  
> **Target:** Can be executed by any capable model or developer

---

## Overview

This document contains three priority levels of tasks to fix discrepancies between the README documentation and actual implementation. Each task is self-contained with specific file paths, exact code changes, and verification steps.

---

## Priority 1: Quick Fixes (Critical)

These are blocking issues that should be fixed immediately.

### TODO 1.1: Remove Viz Extension Ghost Tools

**Context:** The `viz-extension` package was removed, but 5 tool definitions remain in the MCP server. These tools will fail if called.

**File:** `packages/mcp-server/src/tools/index.ts`

**Task:** Remove the following tool definitions from the `tools` array (approximately lines 390-460):

```typescript
// DELETE THESE 5 TOOL DEFINITIONS:

// 1. get-viz-encodings (lines ~391-398)
{
  name: 'get-viz-encodings',
  description: 'Get the encoding map from the Viz Extension showing which fields are placed on custom shelves (Category, Breakdown, Value, Color, Label)',
  inputSchema: {
    type: 'object',
    properties: {},
  },
},

// 2. set-viz-type (lines ~399-413)
{
  name: 'set-viz-type',
  description: 'Set the visualization type for the Viz Extension. Supports: sankey, radial, treemap, bubble, chord, force, or auto (AI suggestion)',
  inputSchema: {
    type: 'object',
    properties: {
      vizType: {
        type: 'string',
        enum: ['auto', 'sankey', 'radial', 'treemap', 'bubble', 'chord', 'force'],
        description: 'The type of visualization to render',
      },
    },
    required: ['vizType'],
  },
},

// 3. render-custom-viz (lines ~414-430)
{
  name: 'render-custom-viz',
  description: 'Render a custom AI-generated visualization in the Viz Extension using D3.js code',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'D3.js code to render the visualization. Receives: d3, data, width, height, container as parameters.',
      },
      description: {
        type: 'string',
        description: 'Description of the visualization for documentation',
      },
    },
    required: ['code'],
  },
},

// 4. get-viz-data (lines ~431-445)
{
  name: 'get-viz-data',
  description: 'Get the current data from the Viz Extension worksheet along with encoding information',
  inputSchema: {
    type: 'object',
    properties: {
      maxRows: {
        type: 'number',
        description: 'Maximum rows to return',
        default: 100,
      },
    },
  },
},

// 5. suggest-viz-type (lines ~446-459)
{
  name: 'suggest-viz-type',
  description: 'Use AI to analyze the current data and encodings and suggest the best visualization type',
  inputSchema: {
    type: 'object',
    properties: {
      context: {
        type: 'string',
        description: 'Additional context about what the user wants to visualize',
      },
    },
  },
},
```

**Also delete the corresponding case handlers** (approximately lines 2207-2340):

```typescript
// DELETE THESE CASE HANDLERS:

case 'get-viz-encodings': { ... }
case 'set-viz-type': { ... }
case 'render-custom-viz': { ... }
case 'get-viz-data': { ... }
case 'suggest-viz-type': { ... }
```

**Also update the comment at the top of the file** (approximately lines 1-62):

Find and delete this section from the header comment:
```typescript
 * 🔌 VIZ EXTENSION (5 tools):
 * - get-viz-encodings: Get shelf encodings
 * - set-viz-type: Set visualization type
 * - render-custom-viz: Render D3.js visualizations
 * - get-viz-data: Get viz extension data
 * - suggest-viz-type: AI viz type suggestions
```

Update the tool count from `37 tools total` to `32 tools total`.

**Verification:**
- [ ] Run `npm run build` in the mcp-server package
- [ ] Confirm no TypeScript errors
- [ ] Verify the tools array no longer includes viz-extension tools

---

### TODO 1.2: Update README Tool Table - Extension Tools Section

**File:** `README.md`

**Task:** Replace the "Extension Tools (Real-time Dashboard Control)" table with accurate tool names.

**Find this section (approximately lines 168-182):**
```markdown
### Extension Tools (Real-time Dashboard Control)

| Tool | Description |
|------|-------------|
| `check-connection` | Verify extension is connected |
| `get-dashboard-info` | Get worksheets, parameters, filters |
| `get-worksheet-data` | Extract data from any worksheet |
| `apply-filter` | Apply categorical filter via AI |
| `set-parameter` | Set parameter value via AI |
| `render-component` | Render any HTML in extension |
| `render-kpi-card` | Display styled KPI with trend |
| `render-insight` | Show AI-generated insight card |
| `clear-canvas` | Clear rendered content |
| `send-chat-message` | Send message to extension UI |
| `analyze-design` | Vision AI analyzes dashboard screenshot |
| `analyze-worksheet-structure` | Extract shelf configuration via vision |
| `generate-dashboard-documentation` | Create markdown docs |
```

**Replace with:**
```markdown
### Extension Tools (Real-time Dashboard Control)

| Tool | Description |
|------|-------------|
| `check-connection` | Verify extension is connected |
| `get-worksheet-data` | Extract data from any worksheet |
| `apply-filter` | Apply categorical filter via AI |
| `set-parameter` | Set parameter value via AI |
| `render-component` | Render any HTML in extension |
| `clear-canvas` | Clear rendered content |
| `get-dashboard-screenshot` | Capture dashboard screenshot |
| `analyze-design` | Vision AI analyzes dashboard design |
| `analyze-iron-viz-style` | Iron Viz competition design scoring |
| `generate-documentation` | Create markdown documentation |
```

---

### TODO 1.3: Update README Tool Table - Analysis Tools Section

**File:** `README.md`

**Task:** Replace the "Analysis Tools (Deep Data Exploration)" table.

**Find this section (approximately lines 184-194):**
```markdown
### Analysis Tools (Deep Data Exploration)

| Tool | Description |
|------|-------------|
| `explore-data` | Statistical profiling, distributions, outliers |
| `find-hidden-insights` | What patterns exist but aren't shown? |
| `detect-anomalies` | Unusual values, sudden changes |
| `compare-data-vs-dashboard` | Gap between data and display |
| `critique-visualization` | Is this chart telling the truth? |
| `suggest-narrative` | What story should this data tell? |
| `generate-insight-report` | Create PDF/Markdown report |
| `show-analysis-in-dashboard` | Render insights in extension |
```

**Replace with:**
```markdown
### Analysis Tools (Deep Data Exploration)

| Tool | Description |
|------|-------------|
| `analyze-dashboard-smart` | Primary analysis tool with 5 modes (profile, concentration, segment, trend, anomaly) |
| `full-data-exploration` | Comprehensive data science analysis |
| `profile-data-for-visualization` | Pre-visualization data profiling |
| `get-analysis-strategy` | Get optimized query templates for Tableau MCP |
| `get-semantic-metadata` | Fetch datasource field metadata |
| `interpret-concentration` | Pareto/80-20 analysis interpretation |
| `interpret-segments` | Segment comparison interpretation |
```

---

### TODO 1.4: Update README Tool Table - TWB Tools Section

**File:** `README.md`

**Task:** Replace the "TWB Tools (Workbook Modification)" table.

**Find this section (approximately lines 196-206):**
```markdown
### TWB Tools (Workbook Modification)

| Tool | Description |
|------|-------------|
| `analyze-twb-file` | Parse and understand workbook structure |
| `get-twb-colors` | Extract current color palettes |
| `get-twb-fonts` | Extract font settings |
| `apply-brand-to-twb` | Apply brand colors and fonts |
| `modify-twb-fonts` | Change fonts across workbook |
| `extract-twbx` | Unzip TWBX to access TWB |
| `save-modified-twb` | Save changes back to file |
```

**Replace with:**
```markdown
### Workbook Manipulation Tools

| Tool | Description |
|------|-------------|
| `download-workbook` | Download workbook from Tableau Server/Cloud |
| `parse-workbook-xml` | Parse and understand workbook structure |
| `modify-workbook` | Apply XML modifications (colors, fonts, parameters, calculated fields) |
| `publish-workbook` | Publish modified workbook back to Server/Cloud |
| `apply-design-recommendations` | Auto-apply design changes from AI recommendations |
```

---

### TODO 1.5: Add Missing Visualization Tools Section

**File:** `README.md`

**Task:** Add a new section for visualization tools after the Workbook Manipulation Tools section.

**Insert after the Workbook Manipulation Tools table:**
```markdown
### Visualization Building Tools

| Tool | Description |
|------|-------------|
| `build-dashboard` | Create complete dashboards with KPIs, charts, and insights |
| `render-visualization` | Render single charts (bar, line, pie, table) |
| `transform-to-story` | Add storytelling elements (annotations, callouts) |
| `confirm-chart-fields` | Validate field selections before rendering |
| `clear-visualization` | Clear the preview canvas |
| `toggle-tooltips` | Toggle chart tooltip visibility |

### Design Analysis Tools

| Tool | Description |
|------|-------------|
| `analyze-color-harmony` | Analyze color palette for harmony and accessibility |
| `generate-tableau-palette` | Create Tableau color palette files |
| `suggest-annotations` | AI-powered annotation recommendations |
```

---

### TODO 1.6: Add Orchestration Tools Section

**File:** `README.md`

**Task:** Add a new section for the agentic orchestration tool.

**Insert before "Extension Tools" section (after the demo section, around line 165):**
```markdown
### Orchestration Tools

| Tool | Description |
|------|-------------|
| `agentic-analyst` | High-level workflow orchestrator with 4 modes: full-analysis, quick-insights, design-critique, redesign |

The `agentic-analyst` tool returns structured multi-step plans that guide the AI through complete workflows, ensuring efficient and consistent analysis.

---

```

---

## Priority 2: Documentation Updates (Important)

These improve user understanding of the system.

### TODO 2.1: Update File Structure in README

**File:** `README.md`

**Task:** Update the project structure diagram to match actual implementation.

**Find this section (approximately lines 365-395):**
```markdown
## 📁 Project Structure

```
DashAgentTool/
├── packages/
│   ├── extension/              # Tableau Dashboard Extension
│   │   ├── manifest.trex       # Extension manifest
│   │   ├── index.html          # Main UI
│   │   └── src/
│   │       ├── main.ts         # Entry point, mode switching
│   │       ├── tableau-bridge.ts   # Tableau API wrapper
│   │       ├── websocket-client.ts # MCP server connection
│   │       ├── chat-ui.ts      # Chat interface
│   │       ├── renderer.ts     # HTML component renderer
│   │       └── image-drop.ts   # Screenshot capture
│   │
│   └── mcp-server/             # MCP Server
│       └── src/
│           ├── index.ts        # Server entry, tool routing
│           ├── websocket-bridge.ts # Extension connections
│           ├── tools/
│           │   ├── index.ts    # Extension tools
│           │   ├── twb-tools.ts    # TWB manipulation
│           │   └── analysis-tools.ts # Data analysis
│           ├── twb/            # TWB parser/modifier
│           │   ├── parser.ts
│           │   ├── analyzer.ts
│           │   └── modifier.ts
│           └── analysis/       # Data exploration engine
│               ├── explorer.ts
│               ├── critic.ts
│               └── reporter.ts
```
```

**Replace with:**
```markdown
## 📁 Project Structure

```
DashAgentTool/
├── packages/
│   ├── extension/              # Tableau Dashboard Extension
│   │   ├── manifest.trex       # Extension manifest
│   │   ├── index.html          # Entry point
│   │   ├── config.html         # Main configuration UI
│   │   └── src/
│   │       └── config/
│   │           ├── app.ts          # Main application logic
│   │           ├── state.ts        # Application state management
│   │           ├── mcp-client.ts   # WebSocket MCP connection
│   │           ├── llm-client.ts   # LLM API integration
│   │           ├── types.ts        # TypeScript type definitions
│   │           ├── renderers/      # Chart rendering modules
│   │           │   ├── index.ts
│   │           │   ├── bar-charts.ts
│   │           │   ├── line-charts.ts
│   │           │   ├── pie-charts.ts
│   │           │   ├── kpi-cards.ts
│   │           │   └── data-table.ts
│   │           ├── html-builder/   # Dashboard HTML generation
│   │           │   ├── index.ts
│   │           │   ├── dashboard.ts
│   │           │   ├── story.ts
│   │           │   ├── components.ts
│   │           │   └── layout-engine.ts
│   │           └── utils/          # Utility functions
│   │               ├── formatting.ts
│   │               └── statistics.ts
│   │
│   └── mcp-server/             # MCP Server
│       └── src/
│           ├── index.ts            # Server entry, MCP protocol
│           ├── websocket-bridge.ts # Extension WebSocket connections
│           ├── tableau-rest-api.ts # Tableau Server/Cloud API client
│           ├── llm-handler.ts      # LLM orchestration
│           ├── guardrails.ts       # Safety checks
│           ├── tool-router.ts      # Tool routing logic
│           ├── tools/
│           │   └── index.ts        # All 32 MCP tools
│           └── analysis/           # Data analysis engine
│               ├── query-recipes.ts    # Tableau query templates
│               └── statistics.ts       # Statistical functions
```
```

---

### TODO 2.2: Add Agentic Workflow Documentation Section

**File:** `README.md`

**Task:** Expand the AI Orchestration Workflow section with more detail.

**Find the section (approximately lines 340-365):**
```markdown
## 🤖 AI Orchestration Workflow

DashAgentTool includes an **agentic orchestrator** that enables end-to-end AI workflows. Instead of ad-hoc tool calls, the `agentic-analyst` tool returns structured multi-step plans.

### Workflow Modes

| Mode | What It Does |
|------|-------------|
| `full-analysis` | Complete dashboard analysis: context → data profiling → insights → recommendations |
| `quick-insights` | Fast path: get data, run stats, surface top findings |
| `design-critique` | Vision-based: screenshot → design analysis → improvement suggestions |
| `redesign` | Full redesign: analyze → critique → generate new dashboard HTML |
```

**Add after this table:**
```markdown
### Analysis Strategies

The `get-analysis-strategy` tool provides pre-built query templates optimized for Tableau MCP:

| Strategy | Purpose | Token Cost |
|----------|---------|------------|
| `quick-profile` | Fast overview with key statistics | ~450 tokens |
| `concentration-analysis` | Find if few items dominate (80/20 rule) | ~250 tokens |
| `segment-deep-dive` | Compare performance across categories | ~350 tokens |
| `trend-analysis` | Analyze performance over time | ~250 tokens |
| `anomaly-scan` | Find unusual patterns | ~300 tokens |

### Interpretation Tools

After running Tableau MCP queries, use these tools to interpret results:

- **`interpret-concentration`**: Analyzes Pareto/80-20 patterns and customer concentration risk
- **`interpret-segments`**: Compares segment performance and identifies outliers

### Vision AI Capabilities

The design analysis tools support multiple analysis types:

| Analysis Type | Use Case |
|---------------|----------|
| `design-review` | UX/UI issues, layout problems, color usage |
| `storytelling` | Data narrative clarity, audience focus |
| `accessibility` | Color contrast, text size, WCAG compliance |
| `shelf-detection` | Extract Rows/Columns/Marks configuration |
| `iron-viz` | Competition-ready design scoring |
```

---

### TODO 2.3: Update Architecture Diagram in README

**File:** `README.md`

**Task:** Update the architecture diagram to remove references to deprecated tools.

**Find the architecture ASCII diagram (approximately lines 58-100):**

In the diagram, find and update:
```
│   │  Extension Tools:           │  │  • get-view-image                │  │
│   │  • apply-filter             │  │  • get-view-data                 │  │
│   │  • set-parameter            │  │  • query-datasource              │  │
│   │  • get-worksheet-data       │  │  • list-workbooks                │  │
│   │  • analyze-design           │  │  • generate-pulse-insights       │  │
│   │  • render-insight           │  │                                  │  │
│   │                             │  │                                  │  │
│   │  Analysis Tools:            │  │                                  │  │
│   │  • explore-data             │  │                                  │  │
│   │  • find-hidden-insights     │  │                                  │  │
│   │  • critique-visualization   │  │                                  │  │
│   │                             │  │                                  │  │
│   │  TWB Tools:                 │  │                                  │  │
│   │  • analyze-twb-file         │  │                                  │  │
│   │  • apply-brand-to-twb       │  │                                  │  │
│   │  • modify-twb-fonts         │  │                                  │  │
```

**Replace with:**
```
│   │  Extension Tools:           │  │  • get-view-image                │  │
│   │  • apply-filter             │  │  • get-view-data                 │  │
│   │  • set-parameter            │  │  • query-datasource              │  │
│   │  • get-worksheet-data       │  │  • list-workbooks                │  │
│   │  • analyze-design           │  │  • generate-pulse-insights       │  │
│   │  • build-dashboard          │  │                                  │  │
│   │                             │  │                                  │  │
│   │  Analysis Tools:            │  │                                  │  │
│   │  • analyze-dashboard-smart  │  │                                  │  │
│   │  • get-analysis-strategy    │  │                                  │  │
│   │  • interpret-concentration  │  │                                  │  │
│   │                             │  │                                  │  │
│   │  Workbook Tools:            │  │                                  │  │
│   │  • download-workbook        │  │                                  │  │
│   │  • modify-workbook          │  │                                  │  │
│   │  • publish-workbook         │  │                                  │  │
```

---

## Priority 3: Enhancements (Nice to Have)

These improve code organization but don't affect functionality.

### TODO 3.1: Create Separate TWB Module

**Context:** README originally described separate TWB parser/analyzer/modifier modules. Currently all in `tableau-rest-api.ts`.

**Task:** Split TWB-related functions into a dedicated module.

**Step 1:** Create new file `packages/mcp-server/src/twb/index.ts`:
```typescript
/**
 * TWB Workbook Manipulation Module
 * 
 * Provides functions for parsing, analyzing, and modifying Tableau workbook XML.
 */

export { 
  extractTwbFromTwbx,
  parseWorkbookXml,
  applyXmlModification,
  insertXml,
  getWorkbookSummary,
} from '../tableau-rest-api.js';

// Re-export types
export interface WorkbookSummary {
  datasources: string[];
  worksheets: string[];
  dashboards: string[];
  parameters: string[];
  calculatedFields: string[];
  colors: string[];
  fonts: string[];
}
```

**Step 2:** Update imports in `packages/mcp-server/src/tools/index.ts`:

Add at the top:
```typescript
// Optionally use the twb module for better organization
// import { parseWorkbookXml, getWorkbookSummary } from '../twb/index.js';
```

**Note:** This is a non-breaking refactor. The current implementation works correctly; this is just for better code organization.

---

### TODO 3.2: Add Tool Usage Examples

**File:** `README.md`

**Task:** Add a new section with practical tool usage examples.

**Insert after the MCP Tools Reference section:**
```markdown
---

## 📖 Tool Usage Examples

### Example 1: Quick Dashboard Analysis

```
User: "Analyze this dashboard and tell me what's wrong"

AI uses:
1. check-connection → Verify extension is live
2. get-dashboard-screenshot → Capture current state
3. analyze-design (type: design-review) → Get AI feedback
4. analyze-dashboard-smart (mode: quick-profile) → Get data insights
5. build-dashboard → Render findings in extension
```

### Example 2: Data-Driven Redesign

```
User: "Redesign this dashboard based on the actual data"

AI uses:
1. agentic-analyst (mode: redesign) → Get workflow plan
2. get-worksheet-data → Extract all worksheet data
3. full-data-exploration → Statistical analysis
4. build-dashboard → Generate new dashboard HTML
5. transform-to-story → Add narrative elements
```

### Example 3: Workbook Modification

```
User: "Change the color palette to match our brand"

AI uses:
1. download-workbook → Get workbook from Server
2. parse-workbook-xml → Understand structure
3. modify-workbook (operation: modify-color-palette) → Apply changes
4. publish-workbook → Save back to Server
```

### Example 4: Tableau MCP Integration

```
User: "Find customer concentration risk"

AI uses:
1. get-analysis-strategy (strategy: concentration-analysis) → Get query template
2. mcp_tableau_query-datasource → Run aggregation query
3. interpret-concentration → Analyze results
4. build-dashboard → Visualize findings
```
```

---

### TODO 3.3: Add Complete Tool Count to Header Comment

**File:** `packages/mcp-server/src/tools/index.ts`

**Task:** After removing viz-extension tools, update the header to list all 32 tools accurately.

**Replace the header comment (lines 1-62) with:**
```typescript
/**
 * MCP Tools - UNIFIED Tool definitions and handlers
 * 
 * ARCHITECTURE: All tools live here in the MCP server.
 * Extension is a thin client that handles:
 * - Tableau API calls (data extraction, filters, parameters)
 * - HTML rendering
 * - Screenshot capture
 * 
 * TOOL CATEGORIES (32 tools total):
 * 
 * 📊 DATA ANALYSIS (6 tools):
 * - analyze-dashboard-smart: Primary analysis tool with 5 modes
 * - full-data-exploration: Comprehensive data science analysis
 * - profile-data-for-visualization: Pre-viz data profiling
 * - get-worksheet-data: Get data from worksheets
 * - get-analysis-strategy: Query optimization for Tableau MCP
 * - get-semantic-metadata: Datasource metadata
 * 
 * 🎯 INTERPRETATION (2 tools):
 * - interpret-concentration: Pareto/80-20 analysis
 * - interpret-segments: Segment comparison
 * 
 * 📈 VISUALIZATION (6 tools):
 * - build-dashboard: Create complete dashboards
 * - render-visualization: Render single charts
 * - transform-to-story: Add storytelling elements
 * - clear-visualization: Clear the canvas
 * - toggle-tooltips: Toggle chart tooltips
 * - confirm-chart-fields: Validate fields before rendering
 * 
 * 🎨 DESIGN (5 tools):
 * - analyze-design: Vision AI design review
 * - analyze-iron-viz-style: Iron Viz competition scoring
 * - analyze-color-harmony: Color palette analysis
 * - generate-tableau-palette: Create Tableau color palettes
 * - suggest-annotations: Annotation recommendations
 * 
 * 🔧 INTERACTION (3 tools):
 * - apply-filter: Apply worksheet filters
 * - set-parameter: Set Tableau parameters
 * - get-dashboard-screenshot: Capture screenshots
 * 
 * 📄 DOCUMENTATION (2 tools):
 * - generate-documentation: Create dashboard docs
 * - parse-workbook-xml: Parse .twb files
 * 
 * 📦 WORKBOOK (4 tools):
 * - download-workbook: Download from Server/Cloud
 * - modify-workbook: Apply XML modifications
 * - publish-workbook: Publish back to Server/Cloud
 * - apply-design-recommendations: Apply design changes
 * 
 * 🛠️ UTILITY (3 tools):
 * - check-connection: Check extension connection
 * - clear-canvas: Clear extension canvas
 * - render-component: Render custom HTML
 * 
 * 🧠 ORCHESTRATION (1 tool):
 * - agentic-analyst: High-level workflow orchestrator
 */
```

---

## Verification Checklist

After completing all tasks:

- [ ] **Build Check:** Run `npm run build` from root - should complete without errors
- [ ] **Tool Count:** MCP server should expose exactly 32 tools
- [ ] **README Tools:** All tool names in README match actual implementation
- [ ] **File Structure:** README file tree matches actual project structure
- [ ] **No Orphan Code:** No viz-extension references remain in codebase
- [ ] **Documentation:** All 32 tools are documented in README

---

## Execution Order

Recommended order for implementation:

1. **TODO 1.1** - Remove viz-extension tools (prevents runtime errors)
2. **TODO 3.3** - Update header comment (while editing the same file)
3. **TODO 1.2-1.6** - Update README tool tables (can be done in one edit)
4. **TODO 2.1** - Update file structure
5. **TODO 2.2** - Add workflow documentation
6. **TODO 2.3** - Update architecture diagram
7. **TODO 3.2** - Add usage examples
8. **TODO 3.1** - Create TWB module (optional, lowest priority)

---

## Notes for Executing Model

1. **File Paths:** All paths are relative to `packages/` or use full relative paths from repository root
2. **Line Numbers:** Line numbers are approximate - use search to find exact locations
3. **Verification:** After each major change, run `npm run build` to verify no errors
4. **Markdown Formatting:** Preserve existing markdown styling and spacing in README
5. **Code Style:** Match existing TypeScript code style (2-space indentation, single quotes)
