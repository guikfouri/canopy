import type { NotificationSound } from '@shared/types'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  // Resume suspended context (Chromium autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

const sounds: Record<NotificationSound, (volume: number) => void> = {
  ding: (volume) => {
    playTone(880, 0.3, volume * 0.4, 'sine')
  },

  chime: (volume) => {
    playTone(659, 0.2, volume * 0.3, 'sine')
    setTimeout(() => playTone(880, 0.3, volume * 0.3, 'sine'), 120)
  },

  bell: (volume) => {
    playTone(1200, 0.15, volume * 0.2, 'triangle')
    playTone(2400, 0.1, volume * 0.1, 'triangle')
  },

  pop: (volume) => {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)
  },
}

export function playNotificationSound(soundType: NotificationSound, volume: number): void {
  sounds[soundType](volume)
}
