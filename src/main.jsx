import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './frontend/styles/theme.css'
import App from './frontend/App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
