// 시뮬레이터 시나리오의 페이즈 시퀀스. 원본: sequence.md (시퀀스별 AutopilotStatus
// + TTS 음성 발화). 화면에는 좌상단 AutopilotStatus 필만 보이고, 페이즈별 안내는
// **채팅이 아니라 TTS 음성으로만** 출력된다 (voice-only).
//
// 시나리오마다 페이즈 개수가 다름:
//   • frustration_roundabout_loop (C1, Alt+Q): 9 페이즈
//   • anxiety_hydroplaning        (C2, Alt+W): 13 페이즈
//
// 시뮬 진행에 맞춰 오퍼레이터가 HMI에서 Ctrl+← / Ctrl+→ 로 페이즈 이동.
// (또는 오퍼레이터 콘솔의 페이즈 패널에서 직접 클릭.) 페이즈가 바뀌면 해당 페이즈의
// `speech`가 TTS로 재생된다. `speech: null`(원본의 'ㅡ' 또는 '시나리오 시작')은
// 무음 페이즈 — 상태 필만 갱신하고 말하지 않는다.
//
// 각 페이즈:
//   • status — 좌상단 AutopilotStatus 필 { tone: 'normal'|'warning', text }
//   • speech — 페이즈 진입 시 TTS로 읽을 음성 발화 (없으면 null)

// sequence.md 명시 — 4가지 AutopilotStatus 문구. 정상은 normal 톤, 나머지 3개는 warning.
const STATUS_OK      = { tone: 'normal',  text: '정상 주행 중입니다' }
const STATUS_DETECT  = { tone: 'warning', text: '오류가 감지되었습니다' }
const STATUS_CAUSE   = { tone: 'warning', text: '오류 원인을 파악 중입니다' }
const STATUS_RESOLVE = { tone: 'warning', text: '오류를 해결 중입니다' }

// C1 ─ 회전교차로 밀집교통 (답답함). 9 페이즈.
const C1_PHASES = [
  { status: STATUS_OK,      speech: null }, // C1-1 시나리오 시작
  { status: STATUS_DETECT,  speech: '회전교차로 진입 간격 확보에 어려움을 겪고 있습니다. 안전 간격을 만들면 진입하겠습니다.' },
  { status: STATUS_OK,      speech: null }, // C1-3
  { status: STATUS_DETECT,  speech: '비정상적인 반복 회전이 감지되었습니다. 2차로 진출에 실패해 같은 구간을 다시 주행합니다.' },
  { status: STATUS_CAUSE,   speech: '차선 변경에 필요한 간격 기준이 너무 보수적입니다. 간격이 확보되면 차선 변경을 시도합니다.' },
  { status: STATUS_RESOLVE, speech: '2차로 차선 변경을 시도합니다. 잠시 정차 후 진입하겠습니다.' },
  { status: STATUS_OK,      speech: null }, // C1-7
  { status: STATUS_DETECT,  speech: '진출 지점을 바로 빠져나가지 못해 한 바퀴 더 회전합니다. 다음 바퀴에 진출합니다.' },
  { status: STATUS_OK,      speech: null }, // C1-9
]

