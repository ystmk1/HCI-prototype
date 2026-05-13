const MODEL = 'gemini-2.0-flash-lite'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SYSTEM_PROMPT = `당신은 차량 내비게이션에 탑재된 AI 어시스턴트입니다.
- 사용자가 말한 내용을 반복하지 말고 바로 본론만 답하세요.
- 한 두 문장으로 최대한 짧게 답하세요.
- 밝고 친절한 말투를 사용하세요.
- 운전 중 상황임을 항상 고려하고 안전을 최우선으로 하세요.`

// 콤마 또는 줄바꿈 어느 방식으로 입력해도 파싱
const KEYS = (import.meta.env.VITE_GEMINI_API_KEYS ?? '')
  .split(/[\n,]/)
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

  if (res.status === 429 || res.status === 503) {
    const err = new Error(res.status === 503 ? '503' : '429')
    err.status = res.status
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

  let lastStatus = null
  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[currentKeyIdx]
    currentKeyIdx = (currentKeyIdx + 1) % KEYS.length
    try {
      return await callOnce(text, key)
    } catch (err) {
      lastStatus = err.status
      if (err.status === 429 || err.status === 503) {
        console.warn(`Gemini key ${i + 1}/${KEYS.length} 응답 실패 (${err.status}), 다음 키 시도…`)
        continue
      }
      throw err
    }
  }
  if (lastStatus === 429) throw new Error('모든 키의 쿼터가 초과됐습니다. 잠시 후 다시 시도해주세요.')
  if (lastStatus === 503) throw new Error('API 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.')
  throw new Error('응답에 실패했습니다.')
}
