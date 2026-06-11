import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './frontend/styles/theme.css'
import App from './frontend/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
