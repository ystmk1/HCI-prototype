const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SYSTEM_PROMPT = `당신은 차량용 AI 어시스턴트입니다. 운전자와 탑승객을 돕는 역할을 합니다.
- 답변은 2~3문장으로 간결하게 해주세요.
- 친근하고 자연스러운 한국어를 사용하세요.
- 네비게이션, 음악, 전화, 날씨, 일정 등 차량 관련 요청에 적극적으로 응답하세요.
- 운전 중 안전을 항상 최우선으로 고려하세요.`

/**
 * Sends text to Gemini and returns { text, audioBase64, audioMimeType }.
 * The model returns TEXT and AUDIO together; audio is base64-encoded PCM.
 */
export async function getGeminiResponse(text, apiKey) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini: ${err.error?.message ?? res.status}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []

  // Exclude "thought" parts (reasoning trace) — keep only visible text
  const textPart = parts.find((p) => p.text && !p.thought)?.text ?? ''
  const audioPart = parts.find((p) => p.inlineData?.mimeType?.startsWith('audio/'))

  return {
    text: textPart,
    audioBase64: audioPart?.inlineData?.data ?? null,
    audioMimeType: audioPart?.inlineData?.mimeType ?? 'audio/pcm',
  }
}

/**
 * Decodes base64 audio from Gemini and plays it through the browser.
 * Gemini native audio outputs raw PCM (L16, 24 kHz, mono) wrapped in audio/pcm.
 * We convert it to a WAV blob so the browser can play it natively.
 */
export function playAudioBase64(base64, mimeType) {
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  let blob
  if (mimeType === 'audio/pcm' || mimeType === 'audio/l16') {
    // Wrap raw PCM in a WAV container (24 kHz, mono, 16-bit)
    blob = new Blob([buildWav(bytes, 24000, 1, 16)], { type: 'audio/wav' })
  } else {
    blob = new Blob([bytes], { type: mimeType })
  }

  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play().catch(console.error)
  audio.onended = () => URL.revokeObjectURL(url)
  return audio
}

function buildWav(pcmBytes, sampleRate, channels, bitDepth) {
  const byteRate = (sampleRate * channels * bitDepth) / 8
  const blockAlign = (channels * bitDepth) / 8
  const dataLen = pcmBytes.length
  const buffer = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buffer)

  const write = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  write(0, 'RIFF')
  view.setUint32(4, 36 + dataLen, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)          // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  write(36, 'data')
  view.setUint32(40, dataLen, true)
  new Uint8Array(buffer).set(pcmBytes, 44)

  return buffer
}