// C2 ─ 수막현상 (불안) · 3-이벤트 (평지 → 오르막 → 내리막). 13 페이즈.
const C2_PHASES = [
  { status: STATUS_OK,      speech: null }, // C2-1
  { status: STATUS_DETECT,  speech: '차량이 순간적으로 크게 요동쳤습니다. 타이어 접지력이 급격히 떨어져 미끄럼이 발생했습니다.' },
  { status: STATUS_CAUSE,   speech: '노면의 물웅덩이를 미리 감지하지 못했습니다. 이로 인해 수막현상이 발생했습니다.' },
  { status: STATUS_RESOLVE, speech: '재발 방지를 위해 속도를 낮춰 서행합니다. 약 N초 후 정상 마찰 상태로 복귀할 예정입니다.' },
  { status: STATUS_OK,      speech: null }, // C2-5
  { status: STATUS_DETECT,  speech: '다시 차량이 요동쳤습니다. 노면 접지력 저하가 원인입니다.' },
  { status: STATUS_CAUSE,   speech: '오르막 종단 물웅덩이를 파악하지 못했습니다. 수막현상 방지를 위해 보수적으로 주행합니다.' },
  { status: STATUS_RESOLVE, speech: '지형 경사까지 고려해 더 일찍 감속합니다. 도착 예정 시간에는 큰 차이가 없습니다.' },
  { status: STATUS_OK,      speech: null }, // C2-9
  { status: STATUS_DETECT,  speech: '내리막 구간에서 차량이 크게 흔들렸습니다. 노면 접지력을 잃었습니다.' },
  { status: STATUS_CAUSE,   speech: '센서 시야에 물웅덩이가 파악되지 않았습니다. 내리막 가속이 더해져 요동이 커졌습니다.' },
  { status: STATUS_RESOLVE, speech: '더이상 수막현상이 발생하지 않도록 주행 속도를 낮춥니다. 규정속도의 40%인 25km/h로 속도를 유지합니다.' },
  { status: STATUS_OK,      speech: null }, // C2-13
]

// Attach the `phase` index for UI labels (1-based) so callers don't need to
// derive it from array position.
function withIndex(arr) {
  return arr.map((p, i) => ({ phase: i + 1, ...p }))
}

export const DRIVE_PHASES_BY_SCENARIO = {
  frustration_roundabout_loop: withIndex(C1_PHASES),
  anxiety_hydroplaning:       withIndex(C2_PHASES),
}

export const PHASE_NONE = 0

// Default pill state when no phase is active (idle / pre-drive).
export const DEFAULT_STATUS = { tone: 'normal', text: '정상 주행 중입니다' }

export function getPhases(scenarioId) {
  return DRIVE_PHASES_BY_SCENARIO[scenarioId] ?? []
}

export function getPhaseCount(scenarioId) {
  return getPhases(scenarioId).length
}

export function getPhase(scenarioId, n) {
  const phases = getPhases(scenarioId)
  if (!Number.isInteger(n) || n < 1 || n > phases.length) return null
  return phases[n - 1]
}

// The TTS utterance for a phase (null for silent 'ㅡ' phases). Used by the HMI
// to speak the scripted SA line when the operator advances the sequence.
export function getPhaseSpeech(scenarioId, n) {
  return getPhase(scenarioId, n)?.speech ?? null
}

// One-line phase context appended to Gemini's systemInstruction so the model's
// understanding matches the current AutopilotStatus + spoken line.
export function getPhasePrompt(scenarioId, n) {
  const p = getPhase(scenarioId, n)
  if (!p) return ''
  const total = getPhaseCount(scenarioId)
  const said = p.speech ? `직전 음성 안내: "${p.speech}"` : '이 단계에서는 음성 안내 없음'
  return `[현재 주행 단계 ${p.phase}/${total} — 오토파일럿 상태: "${p.status.text}". ${said}. 모든 발화는 이 시점 맥락에서 해석.]`
}

// Strip the `**bold**` markers — kept for callers that still expect a
// plain-text helper. Phase speech carries no markers, so this is a no-op there.
export function stripMarkers(text) {
  return (text ?? '').replace(/\*\*/g, '')
}

// Parse `**bold**` segments out of a single line. Returns an array of
// { text, bold } chunks. Retained for the typewriter renderer used elsewhere
// (greeting hero); phase speech has no bold spans.
export function parseBoldSegments(line) {
  const out = []
  const re = /\*\*([^*]+)\*\*/g
  let i = 0
  let m
  while ((m = re.exec(line)) !== null) {
    if (m.index > i) out.push({ text: line.slice(i, m.index), bold: false })
    out.push({ text: m[1], bold: true })
    i = m.index + m[0].length
  }
  if (i < line.length) out.push({ text: line.slice(i), bold: false })
  return out.length ? out : [{ text: '', bold: false }]
}
