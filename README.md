# 🌍 Global-E Travel Planner

An AI-powered multi-agent travel planning application that crafts personalized itineraries through a collaborative pipeline of specialized AI agents.

**[Live Demo →](https://global-e-travel-planner.lovable.app)**

---

## ✨ Features

### 🤖 Multi-Agent AI Pipeline
Four specialized AI agents work sequentially to build comprehensive travel plans:

1. **Research Agent** — Gathers destination information, cultural insights, and travel logistics
2. **Planning Agent** — Structures the trip into a day-by-day itinerary based on research
3. **Detail Agent** — Enriches the plan with specific recommendations, times, and practical tips
4. **Review Agent** — Polishes the final itinerary for quality, consistency, and completeness

### 🗣️ Voice Input
- Speak your trip request using the built-in microphone button (Web Speech API)
- Real-time transcription with interim results displayed live
- Language toggle supporting **English** (en-US) and **Hebrew** (he-IL)
- Works entirely client-side — no external STT services required

### 🗺️ Interactive Maps
- Day-by-day interactive maps powered by **Leaflet** and **React Leaflet**
- AI-powered location extraction and geocoding via edge function
- Visual markers for each activity within a day

### 💰 Budget Estimates
- Styled budget breakdown card with formatted tables (GFM markdown)
- Highlighted totals and per-category cost breakdowns
- Supports multiple currencies

### 📱 Responsive Design
- Fully responsive layout optimized for desktop and mobile
- Animated transitions using **Framer Motion**

### ⚠️ Error Handling
- Friendly UI messages for AI credit exhaustion (402 errors)
- Rate limit detection with retry guidance
- Graceful fallbacks — no blank screens on failure

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Styling** | Tailwind CSS 3, shadcn/ui components |
| **State** | React Query, React hooks |
| **Maps** | Leaflet, React Leaflet |
| **Markdown** | react-markdown, remark-gfm |
| **Animations** | Framer Motion |
| **Backend** | Lovable Cloud (Edge Functions) |
| **AI** | Multi-model AI gateway (Gemini, GPT) |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── TripInput.tsx          # Main input with voice support
│   ├── AgentProgress.tsx      # Pipeline stage progress indicator
│   ├── ItineraryDisplay.tsx   # Itinerary renderer with Budget card
│   ├── DayMap.tsx             # Per-day map component
│   ├── LeafletMapRenderer.tsx # Map rendering utilities
│   └── NavLink.tsx            # Navigation link component
├── hooks/
│   ├── use-speech-recognition.ts  # Web Speech API hook
│   └── use-mobile.tsx             # Responsive breakpoint hook
├── lib/
│   ├── agents.ts              # Multi-agent pipeline orchestration
│   ├── geocoding.ts           # AI-powered location extraction & geocoding
│   └── utils.ts               # Shared utilities
├── pages/
│   ├── Index.tsx              # Main application page
│   └── NotFound.tsx           # 404 page
└── integrations/
    └── supabase/              # Auto-generated client & types

supabase/functions/
├── travel-research/           # Research agent edge function
├── travel-plan/               # Planning agent edge function
├── travel-detail/             # Detail agent edge function
├── travel-review/             # Review agent edge function
└── ai-locations/              # AI-powered location extraction & geocoding
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Bun](https://bun.sh/) (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd global-e-travel-planner

# Install dependencies
bun install

# Start the development server
bun run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

The following environment variables are configured automatically via Lovable Cloud and stored in the `.env` file (auto-generated, do not edit manually):

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Backend API endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

> **Note:** When running via Lovable, the `.env` file is managed automatically. No manual configuration is needed.

---

## 🧪 Testing

The project includes a test infrastructure setup (Vitest + Testing Library + Playwright) but does not yet have meaningful test coverage. Tests are planned for future development.

```bash
# Run unit tests
bun run test

# Run end-to-end tests
bunx playwright test
```

---

## 📄 Usage

1. **Describe your trip** — Type or speak your travel request (e.g., *"10 days in Japan in May. I love food and hiking."*)
2. **Watch the agents work** — A progress indicator shows each AI agent's stage
3. **Explore your itinerary** — Browse the day-by-day plan with maps, budget estimates, and travel tips
4. **Refine** — Edit the text and regenerate, or start fresh

---

## 🌐 Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Core App | ✅ | ✅ | ✅ | ✅ |
| Voice Input | ✅ | ✅ | ❌ | ⚠️ Partial |
| Maps | ✅ | ✅ | ✅ | ✅ |

> Voice input uses the Web Speech API, which has limited support outside Chromium-based browsers.

---

## 📝 License

This project is private. All rights reserved.

---

Built with [Lovable](https://lovable.dev) ❤️
