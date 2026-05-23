import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <Routes>
        <Route path="/" element={<div className="p-8 text-center text-yellow-400 text-2xl font-bold">My Pokemon — Loading...</div>} />
      </Routes>
    </div>
  )
}
