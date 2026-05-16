const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

export const DEFAULT_SPEAKING_RATE = 1.15
export const MIN_SPEAKING_RATE = 0.6
export const MAX_SPEAKING_RATE = 2.0
export const SPEAKING_RATE_STEP = 0.15

/**
 * Sends text to Google Cloud TTS and plays the returned MP3 audio.
 */
export async function speakText(text, apiKey, speakingRate = DEFAULT_SPEAKING_RATE) {
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

  const raw = atob(audioContent)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  const blob = new Blob([bytes], { type: 'audio/mp3' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play().catch(console.error)
  audio.onended = () => URL.revokeObjectURL(url)
  return audio
}
