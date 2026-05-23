import { Routes, Route } from 'react-router-dom'
import ProfileSelect from './screens/ProfileSelect'

export default function App() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <Routes>
        <Route path="/" element={<ProfileSelect />} />
        <Route path="/map" element={<div className="p-8 text-center text-yellow-400">World Map — Coming Soon</div>} />
        <Route path="/battle" element={<div className="p-8 text-center text-yellow-400">Battle — Coming Soon</div>} />
        <Route path="/pokedex" element={<div className="p-8 text-center text-yellow-400">Pokédex — Coming Soon</div>} />
        <Route path="/team" element={<div className="p-8 text-center text-yellow-400">Team — Coming Soon</div>} />
        <Route path="/admin" element={<div className="p-8 text-center text-yellow-400">Admin — Coming Soon</div>} />
      </Routes>
    </div>
  )
}
