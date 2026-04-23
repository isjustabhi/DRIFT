# 🌍 Drift — AI-Powered Location Intelligence

### What Life Actually Feels Like — Anywhere on Earth

---

## Overview

**Drift** is an AI-powered location intelligence tool that generates immersive "life reports" for any city on Earth. Search any location and get real data (rent, safety, weather, walkability) alongside vivid AI narratives about what daily life actually feels like. Because Google shows you tourist traps — Drift shows you real life.

Built for the **Codex Creator Challenge** by OpenAI.

---

## Features

- **City Search** — type any city name and get an instant AI-generated life report
- **Vibe Score** — a 1–100 livability score with radar chart breakdown across 6 categories (Cost, Safety, Weather, Culture, Food, Walkability)
- **Quick Stats Dashboard** — real data cards showing average rent, coffee price, temperature, safety index, internet speed, and population
- **"What Life Feels Like"** — honest, multi-paragraph AI narrative written like a friend who lived there for 2 years
- **"A Typical Tuesday"** — cinematic second-person narrative of a full day living in the city
- **Compare Mode** — side-by-side comparison of two cities with overlaid radar charts, bar charts, and an AI-generated verdict
- **Simulation-free** — uses GPT-4o with web search for real, current data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS 3 |
| Charts | Recharts |
| AI Engine | OpenAI GPT-4o with web search |
| Build Tool | Vite 5 |
| Deployment | Static SPA |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/drift.git
cd drift

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser. You'll be prompted to enter your OpenAI API key (stored in React state only — never saved to disk or storage).

---

## Project Structure

```
drift/
├── index.html            # Entry HTML with Google Fonts
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite build configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS plugins
└── src/
    ├── main.jsx          # React mount point
    ├── index.css         # Tailwind directives
    └── App.jsx           # Full application (single-file)
```

---

## How It Works

1. User searches a city name
2. App sends a structured prompt to GPT-4o with web search enabled
3. GPT-4o returns JSON with real-world data, scores, narratives, and a day-in-the-life story
4. UI renders radar chart, data cards, and narrative sections
5. Compare mode runs the same flow for a second city and generates an AI verdict

---

## API Key

Drift requires an OpenAI API key with GPT-4o access. The key is entered in the app UI and stored in React state only — it is never persisted to localStorage, cookies, or any external service.

---

## Disclaimer

Drift is a demonstration project built for the Codex Creator Challenge. Data is AI-generated based on web search results and may not be perfectly accurate. Always verify critical information (cost of living, safety, etc.) through official sources before making relocation decisions.

---

## Author

**Abhiram Varma Nandimandalam** — M.S. Data Science, University of Arizona
Personal Website:https://abhiramvarma.vercel.app/

---

## License

Apache-2.0 license
