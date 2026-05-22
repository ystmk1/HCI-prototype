import { fetchApprovedExamples } from './promptExamples'
import { getPrompt, getScenarioContext, PROMPT_KEYS } from './promptConfig'

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Build a few-shot block from operator-curated examples (Supabase).
function buildFewShotBlock(examples) {
  if (!examples?.length) return ''
  const body = examples
    .map(
      (e, i) =>
        `예시 ${i + 1})\n[사용자] ${e.user_input}\n[이상적 답변] ${e.ideal_response}`
    )
    .join('\n\n')
  return `\n\n[참고 예시 — 아래 답변들의 톤·길이·표현 방식을 최대한 따르세요]\n${body}`
}

// Fixed tag-logic the app parses (OPTIONS / SELECTED_OPTION). Kept in code —
// not operator-editable — because the response parser depends on these exact
// tags; a typo here would silently break the detour UI.
const OPTIONS_LOGIC = `
[선택지 제공 및 사용자 의도 파악 로직]
1. 탑승자가 "어떻게 할 거야?", "우회해", "언제 가?" 등 상황 타개책을 묻거나 불만을 표출하면, "다른 경로로 우회할까요?" 라는 질문과 함께 선택지를 제공하세요.
이때, 답변 맨 마지막 줄에 반드시 "[OPTIONS:우회하기|기존 경로 유지]" 태그를 덧붙이세요.
2. 만약 선택지가 제공된 상태에서, 탑승자가 음성이나 타이핑으로 "우회해줘", "우회", "우회하기", "돌아가자" 등 우회를 긍정하는 변용 발언을 하면, 이를 우회로 수락한 것으로 파악하고 "우회 경로로 안내하겠습니다"라고 답변하세요. 이 때 답변 맨 마지막 줄에 반드시 "[SELECTED_OPTION:우회하기]" 태그를 덧붙이세요.
3. 반대로 "기존 경로 유지", "기존대로", "그대로 가자", "유지해" 등 기존 경로를 유지하겠다는 발언을 하면, "기존 경로를 유지합니다"라고 답변하고, 맨 마지막 줄에 반드시 "[SELECTED_OPTION:기존 경로 유지]" 태그를 덧붙이세요.`

const SCENARIO_CARD_DIRECTIVE = `\n\n[시스템 제어 명령]\n이번 답변의 맨 마지막에는 화면에 UI 카드를 띄우기 위해 반드시 "[SHOW_ROUNDABOUT_CARD]" 라는 텍스트를 정확히 포함해야 합니다.`

// App control via intent (not keyword matching): the model decides when the
// user wants to open/close a screen app and emits a structured tag the app
// parses. Kept in code — the parser depends on these exact tags.
const APP_CONTROL_LOGIC = `

[앱 제어]
탑승자가 화면의 앱을 열거나 켜달라고 하면(예: "네비 켜줘", "지도 보여줘", "음악 틀어줘", "전화 앱 열어", "일정 확인해줘"), 짧게 확인하는 답변과 함께 응답 맨 마지막 줄에 정확히 한 개의 태그를 덧붙이세요: [OPEN_APP:<앱ID>]
사용 가능한 앱ID (왼쪽 영문 ID만 출력): Navigation(내비게이션/지도/길안내), Phone(전화), Music(음악), Mail(메일), Calendar(일정/캘린더)
앱을 닫아달라고 하면(예: "닫아줘", "꺼줘", "화면 닫아") 응답 맨 마지막 줄에 [CLOSE_APP] 태그를 덧붙이세요.
앱 제어 요청이 아닐 때는 이 태그들을 절대 출력하지 마세요.
예: "내비게이션을 켤게요. [OPEN_APP:Navigation]"`

const SPEED_INSTRUCTIONS = `

[음성 속도 제어]
음성(TTS) 속도는 4단계입니다: slow(느림) · normal(기본) · fast(빠름) · very_fast(가장 빠름).
탑승자가 말·목소리 속도를 조절하려는 의도를 보이면, 발화 맥락과 아래 현재 레벨을 함께 고려해 의도에 가장 맞는 절대 레벨 하나를 골라 응답 맨 마지막 줄에 정확히 한 개의 태그로 덧붙이세요(예: [SPEED:fast]).
"빠르게/천천히" 같은 절대 표현이든 "더 빠르게/조금 느리게" 같은 상대 표현이든 자연스럽게 해석하세요(slow가 최저, very_fast가 최고). 본문은 짧게 확인만 하고, 속도 조절 의도가 없으면 SPEED 태그를 절대 출력하지 마세요.`

// 콤마 또는 줄바꿈 어느 방식으로 입력해도 파싱
const KEYS = (import.meta.env.VITE_GEMINI_API_KEYS ?? '')
  .split(/[\n,]/)
  .map((k) => k.trim())
  .filter(Boolean)

let currentKeyIdx = 0

async function callOnce(text, apiKey, customPrompt) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: customPrompt }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      // thinkingBudget: 0 disables 2.5-flash's pre-response reasoning — these
      // short conversational replies don't need it, and it's the biggest
      // latency win without changing the model or response quality.
      generationConfig: {
        responseModalities: ['TEXT'],
        thinkingConfig: { thinkingBudget: 0 },
      },
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

export async function getGeminiResponse(text, context = '', needsScenarioCard = false, currentSpeedLevel = 'normal', scenarioId = null) {
  if (KEYS.length === 0) {
    throw new Error('API 키가 설정되지 않았습니다 (VITE_GEMINI_API_KEYS)')
  }

  // Resolve operator-editable prompts (Supabase override → hardcoded default).
  // Scenario context override falls back to the caller-supplied `context`.
  const scenarioContext = await getScenarioContext(scenarioId, context)

  let finalPrompt
  if (scenarioContext) {
    const wrapper = await getPrompt(PROMPT_KEYS.CONTEXT_WRAPPER)
    finalPrompt = `${wrapper}

[현재 주행 상황 및 시스템 행동 지침]
${scenarioContext}
${OPTIONS_LOGIC}`

    if (needsScenarioCard) {
      finalPrompt += SCENARIO_CARD_DIRECTIVE
    }
  } else {
    finalPrompt = await getPrompt(PROMPT_KEYS.SYSTEM_BASE)
  }

  finalPrompt += APP_CONTROL_LOGIC
  finalPrompt += SPEED_INSTRUCTIONS + `\n현재 음성 속도 레벨: ${currentSpeedLevel}`

  // Dynamic few-shot: inject operator-curated examples for this scenario (no-op
  // when Supabase isn't configured or there are no approved examples yet).
  if (scenarioId) {
    try {
      const examples = await fetchApprovedExamples(scenarioId)
      finalPrompt += buildFewShotBlock(examples)
    } catch (e) {
      console.warn('[gemini] few-shot fetch skipped:', e?.message ?? e)
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
