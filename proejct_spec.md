PROJECT SPEC – NextGen Dashboard Builder: From Inspiration to Insights
1. Overview

Project Goal:
Build a revolutionary web app (hosted on GitHub) that transforms dashboard creation through natural language conversation and AI-powered design inspiration. The app provides a TurboTax-like guided experience where users describe their business challenges, get inspired by curated Tableau Public dashboards, and watch as AI generates realistic data and creates professional dashboards in minutes.

This app demonstrates:
- Conversational analytics design using LLM
- Computer vision analysis of dashboard layouts
- Tableau Public integration for design inspiration
- Agentic synthetic data generation
- End-to-end Tableau Cloud automation
- Seamless dashboard embedding

Vision: "The TurboTax of Dashboard Creation" - democratizing advanced analytics through natural language and AI assistance.

2. Enhanced User Story

Persona: Business users, analysts, PMs, and anyone who needs insights but lacks technical dashboard skills.

Revolutionary Flow:

1. **Discovery Phase**: User describes their business challenge in natural language
   - "I want to track customer support efficiency"
   - "Help me understand sales performance across regions"

2. **Inspiration Phase**: AI searches Tableau Public and presents curated dashboard examples
   - User browses gallery of relevant, high-quality dashboards
   - Selects inspiring design: "I like this layout and these chart types"

3. **Design Analysis**: Computer vision (GPT-4V) analyzes the selected dashboard
   - Extracts layout structure, chart types, color schemes
   - Identifies key metrics and visual hierarchy
   - Generates design template specifications

4. **Requirements Gathering**: Guided conversation collects specific needs
   - 3-5 key business questions to answer
   - Data availability (existing or mock generation needed)
   - Stakeholder requirements and preferences

5. **Intelligent Generation**: AI orchestrates the creation process
   - Generates contextual, realistic synthetic data
   - Creates Hyper file matching the design requirements
   - Publishes to Tableau Cloud with proper structure

6. **Live Dashboard**: Embedded result with continued AI assistance
   - Interactive dashboard appears in the app
   - AI agent provides insights and guides exploration
   - Users can refine and iterate on the design

3. Enhanced Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                             │
│  React/Next.js App (GitHub Pages/Vercel)                    │
│  • TurboTax-Style Guided Wizard (NO chatbot!)              │
│  • Progress Indicator & Step Navigation                     │
│  • Interactive Gallery Browser                              │
│  • Live Design Preview & Refinement                         │
│  • <tableau-viz> Embedded Dashboard                         │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               AI ORCHESTRATION LAYER                        │
│  Python FastAPI / Node Express Backend                      │
│  • OpenAI GPT-4 (conversation understanding)                │
│  • GPT-4V (dashboard design analysis)                       │
│  • Business problem → data schema translation               │
│  • Design template generation                               │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            INSPIRATION & ANALYSIS LAYER                     │
│  Tableau Public Integration + Computer Vision               │
│  • Search API / Web Scraping                                │
│  • Curated Dashboard Gallery                                │
│  • GPT-4V Design Pattern Recognition                        │
│  • Layout/Chart/Color Analysis                              │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA GENERATION ENGINE                         │
│  Intelligent Synthetic Data Creation                        │
│  • Contextual, domain-aware data generation                 │
│  • Schema optimization for dashboard design                 │
│  • Tableau Hyper API integration                            │
│  • Realistic pattern simulation                             │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             TABLEAU MCP SERVER                              │
│  Official Model Context Protocol Bridge                     │
│  • 14+ Conversational Tools                                 │
│  • VizQL Data Service (intelligent queries)                 │
│  • Content Exploration & Discovery                          │
│  • Real-time data access & insights                         │
│  • AI ↔ Tableau Cloud integration                           │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                TABLEAU CLOUD                                │
│  Enterprise Analytics Platform                              │
│  • REST API (publishing & automation)                       │
│  • Embedding API v3 (seamless integration)                  │
│  • Metadata API (semantic modeling)                         │
│  • Live dashboard serving                                   │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. **User Input** → Conversational UI captures business requirements
2. **AI Analysis** → GPT-4 processes needs, GPT-4V analyzes inspiration dashboards  
3. **Content Discovery** → MCP server explores existing Tableau content
4. **Data Generation** → Creates realistic synthetic data matching requirements
5. **Dashboard Creation** → Publishes to Tableau Cloud with design templates
6. **Live Embedding** → User interacts with professional dashboard
7. **Ongoing Intelligence** → AI provides insights via MCP integration

