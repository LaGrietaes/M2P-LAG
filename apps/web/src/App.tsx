import { Routes, Route } from 'react-router-dom'
import Landing from './routes/Landing'
import Legal from './routes/Legal'
import { I18nProvider } from './lib/i18n/I18nContext'
import { LanguageNoticeToast } from './components/LanguageNoticeToast'

function App() {
  return (
    <I18nProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/legal/:slug" element={<Legal />} />
      </Routes>
      <LanguageNoticeToast />
    </I18nProvider>
  )
}

export default App
