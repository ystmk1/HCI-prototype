const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// Discrete speed levels. Default (normal) sits a touch slower than before and
// the steps between levels are intentionally small (~0.10) so a speed-change
// request nudges the pace rather than jumping dramatically.
export const SPEED_LEVELS = {
  slow: 0.95,
  normal: 1.05,
  fast: 1.15,
  very_fast: 1.25,
}
export const DEFAULT_SPEED_LEVEL = 'normal'
export const DEFAULT_SPEAKING_RATE = SPEED_LEVELS[DEFAULT_SPEED_LEVEL]
export const MIN_SPEAKING_RATE = 0.6
export const MAX_SPEAKING_RATE = 2.0

// ── Single-playback guard ────────────────────────────────────
// Only the most recent utterance is allowed to play. A new speakText() call
// stops whatever is currently playing and invalidates any earlier in-flight
// request (whose fetch may still resolve later), so voices never overlap.
let currentAudio = null
let currentUrl = null
let playSeq = 0

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

/**
 * Sends text to Google Cloud TTS and plays the returned MP3 audio.
 * Stops any previous/in-flight utterance so playback never overlaps.
 */
export async function speakText(text, apiKey, speakingRate = DEFAULT_SPEAKING_RATE) {
  // Claim this call as the latest and silence anything already playing.
  const seq = ++playSeq
  stopSpeaking()

  const rate = Math.min(MAX_SPEAKING_RATE, Math.max(MIN_SPEAKING_RATE, speakingRate))
  const res = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'ko-KR',
        name: 'ko-KR-Wavenet-A',
        ssmlGender: 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: rate,
        pitch: 0,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`TTS ${res.status}: ${body.error?.message ?? 'unknown'}`)
  }

  const { audioContent } = await res.json()
  if (!audioContent) return

  // A newer call started while this fetch was in flight → discard this one.
  if (seq !== playSeq) return

  const raw = atob(audioContent)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  const blob = new Blob([bytes], { type: 'audio/mp3' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  currentUrl = url
  audio.play().catch(console.error)
  audio.onended = () => {
    if (currentAudio === audio) {
      URL.revokeObjectURL(url)
      currentAudio = null
      currentUrl = null
    }
  }
  return audio
}
