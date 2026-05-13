const MODEL = 'gemini-2.0-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SYSTEM_PROMPT = `당신은 차량용 AI 어시스턴트입니다. 운전자와 탑승객을 돕는 역할을 합니다.
- 답변은 2~3문장으로 간결하게 해주세요.
- 친근하고 자연스러운 한국어를 사용하세요.
- 네비게이션, 음악, 전화, 날씨, 일정 등 차량 관련 요청에 적극적으로 응답하세요.
- 운전 중 안전을 항상 최우선으로 고려하세요.`

// Key rotation — cycles to next key on quota error (429)
const KEYS = (import.meta.env.VITE_GEMINI_API_KEYS ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

let currentKeyIdx = 0

function nextKey() {
  const key = KEYS[currentKeyIdx]
  currentKeyIdx = (currentKeyIdx + 1) % KEYS.length
  return key
}

async function callOnce(text, apiKey) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['TEXT'],
      },
    }),
  })

  if (res.status === 429) {
    const err = new Error('quota')
    err.status = 429
    throw err
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Gemini ${res.status}: ${body.error?.message ?? 'unknown'}`)
  }

  return res.json()
}

/**
 * Sends text to Gemini with automatic key rotation on quota errors.
 * Returns the AI response string.
 */
export async function getGeminiResponse(text) {
  if (KEYS.length === 0) throw new Error('VITE_GEMINI_API_KEYS is not set')

  let lastErr
  for (let i = 0; i < KEYS.length; i++) {
    const key = nextKey()
    try {
      const data = await callOnce(text, key)
      const parts = data.candidates?.[0]?.content?.parts ?? []
      return parts.find((p) => p.text)?.text ?? ''
    } catch (err) {
      lastErr = err
      if (err.status === 429) {
        console.warn(`Gemini key ${i + 1} quota exceeded, rotating…`)
        continue
      }
      throw err
    }
  }
  throw lastErr
}
