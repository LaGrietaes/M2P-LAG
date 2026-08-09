import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/chivo/400.css'
import '@fontsource/chivo/700.css'
import '@fontsource/chivo/800.css'
import '@fontsource/chivo/900.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'
import App from './App.tsx'

// Set theme before first paint to avoid flash (spec §3).
// Dark is always the first-visit default. Browsers can't distinguish
// "OS has no color-scheme preference" from "OS explicitly prefers
// light" via matchMedia (both report prefers-color-scheme:light as
// matching — light is the CSS-spec initial value), so OS auto-detection
// is not used for the initial default at all: it would silently treat
// "no preference" as "wants light," which is the opposite of what's
// wanted here. Once a user picks a theme via the toggle, that choice
// is remembered (localStorage) and always wins from then on.
const storedTheme = localStorage.getItem('m2p-theme')
const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark'
document.documentElement.setAttribute('data-theme', theme)

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)