4. Key Technologies & APIs
4.1 Tableau Hyper API

Used to:

Create a .hyper file programmatically.

Insert synthetic rows into the table.

Generate a publishable extract.

4.2 Tableau REST API (Automate)

Used to:

Authenticate to Tableau Cloud (PAT / Connected Apps).

Publish .hyper as a data source.

Duplicate template workbook.

Point workbook to the new data source.

4.3 Tableau Embedding API v3

Used on the frontend to:

Display <tableau-viz> with the newly created dashboard.

(Optional) Use <tableau-viz-authoring> for in-app editing.

4.4 Tableau Metadata API (Optional)

To annotate fields with roles & descriptions to demonstrate semantic modeling.

4.5 Tableau MCP Server

Bridges the LLM and Tableau:

Enables conversational actions (“publish dataset”, “query view data”).

Gives the agent Tableau-native capabilities.

5. Guided Experience Framework

5.1 The "TurboTax" Question Flow

**Phase 1: Context Discovery**
- "What business challenge are you trying to solve?"
- "Who will be using this dashboard (executives, analysts, front-line staff)?"
- "How urgent is this need? (prototype, production-ready, ongoing monitoring)"

**Phase 2: Inspiration & Design**
- "Let's find some dashboard designs that inspire you"
- Present curated gallery from Tableau Public based on domain
- "Which of these layouts and styles appeals to you?"
- AI analyzes selected design using computer vision

**Phase 3: Question Framework**
- "What are the 3-5 key questions you want this dashboard to answer?"
- "Are you looking to track performance, identify trends, or compare segments?"
- "Do you need real-time data or periodic reporting?"

**Phase 4: Data Strategy**
- "Do you have existing data sources, or should I create realistic examples?"
- "What time period should we simulate (last 6 months, year-over-year)?"
- "How many records would make this feel realistic?"

**Phase 5: Capability Wishlist**
- "Should users be able to drill down into details?"
- "Do you need alerts or notifications for key thresholds?"
- "Any specific visual preferences or branding requirements?"

5.2 TurboTax-Style Interface Design (NO Traditional Chatbot!)

**Key Interface Principles:**
- **Guided Wizard Flow**: Clear steps with progress indicators
- **Smart Form Interactions**: Intelligent input fields, not chat bubbles
- **Visual Decision Making**: Click to select options, not typing responses
- **Contextual Guidance**: Helpful tips and explanations inline
- **Progressive Disclosure**: Show relevant options based on previous selections

**UI Components:**

```jsx
// Step-by-step wizard instead of chat interface
<WizardContainer>
  <ProgressBar currentStep={2} totalSteps={5} />
  
  <StepCard title="Tell us about your challenge">
    <SelectableOptions>
      <OptionCard icon="📊" title="Track Performance" 
                  description="Monitor KPIs and metrics over time" />
      <OptionCard icon="🔍" title="Analyze Trends" 
                  description="Identify patterns and insights" />
      <OptionCard icon="⚖️" title="Compare Segments" 
                  description="Compare different groups or categories" />
    </SelectableOptions>
  </StepCard>
  
  <NavigationButtons>
    <BackButton />
    <NextButton disabled={!hasSelection} />
  </NavigationButtons>
</WizardContainer>
```

**Visual Flow Example:**
```
Step 1: [Business Challenge Selection] → Visual cards to click
Step 2: [Industry/Domain] → Dropdown with smart suggestions  
Step 3: [Gallery Browse] → Visual thumbnail selection
Step 4: [Key Questions] → Interactive form with +/- buttons
Step 5: [Data Preferences] → Toggles and sliders
Step 6: [Review & Generate] → Summary preview with edit options
```

