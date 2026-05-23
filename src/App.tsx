import { Routes, Route } from 'react-router-dom'
import ProfileSelect from './screens/ProfileSelect'
import Battle from './screens/Battle'
import WorldMap from './screens/WorldMap'
import Pokedex from './screens/Pokedex'
import Team from './screens/Team'
import Admin from './screens/Admin'

export default function App() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <Routes>
        <Route path="/" element={<ProfileSelect />} />
        <Route path="/map" element={<WorldMap />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/pokedex" element={<Pokedex />} />
        <Route path="/team" element={<Team />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  )
}
