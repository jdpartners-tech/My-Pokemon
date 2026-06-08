import { useCallback } from 'react'
import { getAudioCtx } from '../utils/audioContext'

export type SoundName =
  | 'hit' | 'playerHit' | 'correct' | 'wrong'
  | 'levelUp' | 'catch' | 'encounter' | 'evolve' | 'heal'

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  endFreq: number,
  duration: number,
  gainVal: number,
  startOffset = 0,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.connect(g)
  g.connect(ctx.destination)
  osc.type = type
  const t = ctx.currentTime + startOffset
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration)
  g.gain.setValueAtTime(gainVal, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.01)
}

const SOUNDS: Record<SoundName, (ctx: AudioContext) => void> = {
  hit: (ctx) => tone(ctx, 'square', 220, 110, 0.15, 0.3),

  playerHit: (ctx) => tone(ctx, 'sawtooth', 150, 80, 0.2, 0.25),

  correct: (ctx) => {
    tone(ctx, 'sine', 440, 440, 0.12, 0.4)
    tone(ctx, 'sine', 660, 660, 0.2, 0.4, 0.13)
  },

  wrong: (ctx) => tone(ctx, 'square', 180, 150, 0.3, 0.2),

  levelUp: (ctx) => {
    tone(ctx, 'sine', 523, 523, 0.12, 0.4)
    tone(ctx, 'sine', 659, 659, 0.12, 0.4, 0.14)
    tone(ctx, 'sine', 784, 784, 0.28, 0.5, 0.28)
  },

  catch: (ctx) => {
    // 3× rattle, then ping
    for (let i = 0; i < 3; i++) {
      tone(ctx, 'triangle', 200, 150, 0.12, 0.25, i * 0.2)
      tone(ctx, 'triangle', 150, 200, 0.06, 0.15, i * 0.2 + 0.13)
    }
    tone(ctx, 'sine', 880, 880, 0.35, 0.5, 0.7)
  },

  encounter: (ctx) => tone(ctx, 'sawtooth', 330, 440, 0.22, 0.4),

  evolve: (ctx) => {
    const t0 = ctx.currentTime
    const freqs = [261, 329, 392]
    freqs.forEach(f => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = f
      g.gain.setValueAtTime(0.001, t0)
      g.gain.linearRampToValueAtTime(0.15, t0 + 1.5)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.5)
      osc.start(t0)
      osc.stop(t0 + 2.6)
    })
  },

  heal: (ctx) => {
    const freqs = [523, 784, 1047]
    freqs.forEach((f, i) => tone(ctx, 'sine', f, f, 0.22, 0.3, i * 0.19))
  },
}

export function useGameAudio() {
  const playSound = useCallback((name: SoundName) => {
    try { SOUNDS[name](getAudioCtx()) } catch {}
  }, [])
  return { playSound }
}