5.3 AI-Powered Design Analysis

When user selects inspiring dashboard:
```python
def analyze_dashboard_design(image_url):
    prompt = """
    Analyze this Tableau dashboard and extract:
    1. Layout structure (grid, sections, hierarchy)
    2. Chart types and their purposes
    3. Color palette and visual themes
    4. Key metrics and KPI placement
    5. Filter and interaction patterns
    
    Return structured JSON for recreation.
    """
    return gpt4v_analysis(image_url, prompt)
```

6. Tableau MCP Integration - The Game Changer

6.1 Official Tableau MCP Server Capabilities

The Tableau MCP server provides 14+ powerful tools that enable conversational AI interactions with Tableau Cloud/Server:

**Content Discovery & Management:**
- `list-datasources`: Discover available data sources
- `list-workbooks`: Browse workbook catalog  
- `list-views`: Find specific dashboard views
- `search-content`: Intelligent content search across Tableau

**Data Querying & Analysis:**
- `query-datasource`: Execute VizQL queries using natural language
- `get-view-data`: Extract data from existing dashboards
- `get-datasource-metadata`: Understand data structure and semantics

**Visual & Insight Generation:**
- `get-view-image`: Capture dashboard screenshots for analysis
- `get-workbook`: Retrieve workbook details and structure

**Advanced Analytics (Pulse API):**
- `list-pulse-metrics`: Access Tableau Pulse metrics
- `generate-pulse-metric-value-insight-bundle`: AI-powered insights

6.2 MCP Integration in Our Architecture

```typescript
// Example: AI agent using MCP to analyze existing dashboards
const mcpClient = new TableauMCPClient({
  server: process.env.TABLEAU_SERVER,
  site: process.env.TABLEAU_SITE,
  token: process.env.TABLEAU_PAT
});

// User: "Show me sales dashboards similar to my inspiration"
const workbooks = await mcpClient.searchContent({
  query: "sales dashboard",
  contentType: "workbook"
});

// AI analyzes structure and suggests improvements
const viewData = await mcpClient.getViewData({
  workbookId: inspirationWorkbook.id,
  viewId: "overview"
});
```

6.3 Revolutionary User Experience with MCP

**Enhanced Conversation Flow:**
1. **Discovery**: "What sales dashboards already exist in Tableau?"
2. **Analysis**: AI uses MCP to query existing content and data patterns
3. **Learning**: "This workbook has great KPI structure - let's use similar layout"
4. **Generation**: Creates new dashboard incorporating proven patterns
5. **Iteration**: "The data shows seasonality - should we add trend analysis?"

**Real-time Intelligence:**
- AI agent can query live Tableau data during conversation
- Provides context-aware suggestions based on actual data patterns
- Learns from existing successful dashboards in the organization

7. Enhanced Dataset Model
Example Base Schema (for Helpdesk Analytics)
Field Name	Type	Role	Notes
ticket_id	string	dimension	unique ID
created_at	datetime	dimension	ticket open
closed_at	datetime	dimension	ticket close
region	string	dimension	region of employee
channel	string	dimension	email/phone/portal
issue_type	string	dimension	category of issue
severity	string	dimension	low/med/high/critical
sla_breached	boolean	measure	derived from days_to_close
days_to_close	float	measure	closing time
csat_score	integer	measure	1–5 satisfaction

You can change the domain (Safety, HR, Ops, Sales) while using the same structure.

6. MCP Tool Definitions (JSON Contracts)
Tool 1: propose_mock_schema

Used when the agent interprets user requirements.

Input

{
  "domain": "helpdesk",
  "row_count": 5000,
  "time_range_months": 6,
  "dimensions": ["region", "channel", "issue_type", "severity"],
  "measures": ["days_to_close", "csat_score", "sla_breached"]
}


Output

