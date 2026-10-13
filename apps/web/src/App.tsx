import { Routes, Route } from 'react-router-dom'
import Landing from './routes/Landing'
import Legal from './routes/Legal'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/legal/:slug" element={<Legal />} />
    </Routes>
  )
}

export default App
