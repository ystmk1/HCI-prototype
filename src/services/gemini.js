const MODEL = 'gemini-2.5-flash'
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

async function callOnce(text, apiKey, customPrompt = SYSTEM_PROMPT) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: customPrompt }] },
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

export async function getGeminiResponse(text, context = '', needsScenarioCard = false) {
  if (KEYS.length === 0) {
    throw new Error('API 키가 설정되지 않았습니다 (VITE_GEMINI_API_KEYS)')
  }

  let finalPrompt = SYSTEM_PROMPT
  if (context) {
    finalPrompt = `당신은 탑승자를 태우고 운행 중인 완전자율주행(Lv5) 차량의 인공지능 시스템 자체입니다.
탑승자에게 사람처럼 공감하거나 위로하는 말("답답하시죠?", "불편하셨죠?", "어이쿠" 등)을 절대 사용하지 마세요.
오직 차량의 현재 주행 상태와 판단 이유만을 차분하고 명확하게, 시스템이 보고하듯 정중하게 대답해야 합니다.

[현재 주행 상황 및 시스템 행동 지침]
${context}

[선택지 제공 및 사용자 의도 파악 로직]
1. 탑승자가 "어떻게 할 거야?", "우회해", "언제 가?" 등 상황 타개책을 묻거나 불만을 표출하면, "다른 경로로 우회할까요?" 라는 질문과 함께 선택지를 제공하세요.
이때, 답변 맨 마지막 줄에 반드시 "[OPTIONS:우회하기|기존 경로 유지]" 태그를 덧붙이세요.
2. 만약 선택지가 제공된 상태에서, 탑승자가 음성이나 타이핑으로 "우회해줘", "우회", "우회하기", "돌아가자" 등 우회를 긍정하는 변용 발언을 하면, 이를 우회로 수락한 것으로 파악하고 "우회 경로로 안내하겠습니다"라고 답변하세요. 이 때 답변 맨 마지막 줄에 반드시 "[SELECTED_OPTION:우회하기]" 태그를 덧붙이세요.
3. 반대로 "기존 경로 유지", "기존대로", "그대로 가자", "유지해" 등 기존 경로를 유지하겠다는 발언을 하면, "기존 경로를 유지합니다"라고 답변하고, 맨 마지막 줄에 반드시 "[SELECTED_OPTION:기존 경로 유지]" 태그를 덧붙이세요.`

    if (needsScenarioCard) {
      finalPrompt += `\n\n[시스템 제어 명령]\n이번 답변의 맨 마지막에는 화면에 UI 카드를 띄우기 위해 반드시 "[SHOW_ROUNDABOUT_CARD]" 라는 텍스트를 정확히 포함해야 합니다.`
    }
  }

  let lastStatus = null
  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[currentKeyIdx]
    currentKeyIdx = (currentKeyIdx + 1) % KEYS.length
    try {
      return await callOnce(text, key, finalPrompt)
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
