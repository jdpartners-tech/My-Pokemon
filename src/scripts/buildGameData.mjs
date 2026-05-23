import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB = path.join(__dirname, '../../../../database-master/database-master/data')
const OUT = path.join(__dirname, '../data')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchPokeAPI(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PokeAPI error ${res.status}: ${url}`)
  return res.json()
}

// ── Build type chart ──────────────────────────────────────────────
const rawTypeChart = yaml.load(fs.readFileSync(path.join(DB, 'type-chart.yaml'), 'utf8'))
fs.writeFileSync(path.join(OUT, 'typeChart.json'), JSON.stringify(rawTypeChart, null, 2))
console.log('✓ typeChart.json')

// ── Build moves ───────────────────────────────────────────────────
const rawMoves = yaml.load(fs.readFileSync(path.join(DB, 'moves.yaml'), 'utf8'))
const moves = Object.entries(rawMoves)
  .filter(([, m]) => m.category && m.power && m.power > 0)
  .map(([id, m]) => ({
    id,
    name: m.name,
    type: m.type,
    category: m.category,
    power: m.power ?? 0,
    accuracy: m.accuracy ?? 100,
    pp: m.pp ?? 10,
  }))
fs.writeFileSync(path.join(OUT, 'moves.json'), JSON.stringify(moves, null, 2))
console.log(`✓ moves.json (${moves.length} moves)`)

// ── Build pokemon (Gen 1 only: ids 1–151) ─────────────────────────
const rawPokemon = yaml.load(fs.readFileSync(path.join(DB, 'pokemon.yaml'), 'utf8'))
const gen1 = Object.values(rawPokemon).filter(p => p.national <= 151)

const pokemon = []
for (const p of gen1) {
  const id = p.national
  console.log(`  Fetching #${id} ${p.name}...`)
  try {
    const [pokeData, speciesData] = await Promise.all([
      fetchPokeAPI(`https://pokeapi.co/api/v2/pokemon/${id}`),
      fetchPokeAPI(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
    ])

    const stats = {}
    for (const s of pokeData.stats) {
      const key = s.stat.name
        .replace('special-attack', 'spAtk')
        .replace('special-defense', 'spDef')
        .replace('speed', 'spd')
        .replace('attack', 'atk')
        .replace('defense', 'def')
      stats[key] = s.base_stat
    }

    // Level-up learnset (from any game version)
    const learnset = pokeData.moves
      .flatMap(m => m.version_group_details
        .filter(d => d.move_learn_method.name === 'level-up' && d.level_learned_at > 0)
        .map(d => ({ level: d.level_learned_at, moveId: m.move.name }))
      )
      .sort((a, b) => a.level - b.level)
      .filter((v, i, arr) => arr.findIndex(x => x.moveId === v.moveId) === i)

    // Evolution: level-up only
    let evolvesAtLevel = null
    let evolvesTo = null
    const chainUrl = speciesData.evolution_chain?.url
    if (chainUrl) {
      const chain = await fetchPokeAPI(chainUrl)
      const findEvolution = (node) => {
        if (node.species.name === p.name.toLowerCase()) {
          const next = node.evolves_to?.[0]
          if (next) {
            const levelDetail = next.evolution_details?.[0]
            if (levelDetail?.trigger?.name === 'level-up' && levelDetail.min_level) {
              evolvesAtLevel = levelDetail.min_level
              evolvesTo = gen1.find(x => x.name.toLowerCase() === next.species.name)?.national ?? null
            }
          }
        }
        for (const child of node.evolves_to ?? []) findEvolution(child)
      }
      findEvolution(chain.chain)
    }

    pokemon.push({
      id,
      name: p.name,
      types: pokeData.types.map(t => t.type.name),
      baseStats: {
        hp: stats.hp, atk: stats.atk, def: stats.def,
        spAtk: stats.spAtk, spDef: stats.spDef, spd: stats.spd,
      },
      catchRate: speciesData.capture_rate,
      baseExp: pokeData.base_experience ?? 64,
      evolvesAtLevel,
      evolvesTo,
      learnset: learnset.slice(0, 20),
      gen: p.gen ?? 1,
    })
  } catch (err) {
    console.error(`  ✗ Failed #${id}: ${err.message}`)
  }
  await sleep(120)
}

fs.writeFileSync(path.join(OUT, 'pokemon.json'), JSON.stringify(pokemon, null, 2))
console.log(`✓ pokemon.json (${pokemon.length} pokemon)`)
