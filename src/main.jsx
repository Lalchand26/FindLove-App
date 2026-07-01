import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './hooks/useAuth.jsx' // YE ADD KARO
import { Toaster } from 'react-hot-toast' // Agar use kar rahe ho

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider> {/* YE WRAPPER ADD KARO */}
        <App />
        <Toaster position="top-center" /> {/* Optional */}
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>
)