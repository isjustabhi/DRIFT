import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CITY_ROTATION = [
  "Lisbon",
  "Tokyo",
  "Medellin",
  "Buenos Aires",
  "Reykjavik",
  "Tucson",
  "Nairobi",
];

const QUICK_CHIPS = ["Tokyo", "Lisbon", "NYC", "Medellin", "Berlin", "Cape Town"];

const CATEGORY_META = [
  { key: "cost", label: "Cost" },
  { key: "safety", label: "Safety" },
  { key: "weather", label: "Weather" },
  { key: "culture", label: "Culture" },
  { key: "food", label: "Food" },
  { key: "walkability", label: "Walkability" },
];

const REPORT_SYSTEM_PROMPT = `You are Drift, a brutally honest location analyst. You provide real data and vivid narratives about what daily life feels like in any city. Always respond ONLY with valid JSON, no markdown, no backticks. Use this exact structure:
{
  "name": "City Name",
  "country": "Country",
  "flag": "🇵🇹",
  "timezone": "Europe/Lisbon",
  "vibeScore": 78,
  "categories": {
    "cost": 72,
    "safety": 81,
    "weather": 85,
    "culture": 88,
    "food": 90,
    "walkability": 75
  },
  "dataCards": [
    { "label": "Avg Rent (1BR)", "value": "$950/mo", "icon": "🏠" },
    { "label": "Coffee Price", "value": "$1.20", "icon": "☕" },
    { "label": "Avg Temperature", "value": "63°F / 17°C", "icon": "🌡️" },
    { "label": "Safety Index", "value": "81/100", "icon": "🛡️" },
    { "label": "Internet Speed", "value": "95 Mbps", "icon": "📶" },
    { "label": "Population", "value": "545,000", "icon": "👥" }
  ],
  "narrative": "3-4 paragraphs about what life actually feels like. Be honest — mention downsides too. Talk about the pace of life, the people, the food scene, the cost reality, the weather patterns, the nightlife, the work culture. Write like a friend who lived there for 2 years.",
  "dayStory": "A vivid second-person narrative of a typical Tuesday. Start from waking up, include specific details like coffee prices, commute descriptions, lunch spots, afternoon activities, evening routine. Make it cinematic and immersive. 4-5 paragraphs."
}
Use current real-world data. Be specific with prices, distances, and details. Scores should reflect genuine quality of life metrics.`;

const COMPARE_SYSTEM_PROMPT = `You are Drift, a brutally honest location analyst. Compare two cities based on quality of life, cost reality, culture, logistics, and daily rhythm. Respond ONLY with valid JSON in this exact format:
{
  "verdict": "Write exactly 2 paragraphs. Be direct, specific, warm, and honest. Explain where each city wins, what kind of person fits each place, and the biggest tradeoffs."
}`;

function safeJsonParse(raw) {
  if (typeof raw !== "string") {
    throw new Error("The AI response was empty.");
  }

  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned);
}

function extractMessageContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function getTimeInTimezone(timezone) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return "Unavailable";
  }
}

