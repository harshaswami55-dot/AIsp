import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './motion.css'
import './brand.css'
import App from './App.jsx'
import { installTilt } from './tilt.js'

installTilt()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
