# My Pokemon — Educational RPG Game Design Spec

**Date:** 2026-05-23  
**Status:** Approved  
**Live URL:** www.jdpartners.co/games/my-pokemon/

---

## 1. Overview

A browser-based educational Pokemon RPG for two children:
- **Kaylie** — age 8+, Primary 2, advanced difficulty
- **Kayden** — age 4+, Kindergarten Y2, beginner difficulty

Kids play a Pokemon Ruby-inspired RPG (explore world map, battle, catch, level up, evolve) where every attack in battle requires answering a multiple-choice question in English, Maths, or Chinese. Correct = move fires at full power. Wrong = move misses.

The game runs at `www.jdpartners.co/games/my-pokemon/` (deployed via existing GitHub Pages workflow in the `jd-partners-website` repo).

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model handles complex game UI cleanly |
| Styling | Tailwind CSS | Mobile-first, responsive — works on web, iPad, iPhone |
| Build | Vite | Fast dev server, clean static output for GitHub Pages |
| Database | Firebase Firestore | Real-time cloud save, syncs across all devices |
| Auth | Firebase Auth (anonymous) | No email needed for kids; PIN maps to profile |
| Hosting | GitHub Pages via `jd-partners-website` repo | Reuses existing deploy workflow |
| Pokemon data | `database-master` YAML → JSON at build time | Pokemon names, moves, type chart, abilities |
| Pokemon images | PokeAPI CDN (no API calls, URL-only) | Free, comprehensive, official artwork + sprites |

---

## 3. Sprite Style

- **Overworld map:** Gen 3 Ruby/Sapphire pixel sprites (small, authentic)  
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/ruby-sapphire/{id}.png`
- **Battle screen:** Official HD artwork (large, vibrant, high impact)  
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- **Player's Pokemon in battle:** Back-facing official artwork (mirrored)
- **Pokédex & team screen:** Gen 3 pixel sprites

---

## 4. Game Screens

### ① Profile Select
- Shows a card per profile (name, age, starter Pokemon image, difficulty badge)
- Tap card → PIN entry (4-digit) → load game
- "+ Add New Trainer" button — creates new profile via form
- "Parent Settings" link (password protected) at bottom

### ② World Map
- Top-down 2D tile grid (Ruby-style)
- Tiles: open path, tall grass, tree/wall, water, building
- Player character navigated via arrow keys (desktop) or D-pad buttons (mobile/tablet)
- Enter tall grass → random wild encounter based on route's encounter table
- NPC trainers on routes trigger battles on eye contact
- Buildings: Pokémon Center (full party heal), Poké Mart (buy Pokéballs/potions)
- 5 routes, 3 gyms, 1 starting town

### ③ Battle Screen (Core)
- Layout mirrors Pokemon Ruby: opponent top-right (HD artwork), player bottom-left (HD artwork, mirrored)
- HP bars animate smoothly, change colour: green → yellow (50%) → red (25%)
- Player selects a move from 4 options → MC question popup appears
- **Question popup:** Subject tag + question text + 4 tappable answer buttons
- Correct answer: move executes, damage calculated with type effectiveness
- Wrong answer: "It missed!" — opponent's turn proceeds
- After player turn: opponent attacks automatically
- Battle end: Win → EXP gained; Lose → return to Pokémon Center, party healed
- Wild battle only: "Bag" opens to throw Pokéball (no question required for catching)

### ④ Pokédex
- Grid of all Pokemon (Gen 1 first, then all generations)
- Caught: lit sprite + name + dex number
- Seen but not caught: silhouette + "???"
- Not encountered: dark silhouette only
- Tap a caught Pokemon → stats, moves, evolution chain

### ⑤ My Team
- Up to 6 active Pokemon with HP bars, level, and move list
- Drag to reorder party
- Tap a Pokemon → summary (stats, held item, moves with PP)
- "Send to Box" to swap with PC storage

### ⑥ Parent Admin Panel
- Protected by parent password (set on first launch)
- **Manage Profiles:** add, edit, delete child profiles; set name, age, PIN, difficulty, starter Pokemon
- **Question Bank:** 
  - Tab by subject (English / Maths / Chinese)
  - Filter by difficulty (Beginner / Advanced)
  - Filter by question type
  - Add question form: type, difficulty, question text, 4 options, correct answer
  - Edit / delete existing questions
- **Progress View:** see each child's badges, Pokemon caught count, questions answered (correct %)

---

## 5. Core RPG Mechanics (Pokemon Ruby Reference)

### Battle System
- Turn-based 1v1
- Player always goes first
- 4 moves per Pokemon, each with type, power, accuracy, PP
- Type effectiveness from `type-chart.yaml`: super effective (2×), not very effective (0.5×), no effect (0×)
- Status conditions: burn (halves attack), paralysis (may skip turn), sleep (skips turn), poison (loses HP each turn)
- Flee: available in wild battles only; not available in trainer/gym battles

### Catching
- Throw Pokéball at wild Pokemon
- Catch chance increases as opponent HP decreases
- Status conditions (sleep/paralysis) improve catch rate
- Pokéball shakes 3 times → caught, or breaks free
- Cannot catch trainer-owned Pokemon

### Leveling & Evolution
- EXP earned per battle based on opponent's level
- Level up increases all base stats
- Moves learned at specific levels (seeded from database)
- Evolution at level thresholds (e.g. Charmander → Charmeleon Lv.16 → Charizard Lv.36)
- Evolution animation + fanfare on level-up trigger

### Progression
- 3 Gyms with increasing difficulty
- Gym badges improve max Pokemon level cap
- Gym leader battles: questions are harder, no flee allowed
- 6 Pokemon in active party; unlimited in PC Box storage

### Pokemon Generations
- All generations available in the full game
- Game starts with Gen 1 (151 Pokemon) — kids encounter familiar faces first
- Later routes introduce Gen 2, 3, etc.

---

## 6. Education System

### Profile-Level Subject Toggle
Each profile independently enables/disables subjects and question types:

```
Subjects:
  ☑ English  ☑ Maths  ☑ Chinese   (at least 1 required)

