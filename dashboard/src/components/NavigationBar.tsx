import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface NavigationBarProps {
  onFilterChange: (filters: FilterState) => void;
  onLanguageChange: (lang: string) => void;
  currentLanguage: string;
}

interface FilterState {
  category: string;
  timeRange: string;
  sentiment: string;
  redFlags: boolean;
  objections: boolean;
  handling: boolean;
}

export default function NavigationBar({ onFilterChange, onLanguageChange, currentLanguage }: NavigationBarProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    timeRange: "today",
    sentiment: "all",
    redFlags: false,
    objections: false,
    handling: false
  });

  const categories = [
    { id: "all", name: "All Interactions", icon: "📊" },
    { id: "price", name: "Price Issues", icon: "💰" },
    { id: "stock", name: "Stock/Inventory", icon: "📦" },
    { id: "quality", name: "Quality Issues", icon: "⭐" },
    { id: "delivery", name: "Delivery", icon: "🚚" },
    { id: "support", name: "Support", icon: "🆘" },
    { id: "process", name: "Process", icon: "⚙️" },
    { id: "knowledge", name: "Knowledge", icon: "🧠" }
  ];

  const timeRanges = [
    { id: "today", name: "Today" },
    { id: "week", name: "This Week" },
    { id: "month", name: "This Month" },
    { id: "all", name: "All Time" }
  ];

  const sentimentOptions = [
    { id: "all", name: "All Sentiments" },
    { id: "positive", name: "Positive", color: "text-green-500" },
    { id: "neutral", name: "Neutral", color: "text-gray-500" },
    { id: "negative", name: "Negative", color: "text-red-500" }
  ];

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h2 className="text-lg font-semibold">🔍 Filters & Navigation</h2>
        
        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">🌐 Language:</span>
          <select 
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="auto">Auto-detect</option>
          </select>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">📂 Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleFilterChange("category", category.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filters.category === category.id
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">⏰ Time Range</h3>
        <div className="flex gap-2">
          {timeRanges.map(range => (
            <button
              key={range.id}
              onClick={() => handleFilterChange("timeRange", range.id)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filters.timeRange === range.id
                  ? "bg-accent text-black"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {range.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment Filter */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">😊 Sentiment</h3>
        <div className="flex gap-2">
          {sentimentOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleFilterChange("sentiment", option.id)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filters.sentiment === option.id
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      {/* Special Filters */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">🚨 Special Filters</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.redFlags}
              onChange={(e) => handleFilterChange("redFlags", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">🔴 Red Flags Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.objections}
              onChange={(e) => handleFilterChange("objections", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">⚠️ Objections Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.handling}
              onChange={(e) => handleFilterChange("handling", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">✅ Good Handling Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
