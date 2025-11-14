# 🚀 NextGen Dashboard Builder
## From Inspiration to Insights in Minutes

[![Tableau Hackathon 2025](https://img.shields.io/badge/Tableau%20Hackathon-2025-blue)](https://tableau2025.devpost.com/)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org/)
[![Tableau MCP](https://img.shields.io/badge/Tableau-MCP%20Server-orange)](https://github.com/tableau/tableau-mcp)

> **The TurboTax of Dashboard Creation** - A revolutionary AI-powered platform that transforms dashboard creation through guided experiences, design inspiration, and intelligent automation.

## 🎯 The Problem

Dashboard creation is complex, time-consuming, and intimidating:
- ❌ Technical barriers prevent business users from creating analytics
- ❌ Starting with a blank canvas is overwhelming  
- ❌ Weeks of development for simple dashboards
- ❌ No learning from existing successful designs

## ✨ Our Solution

A **TurboTax-style guided experience** that:
- ✅ **Visual Wizard Interface** - No chatbot confusion, clear step-by-step guidance
- ✅ **Design Inspiration** - Browse and learn from Tableau Public's best dashboards
- ✅ **AI Computer Vision** - Analyze layouts and generate similar designs automatically
- ✅ **Smart Data Generation** - Create realistic, contextual synthetic data
- ✅ **One-Click Publishing** - From idea to live embedded dashboard in minutes

## 🏗️ Architecture

```
User Describes Challenge → AI Finds Inspiration → Computer Vision Analysis 
→ Intelligent Data Generation → Tableau Publishing → Live Embedded Dashboard
```

### Key Technologies
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **AI**: OpenAI GPT-4 + GPT-4V for computer vision
- **Tableau Integration**: Official MCP Server + REST API + Embedding API v3
- **Data**: Hyper API for synthetic data generation

## 🎬 Demo

**5-Minute User Journey:**
1. **Select Challenge** (30s): Click "Track Performance" → "Marketing"
2. **Find Inspiration** (60s): Browse gallery, select compelling campaign dashboard
3. **AI Analysis** (45s): Computer vision extracts layout, charts, colors
4. **Generate Data** (90s): AI creates realistic campaign metrics
5. **Live Dashboard** (75s): Professional embedded analytics ready to use

## 🏆 Hackathon Goals

**Target**: $17,000 Grand Prize for Most Innovative Solution

**Judging Criteria Alignment:**
- **Innovation (40%)**: Revolutionary UX + Computer Vision + Official MCP Integration
- **Technical Execution (30%)**: Multiple Tableau APIs + Full-Stack AI Application  
- **Real-World Impact (20%)**: Democratizes analytics for non-technical users
- **User Experience (10%)**: TurboTax-style professional interface

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Tableau Cloud account
- OpenAI API key

### Installation
```bash
# Clone repository
git clone [your-repo-url]
cd nextgen-dashboard-builder

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys

# Run development server
npm run dev
```

### Environment Variables
```env
OPENAI_API_KEY=your_openai_key
TABLEAU_SERVER=your_tableau_cloud_url  
TABLEAU_SITE=your_site_name
TABLEAU_PAT_NAME=your_pat_name
TABLEAU_PAT_VALUE=your_pat_value
```

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── wizard/           # TurboTax-style step components
│   │   ├── gallery/          # Dashboard inspiration browser
│   │   └── embedding/        # Tableau dashboard embedding
│   ├── services/
│   │   ├── openai/           # GPT-4 + computer vision
│   │   ├── tableau/          # MCP + REST API clients
│   │   └── data/             # Synthetic data generation
│   └── pages/
│       ├── api/              # Next.js API routes
│       └── wizard/           # Step-by-step wizard pages
├── docs/                     # Documentation and specs
└── public/                   # Static assets
```

## 🎯 Development Roadmap

### Week 1-2: Foundation (Nov 13-26)
- [x] Repository setup and project structure
- [ ] TurboTax-style wizard UI components
- [ ] Basic OpenAI GPT-4 integration
- [ ] Tableau Cloud connection testing

### Week 3-4: AI & Vision (Nov 27 - Dec 10)
- [ ] Tableau Public gallery integration
- [ ] GPT-4V computer vision for dashboard analysis
- [ ] Design template generation system
- [ ] Interactive inspiration browser

### Week 5-6: Intelligence (Dec 11-24)
- [ ] Official Tableau MCP server integration
- [ ] Advanced synthetic data generation
- [ ] Hyper API publishing pipeline
- [ ] Content discovery and learning

### Week 7-8: Polish (Dec 25 - Jan 12)
- [ ] End-to-end workflow optimization
- [ ] Professional UI/UX polish
- [ ] Demo video production
- [ ] Hackathon submission preparation

## 🤝 Contributing

This is a hackathon project with tight deadlines. Focus areas:
- UI/UX improvements for the wizard experience
- Tableau API integrations and optimizations
- AI prompt engineering for better results
- Documentation and demo materials

## 📄 License

MIT License - Built for Tableau Hackathon 2025

## 🏆 Hackathon Submission

- **Devpost**: [Project URL]
- **Demo Video**: [YouTube URL]
- **Live Demo**: [Vercel URL]

---

*"Transforming dashboard creation from weeks to minutes through AI-powered guided experiences."*

**Built with ❤️ for Tableau Hackathon 2025**