English types:    Maths types:         Chinese types:
☑ Vocabulary     ☑ Arithmetic         ☑ Character recognition
☑ Grammar        ☑ Word problems      ☑ Vocabulary
☑ Spelling       ☑ Sequences          ☑ Stroke order
☑ Synonyms       ☑ Shapes/geometry    ☑ Radicals (部首)
☑ Fill-in-blank  ☑ Time               ☑ Pinyin
☑ Comprehension  ☑ Money              ☑ Grammar
☑ Word-picture   ☑ Logic              ☑ Idioms (成語)
                                       ☑ Fill-in-blank
```

### Difficulty Breakdown

| | Daughter (8+, Advanced) | Son (4+, Beginner) |
|---|---|---|
| English | Word definitions, grammar rules, synonyms, short comprehension | Word-to-picture, 3-letter words, simple fill-in-blank |
| Maths | Multiplication, division, 2-digit arithmetic, word problems, fractions | Addition/subtraction within 20, counting, shapes |
| Chinese | 成語, complex characters, stroke order, radicals, grammar | Basic characters (人大小山水火), pinyin matching |

### Question Format
- All questions are 4-option multiple choice — tap to select
- No typing required (accessible for age 4+)
- Questions drawn randomly from enabled subjects/types during battle
- Questions rotate — same question won't repeat within a single battle

### Parent-Managed Question Bank
- Questions stored in Firebase Firestore
- Parent adds/edits/deletes questions via Admin Panel
- Each question tagged with: subject, type, difficulty
- Questions auto-assigned to correct profiles based on difficulty tag

---

## 7. Data Layer

### Firebase Firestore Structure

```
profiles/{profileId}
  name, age, pin (hashed), difficulty
  subjects: { english: { enabled, types[] }, maths: {...}, chinese: {...} }
  party:    [ { pokemonId, nickname, level, xp, currentHp, moves[], heldItem } ]
  box:      [ { pokemonId, nickname, level, xp } ]
  pokedex:  { "1": "caught" | "seen" | "unseen", ... }
  badges:   string[]
  money:    number
  stats:    { battlesWon, questionsAnswered, questionsCorrect }

questionBank/{subject}/{questionId}
  type, difficulty, question, options[4], answer, hint?

gameData/pokemon/{id}
  name, types[], baseStats{hp,atk,def,spAtk,spDef,spd}
  evolvesAtLevel, evolvesTo, moves[{level, moveId}]

gameData/moves/{id}
  name, type, category, power, accuracy, pp

gameData/routes/{id}
  name, wildPokemon[{pokemonId, minLevel, maxLevel, rate}]

gameData/typeChart
  { fire: { superEffective[], notVeryEffective[], noEffect[] }, ... }
```

### Firebase Auth
- Anonymous auth — device gets a Firebase UID automatically
- PIN entry maps UID + PIN to a `profileId` in Firestore
- Parent admin password stored hashed in a `settings` Firestore doc

---

## 8. Platforms & Responsive Design

- **Desktop web:** Keyboard arrow keys for movement, mouse/keyboard for menus
- **iPad / iPhone:** On-screen D-pad for movement, tap for all interactions
- Tailwind responsive breakpoints: mobile-first, optimised for 375px (iPhone SE) up to 1440px (desktop)
- Touch targets minimum 44×44px (Apple HIG) for all buttons

---

## 9. Hosting & Deployment

1. Develop in `C:\Users\derek\Documents\Project\My Pokemon`
2. `npm run build` → outputs static files to `dist/`
3. Copy `dist/` to `C:\Users\derek\Documents\Project\jd-partners-website\games\my-pokemon\`
4. Commit + push `jd-partners-website` → GitHub Actions auto-deploys to `www.jdpartners.co`
5. Live at: `www.jdpartners.co/games/my-pokemon/`

React Router uses hash-based routing (`/#/battle`) to work correctly on GitHub Pages static hosting.

---

## 10. Out of Scope (v1)

- Multiplayer / sibling vs sibling battles
- Pokemon trading
- Sound / music (can be added in v2)
- Animations beyond HP bar transitions and evolution sequence
- Mega evolutions, Z-moves, Gigantamax
