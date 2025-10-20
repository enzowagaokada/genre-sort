import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Playlists from './Playlists.jsx'
import Sort from './Sort.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/sort" element={<Sort />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