{
  "table_name": "mock_helpdesk_tickets",
  "row_count": 5000,
  "fields": [
    {"name": "ticket_id", "type": "string", "role": "dimension"},
    {"name": "created_at", "type": "datetime", "role": "dimension"},
    {"name": "closed_at", "type": "datetime", "role": "dimension"},
    {"name": "region", "type": "string", "role": "dimension"},
    {"name": "channel", "type": "string", "role": "dimension"},
    {"name": "issue_type", "type": "string", "role": "dimension"},
    {"name": "severity", "type": "string", "role": "dimension"},
    {"name": "sla_breached", "type": "boolean", "role": "measure"},
    {"name": "days_to_close", "type": "float", "role": "measure"},
    {"name": "csat_score", "type": "integer", "role": "measure"}
  ]
}

Tool 2: create_mock_dataset_and_dashboard

Input

{
  "site_id": "<tableau_site_id>",
  "project_id": "<target_project_id>",
  "schema": {
    "table_name": "mock_helpdesk_tickets",
    "row_count": 5000,
    "fields": [ ... ]
  },
  "template_workbook_id": "<template_workbook>"
}


Output

{
  "datasource_id": "<generated_datasource_id>",
  "workbook_id": "<generated_workbook_id>",
  "view_url": "https://prod-useast-a.online.tableau.com/t/site/views/MockHR/Overview"
}

Tool 3: summarize_view_data

(Used for agentic insights.)

Input

{
  "view_url": "https://...",
  "focus_metric": "sla_breached",
  "group_by": ["region", "issue_type"]
}


Output

{
  "top_groups_by_sla_breach": [
    {"region": "North America", "issue_type": "Benefits", "breach_rate": 0.32}
  ],
  "overall_breach_rate": 0.18
}

7. Frontend Embedding (Tableau v3)
<script src="https://prod-useast-a.online.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js"></script>

<tableau-viz
  id="mockDashboard"
  src="https://prod-useast-a.online.tableau.com/t/{siteName}/views/{workbookName}/{viewName}"
  toolbar="bottom"
  hide-tabs>
</tableau-viz>

8. Repository Structure
root/
  PROJECT_SPEC.md
  README.md
  /frontend
    src/
      App.tsx (Main React application)
      components/
        WizardContainer.tsx (TurboTax-style stepper UI)
        ProgressBar.tsx (Visual progress indicator)
        StepCard.tsx (Individual wizard steps)
        SelectableOptions.tsx (Visual option selection)
        DashboardGallery.tsx (Interactive thumbnail browser)
        DesignPreview.tsx (Live template preview)
        EmbeddedDashboard.tsx (Tableau embedding)
        SmartFormInputs.tsx (Intelligent form fields)
      services/
        aiService.ts (OpenAI integration)
        tableauService.ts (API client)
  /backend
    src/
      main.py (FastAPI server)
      ai_orchestrator.py (GPT-4 conversation management)
      tableau_public_service.py (Gallery & computer vision)
      synthetic_generator.py (Contextual data generation)
      tableau_cloud_client.py (REST API integration)
      hyper_service.py (Data file creation)
  /inspiration
    curated_dashboards.json (Pre-selected high-quality examples)
    design_templates/ (Generated design patterns)

## 9. Development Timeline (8 Weeks)

**Weeks 1-2: Foundation & Conversation Engine**
- React frontend with guided conversation flow
- OpenAI GPT-4 integration for natural language processing
- Basic question framework implementation
- UI/UX design for TurboTax-style experience

**Weeks 3-4: Tableau Public Integration & Computer Vision**
- Tableau Public search and gallery curation
- GPT-4V integration for dashboard design analysis
- Design template generation system
- Interactive inspiration browsing

**Weeks 5-6: Data Generation & Tableau Cloud**
- Contextual synthetic data generation
- Hyper API integration for data file creation
- Tableau REST API publishing pipeline
- Workbook generation from design templates

**Weeks 7-8: Integration & Polish**
- End-to-end workflow testing
- Tableau Embedding API v3 implementation
- Error handling and edge cases
- Demo video production and presentation materials

