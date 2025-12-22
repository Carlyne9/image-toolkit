import { useState, useEffect } from 'react'
import { Eraser, Droplets, RefreshCw, Sparkles, Sun, Moon } from 'lucide-react'
import BackgroundRemover from './components/BackgroundRemover'
import WatermarkRemover from './components/WatermarkRemover'
import FormatConverter from './components/FormatConverter'

// =====================================================
// MAIN APP COMPONENT
// This is the "brain" of your app - it controls which 
// tool is shown and renders the overall layout
// =====================================================

function App() {
  // This tracks which tab is currently active
  // 'background' | 'watermark' | 'converter'
  const [activeTab, setActiveTab] = useState('background')
  
  // Theme state - default to light mode
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then default to 'light'
    return localStorage.getItem('theme') || 'light'
  })

  // Apply theme to HTML element and save to localStorage
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  // Configuration for each tool tab
  const tabs = [
    { 
      id: 'background', 
      label: 'Background Remover', 
      icon: Eraser,
      description: 'Remove backgrounds from images instantly'
    },
    { 
      id: 'watermark', 
      label: 'Watermark Remover', 
      icon: Droplets,
      description: 'Clean up watermarks and unwanted elements'
    },
    { 
      id: 'converter', 
      label: 'Format Converter', 
      icon: RefreshCw,
      description: 'Convert images between formats'
    },
  ]

  // Find the current tab's info for the description
  const currentTab = tabs.find(tab => tab.id === activeTab)

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* ===== HEADER ===== */}
      <header className="border-b border-green-100 dark:border-zinc-800/50 bg-white dark:bg-transparent">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Logo / Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-zinc-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Image Toolkit</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">Free online image tools</p>
              </div>
            </div>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-green-50 dark:bg-zinc-800/50 hover:bg-green-100 dark:hover:bg-zinc-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              )}
            </button>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab flex items-center gap-2 ${
                    activeTab === tab.id ? 'active' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Tool Description */}
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            {currentTab?.label}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            {currentTab?.description}
          </p>
        </div>

        {/* Tool Component - renders based on active tab */}
        <div className="animate-slide-up">
          {activeTab === 'background' && <BackgroundRemover />}
          {activeTab === 'watermark' && <WatermarkRemover />}
          {activeTab === 'converter' && <FormatConverter />}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-green-100 dark:border-zinc-800/50 mt-20 bg-white dark:bg-transparent">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-zinc-600 dark:text-zinc-500 text-sm">
          Built with ❤️ using React
        </div>
      </footer>
    </div>
  )
}

export default App
