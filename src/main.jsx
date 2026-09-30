import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '@fontsource/alegreya-sans/400.css'
import '@fontsource/alegreya-sans/500.css'
import '@fontsource/alegreya-sans/700.css'
import './styles/base.css'
import Landing from './pages/Landing.jsx'
import Demo from './pages/Demo.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