## 10. Success Metrics & Judging Alignment

**Innovation & Creativity (40%)**
- First-of-its-kind conversational dashboard design
- Computer vision analysis of dashboard layouts
- Natural language to analytics translation

**Technical Execution (30%)**
- Seamless integration of multiple Tableau APIs
- AI-powered design pattern recognition
- Robust synthetic data generation

**Real-World Impact (20%)**
- Democratizes dashboard creation for non-technical users
- Reduces time-to-insight from weeks to minutes
- Addresses genuine pain point in analytics workflow

**User Experience (10%)**
- Intuitive, guided conversation interface
- Beautiful gallery browsing experience
- Professional embedded dashboard presentation

## 11. Competitive Advantages

1. **Official Tableau Integration**: Uses Tableau's own MCP server for authentic AI capabilities
2. **Inspiration-Driven Design**: Leverages collective wisdom of Tableau Public community
3. **Conversational Analytics**: AI agent can query real Tableau data and provide insights
4. **Learning from Existing Content**: Analyzes successful dashboards in your organization
5. **Natural Language Interface**: No technical skills required
6. **End-to-End Automation**: From conversation to live dashboard
7. **Contextual Intelligence**: AI understands business domains and generates appropriate data
8. **Professional Quality**: Produces publication-ready dashboards, not prototypes
9. **Real-time Intelligence**: Live data querying during dashboard creation process

## 12. TurboTax-Style UX: The Game-Changing Interface

**Why TurboTax Interface vs Traditional Chatbot:**

❌ **Traditional Chatbot Problems:**
- Users don't know what to ask
- Intimidating blank chat box
- Conversational back-and-forth confusion
- No clear progress indication
- Hard to go back and change answers

✅ **TurboTax-Style Benefits:**
- Clear, guided step-by-step process
- Visual options to click (no typing required)
- Progress bar shows completion status
- Easy navigation back to previous steps
- Professional, trustworthy feeling

**Specific UI Examples:**

```
┌─────────────────────────────────────────────────────────┐
│  Step 2 of 5: What's Your Business Challenge?          │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 40%    │
│                                                         │
│  Select the option that best describes your need:      │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │📊 Track     │ │🔍 Analyze   │ │⚖️ Compare   │      │
│  │Performance  │ │Trends       │ │Segments     │      │
│  │             │ │             │ │             │      │
│  │Monitor KPIs │ │Find patterns│ │Compare groups│     │
│  │over time    │ │& insights   │ │or categories │     │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  [← Back]                              [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

**Demo Flow Comparison:**

**Traditional Chatbot Demo:**
> User types: "I need a dashboard"
> Bot: "What kind of dashboard do you need?"
> User: "Um... sales?"
> Bot: "What metrics do you want to track?"
> User: "I don't know... the usual ones?"
> *Confusion and frustration*

**TurboTax-Style Demo:**
> User clicks: "Track Performance" card
> App shows: Industry selection with visual icons
> User clicks: "E-commerce" 
> App shows: Gallery of e-commerce dashboards
> User clicks: Beautiful sales dashboard thumbnail
> App shows: "Great choice! This design tracks revenue, conversion, and customer metrics"
> *Clear progress and confidence*

## 13. Why Tableau MCP + TurboTax UI Makes This Unbeatable

**Judge Appeal Triple Threat:**
1. **Official Tableau Integration** (MCP server shows platform mastery)
2. **Revolutionary UX** (TurboTax interface eliminates user friction) 
3. **AI Innovation** (Computer vision + synthetic data generation)

**Demo Power:**
- **5 seconds**: User selects business challenge visually
- **30 seconds**: Browses and selects inspiring dashboard design  
- **2 minutes**: Reviews AI-generated data schema and design
- **3 minutes**: Live professional dashboard appears
- **5 minutes**: AI provides insights via MCP integration

**Real-world Impact:**
- Democratizes dashboard creation (no technical skills needed)
- Professional results that match organizational standards
- Eliminates the "blank canvas" problem completely
