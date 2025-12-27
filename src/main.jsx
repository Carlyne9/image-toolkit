import React from 'react'
import ReactDOM from 'react-dom/client'
import posthog from 'posthog-js'
import App from './App.jsx'
import './index.css'

// Initialize PostHog analytics
posthog.init('phc_bRWzJpNrGcFv0BlRuxjASNVFbr0CfV7yAMgebajmUbj', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only' // only create profiles for identified users
})

// This is the entry point of your React app
// It mounts the App component to the HTML element with id="root"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
