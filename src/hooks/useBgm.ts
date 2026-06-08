import { useCallback } from 'react'
import { getAudioCtx } from '../utils/audioContext'

export type BgmTrack = 'overworld' | 'battle' | 'victory'

// [frequency_hz, beats]  — 0 Hz = rest
type Note = [number, number]

const BGM: Record<BgmTrack, { notes: Note[]; bpm: number; loop: boolean }> = {
  overworld: {
    bpm: 120,
    loop: true,
    notes: [
      [523, 1], [392, 1], [440, 0.5], [523, 0.5], [329, 1],
      [392, 1], [261, 1], [329, 0.5], [392, 0.5], [523, 2],
      [440, 1], [523, 0.5], [392, 0.5], [329, 1], [261, 2],
    ],
  },
  battle: {
    bpm: 168,
    loop: true,
    notes: [
      [220, 0.5], [329, 0.5], [220, 0.5], [392, 0.5],
      [0,   0.25], [329, 0.25], [261, 0.5], [220, 1],
      [329, 0.5], [440, 0.5], [392, 0.5], [0, 0.25], [329, 0.75],
      [220, 0.5], [261, 0.5], [329, 1], [220, 2],
    ],
  },
  victory: {
    bpm: 120,
    loop: false,
    notes: [
      [261, 0.5], [329, 0.5], [392, 0.5], [523, 1],
      [392, 0.5], [523, 1.5],
    ],
  },
}

function scheduleNotes(
  ctx: AudioContext,
  masterGain: GainNode,
  notes: Note[],
  bpm: number,
  startAt: number,
): number {
  const beat = 60 / bpm
  let t = startAt
  for (const [freq, beats] of notes) {
    const dur = beats * beat
    if (freq > 0) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(masterGain)
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.35, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.88)
      osc.start(t)
      osc.stop(t + dur)
    }
    t += dur
  }
  return t // time when track ends
}

// Module-level singleton state
let masterGain: GainNode | null = null
let loopTimer: ReturnType<typeof setTimeout> | null = null
let crossfadeTimer: ReturnType<typeof setTimeout> | null = null
let activeTrack: BgmTrack | null = null

function stopLoop() {
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null }
  activeTrack = null
}

function startTrack(track: BgmTrack) {
  stopLoop()
  const ctx = getAudioCtx()
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)
  }
  masterGain.gain.cancelScheduledValues(ctx.currentTime)
  masterGain.gain.setValueAtTime(0.18, ctx.currentTime)

  const def = BGM[track]
  activeTrack = track

  function scheduleLoop(startAt: number) {
    const endAt = scheduleNotes(ctx, masterGain!, def.notes, def.bpm, startAt)
    if (def.loop && activeTrack === track) {
      // Re-schedule ~100ms before end so there is no gap
      const msUntilReschedule = Math.max(0, (endAt - ctx.currentTime - 0.2) * 1000)
      loopTimer = setTimeout(() => {
        if (activeTrack === track) scheduleLoop(endAt)
      }, msUntilReschedule)
    }
  }

  scheduleLoop(ctx.currentTime + 0.05)
}

function crossfadeTo(track: BgmTrack | null) {
  if (track === activeTrack) return
  const ctx = getAudioCtx()
  if (masterGain) {
    // Fade out over 0.5s
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
  }
  stopLoop()
  if (crossfadeTimer) { clearTimeout(crossfadeTimer); crossfadeTimer = null }
  if (track) {
    crossfadeTimer = setTimeout(() => { crossfadeTimer = null; startTrack(track) }, 500)
  }
}

export function useBgm() {
  const playBgm = useCallback((track: BgmTrack) => {
    try { crossfadeTo(track) } catch {}
  }, [])

  const stopBgm = useCallback(() => {
    try { crossfadeTo(null) } catch {}
  }, [])

  return { playBgm, stopBgm }
}
