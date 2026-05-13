const MODEL = 'gemini-2.0-flash-lite'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SYSTEM_PROMPT = `당신은 차량 내비게이션에 탑재된 AI 어시스턴트입니다.
- 사용자가 말한 내용을 반복하지 말고 바로 본론만 답하세요.
- 한 두 문장으로 최대한 짧게 답하세요.
- 밝고 친절한 말투를 사용하세요.
- 운전 중 상황임을 항상 고려하고 안전을 최우선으로 하세요.`

const KEYS = (import.meta.env.VITE_GEMINI_API_KEYS ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

let currentKeyIdx = 0

async function callOnce(text, apiKey) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { responseModalities: ['TEXT'] },
    }),
  })

  const body = await res.json()

  if (res.status === 429) {
    const err = new Error('quota')
    err.status = 429
    throw err
  }
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${body.error?.message ?? 'unknown error'}`)
  }

  const parts = body.candidates?.[0]?.content?.parts ?? []
  return parts.find((p) => p.text)?.text ?? ''
}

export async function getGeminiResponse(text) {
  if (KEYS.length === 0) {
    throw new Error('API 키가 설정되지 않았습니다 (VITE_GEMINI_API_KEYS)')
  }

  let lastErr
  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[currentKeyIdx]
    currentKeyIdx = (currentKeyIdx + 1) % KEYS.length
    try {
      return await callOnce(text, key)
    } catch (err) {
      lastErr = err
      if (err.status === 429) {
        console.warn(`Gemini key ${i + 1}/${KEYS.length} quota exceeded, trying next…`)
        continue
      }
      throw err
    }
  }
  throw lastErr
}
