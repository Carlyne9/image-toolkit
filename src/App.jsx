import { useState, useEffect } from "react";
import { Eraser, Droplets, RefreshCw, Sun, Moon } from "lucide-react";
import BackgroundRemover from "./components/BackgroundRemover";
import WatermarkRemover from "./components/WatermarkRemover";
import FormatConverter from "./components/FormatConverter";

// =====================================================
// MAIN APP COMPONENT
// This is the "brain" of your app - it controls which
// tool is shown and renders the overall layout
// =====================================================

function App() {
  // This tracks which tab is currently active
  // 'background' | 'watermark' | 'converter'
  const [activeTab, setActiveTab] = useState(() => {
    // Check localStorage first, then default to 'background'
    const saved = localStorage.getItem("activeTab");
    return ["background", "watermark", "converter"].includes(saved)
      ? saved
      : "background";
  });

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Theme state - default to light mode
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then default to 'light'
    return localStorage.getItem("theme") || "light";
  });

  // Apply theme to HTML element and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  // Configuration for each tool tab
  const tabs = [
    {
      id: "background",
      label: "Background Remover",
      shortLabel: "Background",
      icon: Eraser,
    },
    {
      id: "watermark",
      label: "Watermark Remover",
      shortLabel: "Watermark",
      icon: Droplets,
    },
    {
      id: "converter",
      label: "Format Converter",
      shortLabel: "Convert",
      icon: RefreshCw,
    },
  ];

  // Find the current tab's info for the description
  const currentTab = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* ===== HEADER ===== */}
      <header className="border-b border-accent-100 dark:border-accent-900/30 bg-white dark:bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Logo / Title */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <img 
                src={theme === 'dark' ? '/darkmode.svg' : '/litemode.svg'} 
                alt="Image Toolkit Logo" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Image Toolkit
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">
                  Free online image tools
                </p>
              </div>
            </div>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/40 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              )}
            </button>
          </div>

          {/* Mobile Page Title */}
          <h2 className="sm:hidden text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {currentTab?.label}
          </h2>

          {/* Tab Navigation - Desktop only */}
          <nav className="hidden sm:flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab flex items-center gap-2 ${
                    activeTab === tab.id ? "active" : ""
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-accent-100 dark:border-accent-900/30 z-50">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  isActive
                    ? "text-accent-600 dark:text-accent-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-xs font-medium">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
        {/* Tool Component - renders based on active tab */}
        <div>
          {activeTab === "background" && <BackgroundRemover />}
          {activeTab === "watermark" && <WatermarkRemover />}
          {activeTab === "converter" && <FormatConverter />}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="mt-12 pb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-zinc-400 dark:text-zinc-600 text-xs">
          Image Toolkit (c) 2025{" "}
          <span
            style={{ fontWeight: "bold", color: "#1698CB", cursor: "pointer" }}
            onClick={() => window.open("https://x.com/carlyne177", "_blank")}
          >
            Carlyne
          </span>
          . All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
