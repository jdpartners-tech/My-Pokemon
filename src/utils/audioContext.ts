let _ctx: AudioContext | null = null

export function getAudioCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}