function formatNarrative(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function vibeTone(score) {
  if (score > 70) {
    return {
      ring: "bg-emerald-500",
      text: "text-emerald-700",
      label: "Strong fit",
    };
  }

  if (score >= 50) {
    return {
      ring: "bg-amber-400",
      text: "text-amber-700",
      label: "Mixed bag",
    };
  }

  return {
    ring: "bg-rose-500",
    text: "text-red-300",
    label: "Proceed carefully",
  };
}

function normalizeCityReport(payload) {
  return {
    name: payload?.name || "Unknown",
    country: payload?.country || "Unknown",
    flag: payload?.flag || "🌍",
    timezone: payload?.timezone || "UTC",
    vibeScore: Number(payload?.vibeScore) || 0,
    categories: {
      cost: Number(payload?.categories?.cost) || 0,
      safety: Number(payload?.categories?.safety) || 0,
      weather: Number(payload?.categories?.weather) || 0,
      culture: Number(payload?.categories?.culture) || 0,
      food: Number(payload?.categories?.food) || 0,
      walkability: Number(payload?.categories?.walkability) || 0,
    },
    dataCards: Array.isArray(payload?.dataCards) ? payload.dataCards.slice(0, 6) : [],
    narrative: payload?.narrative || "",
    dayStory: payload?.dayStory || "",
  };
}

function CityRadar({ city, comparisonCity, overlay = false }) {
  const data = CATEGORY_META.map(({ key, label }) => ({
    subject: label,
    primary: city?.categories?.[key] || 0,
    secondary: comparisonCity?.categories?.[key] || 0,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#94A3B8", fontSize: 12, fontFamily: '"Source Sans 3", sans-serif' }}
          />
          <Radar
            name={city?.name || "City"}
            dataKey="primary"
            stroke="#818CF8"
            fill="rgba(129, 140, 248, 0.2)"
            fillOpacity={1}
            strokeWidth={2}
          />
          {overlay && comparisonCity ? (
            <Radar
              name={comparisonCity.name}
              dataKey="secondary"
              stroke="#34D399"
              fill="rgba(52, 211, 153, 0.15)"
              fillOpacity={1}
              strokeWidth={2}
            />
          ) : null}
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScoreBars({ firstCity, secondCity }) {
  const data = CATEGORY_META.map(({ key, label }) => ({
    category: label,
    [firstCity.name]: firstCity.categories[key] || 0,
    [secondCity.name]: secondCity.categories[key] || 0,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={18}>
          <XAxis
            dataKey="category"
            tick={{ fill: "#94A3B8", fontSize: 12, fontFamily: '"Source Sans 3", sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#94A3B8", fontSize: 12, fontFamily: '"Source Sans 3", sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip />
          <Bar dataKey={firstCity.name} fill="#818CF8" radius={[6, 6, 0, 0]} />
          <Bar dataKey={secondCity.name} fill="#34D399" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataCard({ card }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 text-2xl">{card.icon}</div>
      <div className="text-sm text-slate-400">{card.label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{card.value}</div>
    </div>
  );
}

function CompareColumn({ city }) {
  const tone = vibeTone(city.vibeScore);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-3xl text-white sm:text-4xl"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            {city.name} <span className="ml-1">{city.flag}</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">{city.country}</p>
        </div>
        <div className={`rounded-full px-4 py-2 text-sm font-semibold ${tone.text} bg-white/5`}>
          Vibe {city.vibeScore}
        </div>
      </div>

      <div className="mt-6">
        <CityRadar city={city} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {city.dataCards.map((card) => (
          <DataCard key={`${city.name}-${card.label}`} card={card} />
        ))}
      </div>
    </div>
  );
}

export default function DriftApp() {
  const [currentView, setCurrentView] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityData, setCityData] = useState(null);
  const [compareCity, setCompareCity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || "");
  const [compareQuery, setCompareQuery] = useState("");
  const [compareVerdict, setCompareVerdict] = useState("");
  const [showCompareInput, setShowCompareInput] = useState(false);
  const [isDayExpanded, setIsDayExpanded] = useState(false);
  const [overlayRadar, setOverlayRadar] = useState(true);
  const [rotatingCityIndex, setRotatingCityIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const [timeNow, setTimeNow] = useState("");

  useEffect(() => {
    const playfairId = "drift-font-playfair";
    const sourceSansId = "drift-font-source-sans";

    if (!document.getElementById(playfairId)) {
      const playfair = document.createElement("link");
      playfair.id = playfairId;
      playfair.rel = "stylesheet";
      playfair.href =
        "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap";
      document.head.appendChild(playfair);
    }

    if (!document.getElementById(sourceSansId)) {
      const sourceSans = document.createElement("link");
      sourceSans.id = sourceSansId;
      sourceSans.rel = "stylesheet";
      sourceSans.href =
        "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap";
      document.head.appendChild(sourceSans);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextVisible(false);
      setTimeout(() => {
        setRotatingCityIndex((current) => (current + 1) % CITY_ROTATION.length);
        setTextVisible(true);
      }, 220);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cityData?.timezone) return undefined;

    const updateTime = () => {
      setTimeNow(getTimeInTimezone(cityData.timezone));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [cityData?.timezone]);

  const primaryNarrative = useMemo(() => formatNarrative(cityData?.narrative), [cityData?.narrative]);
  const dayNarrative = useMemo(() => formatNarrative(cityData?.dayStory), [cityData?.dayStory]);

  async function fetchChatCompletion(messages) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        tools: [{ type: "web_search_preview" }],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "The AI request failed.");
    }

    return response.json();
  }

  async function fetchCityReport(cityName) {
    const data = await fetchChatCompletion([
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate a complete life report for: ${cityName}`,
      },
    ]);

    return normalizeCityReport(safeJsonParse(extractMessageContent(data)));
  }

  async function fetchComparisonVerdict(firstCity, secondCity) {
    const data = await fetchChatCompletion([
      { role: "system", content: COMPARE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Compare these two city reports and tell me which person each city is best for.

City 1:
${JSON.stringify(firstCity, null, 2)}

City 2:
${JSON.stringify(secondCity, null, 2)}`,
      },
    ]);

    const parsed = safeJsonParse(extractMessageContent(data));
    return parsed?.verdict || "";
  }

  async function handleCitySearch(cityName) {
    const trimmed = cityName.trim();
    if (!trimmed) {
      setError("Enter a city to generate a report.");
      return;
    }

    if (!apiKey.trim()) {
      setError("OpenAI API key not found. Set VITE_OPENAI_API_KEY in your environment variables.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setShowCompareInput(false);
    setCompareCity(null);
    setCompareVerdict("");
    setIsDayExpanded(false);

    try {
      const report = await fetchCityReport(trimmed);
      setCityData(report);
      setCurrentView("report");
    } catch (err) {
      setError(err.message || "Something went wrong while generating the report.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompareSearch() {
    if (!cityData) return;

    const trimmed = compareQuery.trim();
    if (!trimmed) {
      setError("Enter a city to compare.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const secondCity = await fetchCityReport(trimmed);
      const verdict = await fetchComparisonVerdict(cityData, secondCity);
      setCompareCity(secondCity);
      setCompareVerdict(verdict);
      setCurrentView("compare");
    } catch (err) {
      setError(err.message || "Something went wrong while generating the comparison.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetToSearch() {
    setCurrentView("search");
    setSearchQuery("");
    setCompareQuery("");
    setCompareCity(null);
    setCompareVerdict("");
    setShowCompareInput(false);
    setError(null);
    setIsDayExpanded(false);
  }

  const rotatingCity = CITY_ROTATION[rotatingCityIndex];
  const vibe = cityData ? vibeTone(cityData.vibeScore) : null;

  return (
    <div
      className="min-h-screen bg-[#08090E] px-4 py-8 text-[#E2E8F0] sm:px-6 lg:px-8"
      style={{ fontFamily: '"Source Sans 3", sans-serif' }}
    >
      <style>{`
        @keyframes gridPulse { 0%,100%{opacity:0.03} 50%{opacity:0.07} }
        @keyframes glowOrb { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.15} 50%{transform:translate(-50%,-50%) scale(1.3);opacity:0.25} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.15} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px); background-size: 60px 60px; animation: gridPulse 4s ease-in-out infinite; }
        .glow-orb { position:absolute; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.1) 30%, transparent 70%); animation: glowOrb 6s ease-in-out infinite; pointer-events:none; }
        .shimmer-btn { background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 30%, #A78BFA 50%, #8B5CF6 70%, #6366F1 100%); background-size: 200% 100%; animation: shimmer 3s linear infinite; }
      `}</style>
      <div className="mx-auto max-w-6xl">
        {isLoading ? (
          <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/40 px-5 py-4 text-[#E2E8F0] shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
            <span className="inline-block animate-spin text-2xl">🌍</span>
            <span className="text-sm font-semibold tracking-[0.12em] text-indigo-300 uppercase">
              Scanning global data streams...
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
            {error}
          </div>
        ) : null}

        {currentView === "search" ? (
          <section className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center text-center overflow-hidden">
            <div className="grid-bg absolute inset-0 pointer-events-none" />
            <div className="glow-orb" style={{ top: '40%', left: '50%' }} />

            <div className="relative w-full max-w-3xl z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/40 px-4 py-1.5 text-xs font-semibold tracking-[0.15em] text-indigo-300 uppercase backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI-Powered Location Intelligence
              </div>

              <h1
                className="text-5xl leading-tight sm:text-7xl bg-gradient-to-b from-white via-indigo-100 to-indigo-300/60 bg-clip-text text-transparent"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                Where are you<br />curious about?
              </h1>

              <div className="mt-5 h-10 overflow-hidden text-xl sm:text-2xl">
                <span
                  className={`inline-block bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-semibold transition-all duration-200 ease-in-out ${textVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                >
                  {rotatingCity}
                </span>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleCitySearch(searchQuery);
                  }}
                  placeholder="Search any city..."
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-5 text-lg text-white shadow-lg shadow-indigo-500/5 outline-none backdrop-blur-xl transition-all duration-200 ease-in-out placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => handleCitySearch(searchQuery)}
                  className="shimmer-btn rounded-full px-8 py-5 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 ease-in-out hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
                >
                  Explore
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSearchQuery(chip);
                      handleCitySearch(chip);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-all duration-200 ease-in-out hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-white"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <p className="mt-12 text-xs text-slate-600">
                Data-Rich Immersive Field Tracker · Powered by GPT-4o
              </p>
            </div>
          </section>
        ) : null}

        {currentView === "report" && cityData ? (
          <section className="pb-16">
            <button
              type="button"
              onClick={resetToSearch}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white"
            >
              <span>←</span>
              <span>Back</span>
            </button>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-400">
                    Life Report
                  </p>
                  <h1
                    className="mt-3 text-5xl leading-tight sm:text-6xl bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent"
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    {cityData.name} <span className="bg-none text-white">{cityData.flag}</span>
                  </h1>
                  <p className="mt-4 text-lg text-slate-400">
                    {cityData.country} · {cityData.timezone} · Local time {timeNow}
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-400">
                    Vibe Score
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className={`h-5 w-5 rounded-full ${vibe?.ring} shadow-lg`} />
                    <div className="text-4xl font-semibold text-white">{cityData.vibeScore}</div>
                    <div className={`text-sm font-semibold ${vibe?.text}`}>{vibe?.label}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
                <h2
                  className="text-3xl text-white"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  Vibe Score
                </h2>
                <p className="mt-2 text-slate-400">
                  A quick read on the city’s daily balance of friction, pleasure, and livability.
                </p>
                <div className="mt-6">
                  <CityRadar city={cityData} />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
                <h2
                  className="text-3xl text-white"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  Quick Stats
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {cityData.dataCards.map((card) => (
                    <DataCard key={card.label} card={card} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
              <h2
                className="text-3xl text-white"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                What Life Feels Like
              </h2>
              <div className="mt-6">
                {primaryNarrative.map((paragraph, index) => (
                  <p key={`narrative-${index}`} className="mb-5 text-lg leading-8 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
              <button
                type="button"
                onClick={() => setIsDayExpanded((current) => !current)}
                className="flex w-full items-center justify-between gap-4 text-left transition-all duration-200 ease-in-out hover:text-indigo-400"
              >
                <div>
                  <h2
                    className="text-3xl text-white"
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    A Typical Tuesday in {cityData.name}
                  </h2>
                  <p className="mt-2 text-slate-400">Open the immersive version of everyday life.</p>
                </div>
                <span className="text-2xl text-slate-400">{isDayExpanded ? "−" : "+"}</span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${isDayExpanded ? "mt-6 max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                  }`}
              >
                <div className="rounded-[24px] bg-indigo-950/30 p-6">
                  {dayNarrative.map((paragraph, index) => (
                    <p
                      key={`day-story-${index}`}
                      className="mb-5 text-[1.05rem] leading-8 text-slate-300 last:mb-0"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    className="text-3xl text-white"
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    Compare with another city
                  </h2>
                  <p className="mt-2 text-slate-400">
                    Pull a second report and see how the tradeoffs stack up.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompareInput((current) => !current)}
                  className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-indigo-700"
                >
                  Compare with another city
                </button>
              </div>

              {showCompareInput ? (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={compareQuery}
                    onChange={(event) => setCompareQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleCompareSearch();
                    }}
                    placeholder="Search a second city..."
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-4 outline-none transition-all duration-200 ease-in-out placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleCompareSearch}
                    className="rounded-full border border-[#1C1917] px-6 py-4 font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/10"
                  >
                    Build comparison
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {currentView === "compare" && cityData && compareCity ? (
          <section className="pb-16">
            <button
              type="button"
              onClick={() => setCurrentView("report")}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/10"
            >
              <span>←</span>
              <span>Back to {cityData.name}</span>
            </button>

            <div className="grid gap-6 lg:grid-cols-2">
              <CompareColumn city={cityData} />
              <CompareColumn city={compareCity} />
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    className="text-3xl text-white"
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    Side-by-side tradeoffs
                  </h2>
                  <p className="mt-2 text-slate-400">
                    Use the overlays for shape, or bars for easier category-by-category reading.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlayRadar((current) => !current)}
                  className="rounded-full border border-[#1C1917] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/10"
                >
                  {overlayRadar ? "Show bar comparison" : "Show overlaid radar"}
                </button>
              </div>

              <div className="mt-6">
                {overlayRadar ? (
                  <div className="rounded-[24px] bg-white/5 p-4 sm:p-6">
                    <CityRadar city={cityData} comparisonCity={compareCity} overlay />
                  </div>
                ) : (
                  <div className="rounded-[24px] bg-white/5 p-4 sm:p-6">
                    <ScoreBars firstCity={cityData} secondCity={compareCity} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
              <h2
                className="text-3xl text-white"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                Drift's verdict
              </h2>
              <div className="mt-6">
                {formatNarrative(compareVerdict).map((paragraph, index) => (
                  <p key={`verdict-${index}`} className="mb-5 text-lg leading-8 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
