import React from 'react'
import ReactDOM from 'react-dom/client'
// Google Sans (OFL), self-hosted: the CSP blocks font CDNs. One variable file per script; the browser fetches only Latin + Thai.
import '@fontsource-variable/google-sans/wght.css'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
